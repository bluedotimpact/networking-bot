import { FieldSet } from 'airtable';
import { QueryParams } from 'airtable/lib/query_params';
import { getAirtableTable } from './airtable';
import { assertMatchesSchema } from './assertMatchesSchema';
import { mapRecordFieldNamesAirtableToTs, mapRecordFieldNamesTsToAirtable } from './mapping/nameMapper';
import { mapRecordTypeAirtableToTs, mapRecordTypeTsToAirtable } from './mapping/recordMapper';
import { airtableFieldNameTsTypes, Item, Table } from './mapping/types';
import { AirtableRecord, AirtableTable } from './types';

const mapRecordFromAirtable = <T extends Item>(
  table: Table<T>,
  record: AirtableRecord,
) => {
  const tsTypes = airtableFieldNameTsTypes(table);
  const tsRecord = mapRecordTypeAirtableToTs(tsTypes, record);
  const mappedRecord = mapRecordFieldNamesAirtableToTs(table, tsRecord);
  return mappedRecord;
};

const mapRecordToAirtable = <T extends Item>(
  table: Table<T>,
  item: Partial<T>,
  airtableTable: AirtableTable,
): FieldSet => {
  const mappedItem = mapRecordFieldNamesTsToAirtable(table, item);
  const tsTypes = airtableFieldNameTsTypes(table);
  const fieldSet = mapRecordTypeTsToAirtable(tsTypes, mappedItem, airtableTable);
  return fieldSet;
};

export const get = async <T extends Item>(table: Table<T>, id: string): Promise<T> => {
  const airtableTable = await getAirtableTable(table);
  const record = await airtableTable.find(id) as AirtableRecord;
  if (!record) {
    throw new Error(`Failed to find record in ${table.name} with key ${id}`);
  }
  return mapRecordFromAirtable(table, record);
};

export type ScanParams = Omit<QueryParams<unknown>, 'fields' | 'cellFormat' | 'method' | 'returnFieldsByFieldId' | 'pageSize' | 'offset'>;

export const scan = async <T extends Item>(table: Table<T>, params?: ScanParams): Promise<T[]> => {
  const airtableTable = await getAirtableTable(table);
  const records = await airtableTable.select(params).all() as AirtableRecord[];
  return records.map((record) => mapRecordFromAirtable(table, record));
};

export const insert = async <T extends Item>(table: Table<T>, data: Omit<T, 'id'>): Promise<T> => {
  assertMatchesSchema(table, { ...data, id: 'placeholder' });
  const airtableTable = await getAirtableTable(table);
  const record = await airtableTable.create(mapRecordToAirtable(table, data as Partial<T>, airtableTable)) as AirtableRecord;
  return mapRecordFromAirtable(table, record);
};

export const update = async <T extends Item>(table: Table<T>, data: Partial<T> & { id: string }): Promise<T> => {
  assertMatchesSchema(table, { ...data }, 'partial');
  const { id, ...withoutId } = data;
  const airtableTable = await getAirtableTable(table);
  const record = await airtableTable.update(data.id, mapRecordToAirtable(table, withoutId as Partial<T>, airtableTable)) as AirtableRecord;
  return mapRecordFromAirtable(table, record);
};

export const remove = async <T extends Item>(table: Table<T>, id: string): Promise<T> => {
  const airtableTable = await getAirtableTable(table);
  const record = await airtableTable.destroy(id) as AirtableRecord;
  return mapRecordFromAirtable(table, record);
};
