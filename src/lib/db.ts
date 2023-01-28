import Airtable, { FieldSet, Table as AirtableTable, Record as AirtableRecord } from "airtable";
import axios from "axios";
import env from "./env";
import { BaseTypeStrings, FromString, Item, Table, parseType, TypeDef } from "./tables";

const airtable = new Airtable({
  apiKey: env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
})

const airtableFieldTypeToJSType: Record<string, string> = {
  "singleLineText": "string",
  "email": "string",
  "url": "string",
  "multilineText": "string",
  "number": "number",
  "percent": "number",
  "currency": "number",
  // "date": "Date",
  // "dateTime": "Date",
  "phoneNumber": "string",
  "checkbox": "boolean",
  "count": "number",
  "autoNumber": "number",
  "rating": "number",
  "richText": "string",
  "duration": "number",
}

// NB: because we include mappings, we can't return a AirtableTable<FieldSet & T>
const getAirtableTable = async <T extends Item>(table: Table<T>): Promise<AirtableTable<FieldSet>> => {
  const airtableTable = airtable.base(table.baseId).table<FieldSet>(table.tableId)

  // Verify schema matches what we expect
  // We must do this here as otherwise if a column didn't exist at all,
  // we'd backfill it in mapRecordToItem, so assertMatchesSchema wouldn't catch it
  // https://airtable.com/developers/web/api/get-base-schema
  const meta = await axios<{
    tables: { id: string, fields: { name: string, type: string }[] }[]
  }>({
    url: `https://api.airtable.com/v0/meta/bases/${table.baseId}/tables`,
    headers: {
      'Authorization': 'Bearer ' + env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
    },
  })
  const fields = meta.data.tables.find(t => t.id === table.tableId)?.fields;
  if (!fields) {
    throw new Error(`Failed to find table ${table.tableId} in base ${table.baseId}`)
  }
  (Object.entries(table.schema) as ([keyof T & string, BaseTypeStrings])[]).forEach(([k, v]) => {
    const expectedType = parseType(v)
    const mappings: string | string[] | undefined = table.mappings?.[k]
    const mappingsIsArray = Array.isArray(mappings)

    const fieldNames = mappingsIsArray
      ? mappings
      : [mappings ?? k];

    fieldNames.forEach(fieldName => {
      const airtableType = fields.find(f => f.name === fieldName)?.type;
      if (!airtableType) {
        throw new Error(`Field '${fieldName}' (mapped to ${k}) not found in table ${table.tableId} in base ${table.baseId}`)
      }

      const actualType = airtableFieldTypeToJSType[airtableType];
      if (!typeMatches(actualType, expectedType, mappingsIsArray)) {
        throw new Error(`Field '${fieldName}' (mapped to ${k}) has wrong type (actual type ${actualType}, actual airtable type ${airtableType}, but expected ${v}) in table ${table.tableId} in base ${table.baseId}`)
      }
    })
  });

  return airtableTable;
}

const typeMatches = (actualType: string, expectedType: TypeDef, isArray: boolean) => {
  if (isArray !== expectedType.array) return false;
  if (expectedType.nullable && actualType === "null") return true;
  if (expectedType.single === actualType) return true;
}

// In theory, this should never catch stuff because getAirtableTable should
// verify our schema and our backfilling function should be always correct
// "In theory there is no difference between theory and practice - in practice there is"
export function assertMatchesSchema<T extends Item>(
  table: Table<T>,
  data: unknown,
  direction = "in"
): asserts data is T {
  if (typeof data !== "object" || data === null) {
    throw new Error(`Item ${direction} ${table.name} is not an object`);
  }

  (Object.entries(table.schema) as ([keyof T & string, BaseTypeStrings])[]).forEach(([fieldName, type]) => {
    const value = data[fieldName as keyof typeof data]

    const expectedType = parseType(type)

    const isCorrectType =
      (expectedType.nullable && value === null)
      || (!expectedType.array && typeof value === expectedType.single)
      || (
        expectedType.array
        && Array.isArray(value)
        && (value as unknown[]).every(entry => typeof entry === expectedType.single))

    if (!isCorrectType) {
      throw new Error(`Item ${direction} ${table.name} item has invalid value for field '${fieldName}' (actual type ${typeof value}, but expected ${type})`)
    }
  });
}

const backfillFor = (type: BaseTypeStrings): FromString<any> => {
  if (type === "number") {
    throw new Error(`Empty value for field type ${type}, unsure how to backfill.`)
  }

  return {
    "string": "",
    "boolean": false,
    "string[]": [],
    "number[]": [],
    "boolean[]": [],
    "string | null": null,
    "number | null": null,
    "boolean | null": null,
    "string[] | null": null,
    "number[] | null": null,
    "boolean[] | null": null,
  }[type];
}

const mapRecordToItem = <T extends Item>(table: Table<T>, record: AirtableRecord<FieldSet>): T => {
  const item = {} as T;

  (Object.entries(table.schema) as ([keyof Omit<T, "id"> & string, BaseTypeStrings])[]).forEach(([k, v]) => {
    let value: FieldSet[string] | FieldSet[string][] | undefined = undefined;
    const mappings: string | string[] | undefined = table.mappings?.[k]

    if (Array.isArray(mappings)) {
      value = mappings.map(fieldName => record.get(fieldName));
    } else if (mappings) {
      value = record.get(mappings)
    } else {
      value = record.get(k)
    }

    item[k as keyof T] = (value ?? backfillFor(v)) as T[keyof T];
  });

  item['id'] = record.id;

  assertMatchesSchema(table, item);

  return item;
}

export const get = async <T extends Item>(table: Table<T>, id: string): Promise<T> => {
  const record = await getAirtableTable(table).then(t => t.find(id));
  if (!record) {
    throw new Error(`Failed to find record in ${table.name} with key ${id}`)
  }
  return mapRecordToItem(table, record)
}

export const scan = async <T extends Item>(table: Table<T>, filterByFormula?: string): Promise<T[]> => {
  const records = await getAirtableTable(table).then(t =>
    t.select(filterByFormula ? { filterByFormula } : {}).all()
  );
  return records.map(record => mapRecordToItem(table, record));
}

export const insert = async <T extends Item>(table: Table<T>, data: Omit<T, 'id'>): Promise<T> => {
  assertMatchesSchema(table, { ...data, id: 'placeholder' }, 'for')
  const record = await getAirtableTable(table).then(t => t.create(data as T & FieldSet))
  return mapRecordToItem(table, record)
}

export const update = async <T extends Item>(table: Table<T>, data: Partial<T> & { id: T["id"] }): Promise<T> => {
  throw new Error('Not implemented')
}
