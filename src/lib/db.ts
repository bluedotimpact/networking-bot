import Airtable, { FieldSet, Table as AirtableTable, Record as AirtableRecord } from "airtable";
import axios from "axios";
import env from "./env";
import { BaseTypeStrings, FromString, Item, Table } from "./tables";

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
  // "date": "string",
  // "dateTime": "string",
  "phoneNumber": "string",
  "checkbox": "boolean",
  "count": "number",
  "autoNumber": "number",
  "rating": "number",
  "richText": "string",
  "duration": "number",
}

const getAirtableTable = async <T extends Item>(table: Table<T>): Promise<AirtableTable<T & FieldSet>> => {
  const airtableTable = airtable.base(table.baseId).table<T & FieldSet>(table.tableId)

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
  Object.entries(table.schema).forEach(([k, v]) => {
    const airtableType = fields.find(f => f.name === k)?.type;
    if (!airtableType) {
      throw new Error(`Failed to find field '${k}' in table ${table.tableId} in base ${table.baseId}`)
    }

    const value = airtableFieldTypeToJSType[airtableType];
    if (value !== v) {
      throw new Error(`Field '${k}' has invalid schema (type ${value}, airtable type ${airtableTable}, but expected ${v}) in table ${table.tableId} in base ${table.baseId}`)
    }
  })

  return airtableTable;
}

// In theory, this should never catch stuff because getAirtableTable should
// verify our schema and our backfilling function should be always correct
// "In theory there is no difference between theory and practice - in practice there is"
export function assertMatchesSchema<T extends Item>(table: Table<T>, data: unknown, direction = "in"): asserts data is T {
  if (typeof data !== "object" || data === null) {
    throw new Error(`Item ${direction} ${table.name} is not an object`);
  }

  Object.entries(table.schema).forEach(([k, v]) => {
    const value = data[k as keyof typeof data]
    if (typeof value !== v) {
      throw new Error(`Item ${direction} ${table.name} item has invalid value for field '${k}', type ${typeof value}, but expected ${v}`)
    }
  })
}

const backfillFor: { [K in BaseTypeStrings]: FromString<K> } = {
  "boolean": false,
  "string": "",
  "number": 0,
  "string[]": [],
  "number[]": [],
}

const mapRecordToItem = <T extends Item>(table: Table<T>, record: AirtableRecord<T & FieldSet>): T => {
  const item = {} as T;

  (Object.entries(table.schema) as ([keyof T, BaseTypeStrings])[]).forEach(([k, v]) => {
    const value = record.get(k) ?? backfillFor[v] as T[keyof T]
    item[k] = value
  })
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

export const update = async <T extends Item>(table: Table<T>, data: Omit<T, 'id'>): Promise<T> => {
  throw new Error('Not implemented')
}
