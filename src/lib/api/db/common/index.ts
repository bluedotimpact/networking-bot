import { QueryParams } from 'airtable/lib/query_params';
import Airtable from 'airtable';
import { getAirtableTable } from './getAirtableTable';
import { assertMatchesSchema } from './assertMatchesSchema';
import { mapRecordFromAirtable, mapRecordToAirtable } from './mapping/recordMapper';
import { Item, Table } from './mapping/types';
import { AirtableRecord } from './types';

export class TypedAirtable {
  private airtable: Airtable;

  constructor({ apiKey }: TypedAirtableOptions) {
    this.airtable = new Airtable({ apiKey });
  }

  async get<T extends Item>(table: Table<T>, id: string): Promise<T> {
    const airtableTable = await getAirtableTable(this.airtable, table);
    const record = await airtableTable.find(id) as AirtableRecord;
    if (!record) {
      throw new Error(`Failed to find record in ${table.name} with key ${id}`);
    }
    return mapRecordFromAirtable(table, record);
  }

  async scan<T extends Item>(table: Table<T>, params?: ScanParams): Promise<T[]> {
    const airtableTable = await getAirtableTable(this.airtable, table);
    const records = await airtableTable.select(params).all() as AirtableRecord[];
    return records.map((record) => mapRecordFromAirtable(table, record));
  }

  async insert<T extends Item>(table: Table<T>, data: Omit<T, 'id'>): Promise<T> {
    assertMatchesSchema(table, { ...data, id: 'placeholder' });
    const airtableTable = await getAirtableTable(this.airtable, table);
    const record = await airtableTable.create(mapRecordToAirtable(table, data as Partial<T>, airtableTable)) as AirtableRecord;
    return mapRecordFromAirtable(table, record);
  }

  async update<T extends Item>(table: Table<T>, data: Partial<T> & { id: string }): Promise<T> {
    assertMatchesSchema(table, { ...data }, 'partial');
    const { id, ...withoutId } = data;
    const airtableTable = await getAirtableTable(this.airtable, table);
    const record = await airtableTable.update(data.id, mapRecordToAirtable(table, withoutId as Partial<T>, airtableTable)) as AirtableRecord;
    return mapRecordFromAirtable(table, record);
  }

  async remove<T extends Item>(table: Table<T>, id: string): Promise<T> {
    const airtableTable = await getAirtableTable(this.airtable, table);
    const record = await airtableTable.destroy(id) as AirtableRecord;
    return mapRecordFromAirtable(table, record);
  }
}

export interface TypedAirtableOptions {
  apiKey: string;
}

export type ScanParams = Omit<QueryParams<unknown>, 'fields' | 'cellFormat' | 'method' | 'returnFieldsByFieldId' | 'pageSize' | 'offset'>;
