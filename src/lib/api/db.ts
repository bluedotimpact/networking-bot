import Airtable, { FieldSet, Table as AirtableTable, Record as AirtableRecord } from 'airtable';
import { QueryParams } from 'airtable/lib/query_params';
import axios from 'axios';
import env from './env';
import {
  BaseTypeStrings, FromString, Item, Table, parseType, TypeDef,
} from './tables';

const airtable = new Airtable({
  apiKey: env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
});

const airtableFieldTypeToJSType: Record<string, string> = {
  singleLineText: 'string',
  email: 'string',
  url: 'string',
  multilineText: 'string',
  number: 'number',
  percent: 'number',
  currency: 'number',
  // "date": "Date",
  // "dateTime": "Date",
  phoneNumber: 'string',
  checkbox: 'boolean',
  count: 'number',
  autoNumber: 'number',
  rating: 'number',
  richText: 'string',
  duration: 'number',
  multipleRecordLinks: 'string',
};

// TODO: type checking
const airtableFieldTypeToJSMapper: Record<string, (value: any, tsType: BaseTypeStrings) => any> = {
  multipleRecordLinks: (value, tsType) => {
    if (tsType.startsWith('string[]')) {
      return value;
    }
    if (tsType.startsWith('string')) {
      if (value.length === 1) {
        return value[0];
      }
      throw new Error(`Tried coercing multipleRecordLinks to a string, but there were ${value.length} entries`);
    }
    throw new Error(`Cannot coerce multipleRecordLinks to ${tsType}`);
  },
};

// TODO: type checking
const jsToAirtableFieldTypeMapper: Record<string, (value: any) => any> = {
  multipleRecordLinks: (value) => {
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value;
    }
    if (typeof value === 'string') {
      return [value];
    }
    throw new Error(`Cannot coerce ${typeof value} to multipleRecordLinks`);
  },
};

// NB: because we include mappings, we can't return a AirtableTable<FieldSet & T>
const getAirtableTable = async <T extends Item>(table: Table<T>): Promise<AirtableTable<FieldSet> & { fields: { name: string, type: string }[] }> => {
  const airtableTable = airtable.base(table.baseId).table<FieldSet>(table.tableId);

  // Verify schema matches what we expect
  // We must do this here as otherwise if a column didn't exist at all,
  // we'd backfill it in mapRecordToItem, so assertMatchesSchema wouldn't catch it
  // https://airtable.com/developers/web/api/get-base-schema
  const meta = await axios<{
    tables: { id: string, fields: { name: string, type: string }[] }[]
  }>({
    url: `https://api.airtable.com/v0/meta/bases/${table.baseId}/tables`,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    },
  });
  const fields = meta.data.tables.find((t) => t.id === table.tableId)?.fields;
  if (!fields) {
    throw new Error(`Failed to find table ${table.tableId} in base ${table.baseId}`);
  }
  (Object.entries(table.schema) as ([keyof T & string, BaseTypeStrings])[]).forEach(([k, v]) => {
    const expectedType = parseType(v);
    const mappings: string | string[] | undefined = table.mappings?.[k];
    const mappingsIsArray = Array.isArray(mappings);

    const fieldNames = mappingsIsArray
      ? mappings
      : [mappings ?? k];

    fieldNames.forEach((fieldName) => {
      const airtableType = fields.find((f) => f.name === fieldName)?.type;
      if (!airtableType) {
        throw new Error(`Field '${fieldName}' (mapped to ${k}) not found in table ${table.tableId} in base ${table.baseId}`);
      }

      const actualType = airtableFieldTypeToJSType[airtableType];
      if (!typeMatches(actualType, expectedType, mappingsIsArray)) {
        throw new Error(`Field '${fieldName}' (mapped to ${k}) has wrong type (actual type ${actualType}, actual airtable type ${airtableType}, but expected ${v}) in table ${table.tableId} in base ${table.baseId}`);
      }
    });
  });

  return Object.assign(airtableTable, { fields });
};

const typeMatches = (actualType: string, expectedType: TypeDef, isArray: boolean): boolean => {
  if (isArray !== expectedType.array) return false;
  if (expectedType.nullable && actualType === 'null') return true;
  if (expectedType.single === actualType) return true;
  return false;
};

// In theory, this should never catch stuff because getAirtableTable should
// verify our schema and our backfilling function should be always correct
// "In theory there is no difference between theory and practice - in practice there is"
export function assertMatchesSchema<T extends Item>(
  table: Table<T>,
  data: unknown,
  { direction = 'in', partial = false } = {},
): asserts data is T {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`Item ${direction} ${table.name} is not an object`);
  }

  (Object.entries(table.schema) as ([keyof T & string, BaseTypeStrings])[]).forEach(([fieldName, type]) => {
    const value = data[fieldName as keyof typeof data];

    const expectedType = parseType(type);

    const isCorrectType = (expectedType.nullable && value === null)
      || (partial && value === undefined)
      || (!expectedType.array && typeof value === expectedType.single)
      || (
        expectedType.array
        && Array.isArray(value)
        && (value as unknown[]).every((entry) => typeof entry === expectedType.single));

    if (!isCorrectType) {
      throw new Error(`Item ${direction} ${table.name} table has invalid value for field '${fieldName}' (actual type ${typeof value}, but expected ${type})`);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const backfillFor = (tsType: BaseTypeStrings): FromString<any> => {
  if (tsType === 'number') {
    throw new Error(`Empty value for field type ${tsType}, unsure how to backfill.`);
  }

  return {
    string: '',
    boolean: false,
    'string[]': [],
    'number[]': [],
    'boolean[]': [],
    'string | null': null,
    'number | null': null,
    'boolean | null': null,
    'string[] | null': null,
    'number[] | null': null,
    'boolean[] | null': null,
  }[tsType];
};

const mapRecordToItem = <T extends Item>(table: Table<T>, record: AirtableRecord<FieldSet>): T => {
  const item = {} as T;

  (Object.entries(table.schema) as ([keyof Omit<T, 'id'> & string, BaseTypeStrings])[]).forEach(([fieldName, tsType]) => {
    let value: FieldSet[string] | FieldSet[string][] | undefined;
    const mappings: string | string[] | undefined = table.mappings?.[fieldName];

    if (Array.isArray(mappings)) {
      value = mappings.map((arrFieldName) => record.get(arrFieldName));
    } else if (mappings) {
      value = record.get(mappings);
    } else {
      value = record.get(fieldName);
    }

    // @ts-expect-error: added in getAirtableTable
    // eslint-disable-next-line no-underscore-dangle
    const airtableType = record._table.fields.find((f) => f.name === fieldName)?.type;

    if (value && airtableFieldTypeToJSMapper[airtableType]) {
      value = airtableFieldTypeToJSMapper[airtableType](value, tsType);
    }

    item[fieldName as keyof T] = (value ?? backfillFor(tsType)) as T[keyof T];
  });

  item.id = record.id;

  assertMatchesSchema(table, item);

  return item;
};

const mapItemToRecord = async <T extends Item>(table: Table<T>, item: Omit<T, 'id'> | Partial<T>): Promise<FieldSet> => {
  const record = {} as FieldSet;

  (Object.entries(table.schema) as ([keyof Omit<T, 'id'> & string, BaseTypeStrings])[]).forEach(([fieldName]) => {
    const mappings: string | string[] | undefined = table.mappings?.[fieldName];

    // TODO: handle array mappings
    if (Array.isArray(mappings)) {
      // throw new Error('Not implemented')
      mappings.forEach((arrFieldName, index) => {
        const itemValues = item[fieldName];
        if (!Array.isArray(itemValues)) {
          throw new Error(`Expected field ${fieldName} to be an array`);
        }
        if (itemValues.length !== mappings.length) {
          throw new Error(`Field ${fieldName} has length ${itemValues.length}, different to mappings of length ${mappings.length}`);
        }
        record[arrFieldName] = itemValues[index];
      });
    } else if (mappings) {
      record[mappings] = item[fieldName] as any;
    } else {
      record[fieldName] = item[fieldName] as any;
    }
  });

  const meta = await axios<{
    tables: { id: string, fields: { name: string, type: string }[] }[]
  }>({
    url: `https://api.airtable.com/v0/meta/bases/${table.baseId}/tables`,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    },
  });
  const fields = meta.data.tables.find((t) => t.id === table.tableId)?.fields;
  if (!fields) {
    throw new Error(`Failed to find table ${table.tableId} in base ${table.baseId}`);
  }

  Object.entries(record).forEach(([fieldName, value]) => {
    const airtableType = fields.find((f) => f.name === fieldName)?.type;
    if (!airtableType) {
      throw new Error(`Failed to map field to AirTable record, as not in schema: ${fieldName}`);
    }

    if (jsToAirtableFieldTypeMapper[airtableType]) {
      record[fieldName] = jsToAirtableFieldTypeMapper[airtableType](value);
    }
  });

  return record;
};

export const get = async <T extends Item>(table: Table<T>, id: string): Promise<T> => {
  const record = await getAirtableTable(table).then((t) => t.find(id));
  if (!record) {
    throw new Error(`Failed to find record in ${table.name} with key ${id}`);
  }
  return mapRecordToItem(table, record);
};

export type ScanParams = Omit<QueryParams<unknown>, 'fields' | 'cellFormat' | 'method' | 'returnFieldsByFieldId' | 'pageSize' | 'offset'>;

export const scan = async <T extends Item>(table: Table<T>, params?: ScanParams): Promise<T[]> => {
  const records = await getAirtableTable(table).then((t) => t.select(params).all());
  return records.map((record) => mapRecordToItem(table, record));
};

export const insert = async <T extends Item>(table: Table<T>, data: Omit<T, 'id'>): Promise<T> => {
  assertMatchesSchema(table, { ...data, id: 'placeholder' }, { direction: 'for' });
  const record = await getAirtableTable(table).then(async (t) => t.create(await mapItemToRecord(table, data)));
  return mapRecordToItem(table, record);
};

export const update = async <T extends Item>(table: Table<T>, data: Partial<T> & { id: T['id'] }): Promise<T> => {
  assertMatchesSchema(table, { ...data }, { direction: 'for', partial: true });
  const { id, ...withoutId } = data;
  const record = await getAirtableTable(table).then(async (t) => t.update(data.id, await mapItemToRecord(table, withoutId as Partial<T>)));
  return mapRecordToItem(table, record);
};

export const remove = async <T extends Item>(table: Table<T>, id: string): Promise<T> => {
  const record = await getAirtableTable(table).then((t) => t.destroy(id));
  return mapRecordToItem(table, record);
};
