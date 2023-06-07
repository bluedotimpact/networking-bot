import { FieldSet, Table as AirtableSdkTable, Record as AirtableSdkRecord } from 'airtable';

export type AirtableRecord = Omit<AirtableSdkRecord<FieldSet>, '_table'> & {
  _table: AirtableTable
};

export type AirtableTable = AirtableSdkTable<FieldSet> & {
  fields: { name: string, type: string }[],
};
