import Airtable, { FieldSet } from 'airtable';
import { QueryParams } from 'airtable/lib/query_params';
import axios from 'axios';
import env from '../env';
import { mapRecordTypeAirtableToTs, mapRecordTypeTsToAirtable } from './mapping/recordMapper';
import { TsTypeString, FromTsTypeString } from './mapping/types';
import { Item, Table, parseType } from './tables';
import { AirtableRecord, AirtableTable } from './types';

const airtable = new Airtable({
  apiKey: env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
});

const getAirtableTable = async <T extends Item>(table: Table<T>): Promise<AirtableTable> => {
  const airtableTable = airtable.base(table.baseId).table(table.tableId);

  // TODO: Move this into a cache
  // Get the fields for the table. We need to do this so we know which type mapper
  // to use. Even if we were inferring a type mapper from the schema, we'd have to
  // do this as if a nullable column doesn't exist at all we'd fill it with nulls
  // rather than throwing an error.
  // https://airtable.com/developers/web/api/get-base-schema
  const meta = await axios<{
    tables: { id: string, fields: { name: string, type: string }[] }[]
  }>({
    url: `https://api.airtable.com/v0/meta/bases/${table.baseId}/tables`,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    },
  });
  const tableDefinition = meta.data.tables.find((t) => t.id === table.tableId);

  if (!tableDefinition) {
    throw new Error(`Failed to find table ${table.tableId} in base ${table.baseId}`);
  }

  return Object.assign(
    airtableTable,
    { fields: tableDefinition.fields },
  );
};

// In theory, this should never catch stuff because our type mapping logic should
// verify the types are compatible. However, "In theory there is no difference
// between theory and practice - in practice there is"
export function assertMatchesSchema<T extends Item>(
  table: Table<T>,
  data: unknown,
  { direction = 'in', partial = false } = {},
): asserts data is T {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`Item ${direction} ${table.name} is not an object`);
  }

  (Object.entries(table.schema) as ([keyof T & string, TsTypeString])[]).forEach(([fieldName, type]) => {
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

/**
 * Constructs a TypeScript object type definition given a table definition
 * 
 * @param table Table definition
 * @example { 
 *            schema: { someProp: "string", otherProps: "number[]", another: "boolean" },
 *            mappings: { someProp: "Some_Airtable_Field", otherProps: ["Field1", "Field2"] },
 *            ...
 *          }
 * 
 * @returns The TypeScript object type we expect the Airtable record to coerce to
 * @example {
 *            Some_Airtable_Field: "string",
 *            Field1: "number",
 *            Field2: "number",
 *            another: "boolean",
 *          }
 */
const airtableFieldNameTsTypes = <T extends Item>(table: Table<T>): Record<string, TsTypeString> => {
  const schemaEntries = Object.entries(table.schema) as [keyof Omit<T, 'id'>, TsTypeString][]

  return Object.fromEntries(
    schemaEntries.map(([outputFieldName, tsType]) => {
      const mappingToAirtable = table.mappings?.[outputFieldName];
      if (!mappingToAirtable) {
        return [[outputFieldName, tsType]];
      }

      if (Array.isArray(mappingToAirtable)) {
        return mappingToAirtable.map((airtableFieldName) => [airtableFieldName, arrayToSingleType(tsType)]);
      }

      return [[mappingToAirtable, tsType]];
    }).flat(1)
  );
};

const mapRecordFieldNamesAirtableToTs = <T extends Item>(table: Table<T>, tsRecord: Record<string, FromTsTypeString<TsTypeString>>): T => {
  const schemaEntries = Object.entries(table.schema) as [keyof Omit<T, 'id'> & string, TsTypeString][]

  const item = Object.fromEntries(
    schemaEntries.map(([outputFieldName]) => {
      const mappingToAirtable = table.mappings?.[outputFieldName];
      if (!mappingToAirtable) {
        return [outputFieldName, tsRecord[outputFieldName]];
      }

      if (Array.isArray(mappingToAirtable)) {
        return [outputFieldName, mappingToAirtable.map((airtableFieldName) => tsRecord[airtableFieldName])];
      }

      return [outputFieldName, tsRecord[mappingToAirtable as string]];
    })
  );

  return Object.assign(item, { id: tsRecord.id });
}

const mapRecordFromAirtable = <T extends Item>(table: Table<T>, record: AirtableRecord) => {
  const tsTypes = airtableFieldNameTsTypes(table);
  const tsRecord = mapRecordTypeAirtableToTs(tsTypes, record);
  const mappedRecord = mapRecordFieldNamesAirtableToTs(table, tsRecord)
  return mappedRecord;
};

/**
 * Maps a TS object (matching table.schema) to another TS object (matching table.mappings),
 * mapping columns based on the table definition.
 * 
 * @param table Table definition
 * @example { 
 *            schema: { someProp: "string", otherProps: "number[]", another: "boolean" },
 *            mappings: { someProp: "Some_Airtable_Field", otherProps: ["Field1", "Field2"] },
 *            ...
 *          }
 * 
 * @param item The TS object to map
 * @example {
 *            someProp: "abcd",
 *            otherProps: [314, 159],
 *            another: true
 *          }
 * 
 * @returns The TS object mapped via the table.mappings
 * @example {
 *            Some_Airtable_Field: "abcd",
 *            Field1: 314,
 *            Field2: 159,
 *            another: true,
 *          }
 */
const mapRecordFieldNamesTsToAirtable = <T extends Item>(table: Table<T>, item: Partial<T>): Record<string, FromTsTypeString<TsTypeString>> => {
  const schemaEntries = Object.entries(table.schema) as [keyof Omit<T, 'id'> & string, TsTypeString][]

  const tsRecord = Object.fromEntries(
    schemaEntries.map(([outputFieldName]) => {
      const mappingToAirtable = table.mappings?.[outputFieldName];
      const value = item[outputFieldName];

      if (!mappingToAirtable) {
        return [[outputFieldName, value]];
      }

      if (Array.isArray(mappingToAirtable)) {
        if (value === null) {
          // TODO: This should only happen if the type is nullable. We should double check the type safety enforces this.
          return mappingToAirtable.map((airtableFieldName) => [airtableFieldName, null]);
        }

        if (!Array.isArray(value)) {
          throw new Error(`Got non-array type ${typeof value} for ${table.name}.${outputFieldName}, but expected ${table.schema[outputFieldName]}.`)
        } 
        
        if (value.length !== mappingToAirtable.length) {
          throw new Error(`Got ${value.length} values for ${table.name}.${outputFieldName}, but ${mappingToAirtable.length} mappings. Expected these to be the same.`)
        }
        
        return mappingToAirtable.map((airtableFieldName, index) => [airtableFieldName, value[index]]);
      }

      return [[mappingToAirtable, value]];
    }).flat(1)
  );

  return Object.assign(item, { id: tsRecord.id });
}

const mapRecordToAirtable = <T extends Item>(table: Table<T>, item: Partial<T>, airtableTable: AirtableTable): FieldSet => {
  const mappedItem = mapRecordFieldNamesTsToAirtable(table, item)
  const tsTypes = airtableFieldNameTsTypes(table);
  const fieldSet = mapRecordTypeTsToAirtable(tsTypes, mappedItem, airtableTable);
  return fieldSet;


  // const record = {} as FieldSet;

  // (Object.entries(table.schema) as ([keyof Omit<T, 'id'> & string, TsTypeString])[]).forEach(([fieldName]) => {
  //   const mappings: string | string[] | undefined = table.mappings?.[fieldName];

  //   if (Array.isArray(mappings)) {
  //     mappings.forEach((arrFieldName, index) => {
  //       const itemValues = item[fieldName];
  //       if (!Array.isArray(itemValues)) {
  //         throw new Error(`Expected field ${fieldName} to be an array`);
  //       }
  //       if (itemValues.length !== mappings.length) {
  //         throw new Error(`Field ${fieldName} has length ${itemValues.length}, different to mappings of length ${mappings.length}`);
  //       }
  //       record[arrFieldName] = itemValues[index];
  //     });
  //   } else if (mappings) {
  //     record[mappings] = item[fieldName] as any;
  //   } else {
  //     record[fieldName] = item[fieldName] as any;
  //   }
  // });

  // Object.entries(record).forEach(([fieldName, value]) => {
  //   const airtableType = fields.find((f) => f.name === fieldName)?.type;
  //   if (!airtableType) {
  //     throw new Error(`Failed to map field to AirTable record, as not in schema: ${fieldName}`);
  //   }

  //   if (jsToAirtableFieldTypeMapper[airtableType]) {
  //     record[fieldName] = jsToAirtableFieldTypeMapper[airtableType](value);
  //   }
  // });

  // return record;
};

const arrayToSingleType = (tsType: TsTypeString): TsTypeString => {
  if (tsType.endsWith('[] | null')) {
    // This results in:
    // string[] | null -> string | null
    // Going the other way might not work - e.g. we'd get (string | null)[]
    return `${tsType.slice(0, -'[] | null'.length)} | null` as TsTypeString;
  }
  if (tsType.endsWith('[]')) {
    return tsType.slice(0, -'[]'.length) as TsTypeString;
  }
  throw new Error(`Not an array type: ${tsType}`);
};

export const get = async <T extends Item>(table: Table<T>, id: string): Promise<T> => {
  const airtableTable = await getAirtableTable(table);

  const record = await airtableTable.find(id) as AirtableRecord
  if (!record) {
    throw new Error(`Failed to find record in ${table.name} with key ${id}`);
  }

  return mapRecordFromAirtable(table, record);
};

export type ScanParams = Omit<QueryParams<unknown>, 'fields' | 'cellFormat' | 'method' | 'returnFieldsByFieldId' | 'pageSize' | 'offset'>;

export const scan = async <T extends Item>(table: Table<T>, params?: ScanParams): Promise<T[]> => {
  const airtableTable = await getAirtableTable(table);
  const records = await airtableTable.select(params).all() as AirtableRecord[]

  return records.map((record) => mapRecordFromAirtable(table, record));
};

export const insert = async <T extends Item>(table: Table<T>, data: Omit<T, 'id'>): Promise<T> => {
  assertMatchesSchema(table, { ...data, id: 'placeholder' }, { direction: 'for' });
  const airtableTable = await getAirtableTable(table);
  const record = await airtableTable.create(mapRecordToAirtable(table, data as Partial<T>, airtableTable)) as AirtableRecord;
  return mapRecordFromAirtable(table, record);
};

export const update = async <T extends Item>(table: Table<T>, data: Partial<T> & { id: T['id'] }): Promise<T> => {
  assertMatchesSchema(table, { ...data }, { direction: 'for', partial: true });
  const { id, ...withoutId } = data;
  const airtableTable = await getAirtableTable(table);
  const record = await airtableTable.update(data.id, mapRecordToAirtable(table, withoutId as Partial<T>, airtableTable)) as AirtableRecord;
  return mapRecordFromAirtable(table, record);
};

export const remove = async <T extends Item>(table: Table<T>, id: string): Promise<T> => {
  const airtableTable = await getAirtableTable(table)
  const record = await airtableTable.destroy(id) as AirtableRecord;
  return mapRecordFromAirtable(table, record);
};
