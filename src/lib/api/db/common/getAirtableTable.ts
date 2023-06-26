import Airtable from 'airtable';
import axios from 'axios';
import { Item, Table } from './mapping/types';
import { AirtableTable } from './types';

export const getAirtableTable = async <T extends Item>(airtable: Airtable, table: Table<T>): Promise<AirtableTable> => {
  const airtableTable = airtable.base(table.baseId).table(table.tableId);

  // We need the schema so we know which type mapper to use.
  // Even if we were inferring a type mapper from the schema, we'd still have to
  // do this as otherwise we can't distinguish a column with all null values from
  // a column that is missing entirely. We'd like to do that as for safety, we'd
  // rather throw an error if the column is missing entirely; this suggests a
  // misconfiguration. But an all-null column is okay. The particular case that
  // this is likely for is checkbox columns.
  const baseSchema = await getAirtableBaseSchema(airtable, table.baseId);
  const tableDefinition = baseSchema.find((t) => t.id === table.tableId);
  if (!tableDefinition) {
    throw new Error(`Failed to find table ${table.tableId} in base ${table.baseId}`);
  }

  return Object.assign(
    airtableTable,
    { fields: tableDefinition.fields },
  );
};

type BaseSchema = { id: string, fields: { name: string, type: string }[] }[];

const baseSchemaCache = new Map</* baseId */ string, { at: number, data: BaseSchema }>();
const CACHE_VALIDITY_IN_MILLISECONDS = 60_000;

/**
 * Get the schemas from the cache or Airtable API for the tables in the given base.
 * @see https://airtable.com/developers/web/api/get-base-schema
 * @param baseId The base id to get the schemas for
 */
const getAirtableBaseSchema = async (airtable: Airtable, baseId: string): Promise<BaseSchema> => {
  const fromCache = baseSchemaCache.get(baseId);
  if (fromCache && Date.now() - fromCache.at < CACHE_VALIDITY_IN_MILLISECONDS) {
    return fromCache.data;
  }

  if (!airtable._apiKey) {
    throw new Error("Airtable instance missing API key");
  }
  const res = await axios<{ tables: BaseSchema }>({
    url: `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
    headers: {
      Authorization: `Bearer ${airtable._apiKey}`,
    },
  });
  const baseSchema = res.data.tables;

  if (baseSchemaCache.size > 100) {
    baseSchemaCache.clear();
    // If you're seeing this warning, then we probably either need to:
    // - Update the maximum limit before clearing the cache, provided we have memory headroom; or
    // - Use a last recently used cache or similar
    console.warn('baseSchemaCache cleared to avoid a memory leak: this code is not currently optimized for accessing over 100 different bases from a single instance');
  }
  baseSchemaCache.set(baseId, { at: Date.now(), data: baseSchema });

  return baseSchema;
};
