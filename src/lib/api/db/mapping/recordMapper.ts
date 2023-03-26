import { FieldSet } from 'airtable';
import { AirtableRecord, AirtableTable } from '../types';
import { fieldMappers } from './fieldMappers';
import { FromTsTypeString, TsTypeString } from './types';

/**
 * This function coerces an Airtable record to a TypeScript object, given an
 * object type definition.  It will do this using the field mappers on each
 * field, based on the tsTypes and Airtable table schema (via the record).
 * It does NOT change any property names.
 *
 * @param tsTypes TypeScript types for the record.
 * @example { a: "string", b: "number", c: "boolean", d: "string" }
 *
 * @param record The Airtable record to convert.
 * @example { a: "Some text", b: 123, d: ["rec123"] } // (c is an un-ticked checkbox, d is a multipleRecordLinks)
 *
 * @returns An object matching the TypeScript type passed in, based on the Airtable record. Throws if cannot coerce to requested type.
 * @example { a: "Some text", b: 123, c: false, d: "rec123" }
 */
export const mapRecordTypeAirtableToTs = <T extends { [fieldName: string]: TsTypeString }>(
  tsTypes: T,
  record: AirtableRecord,
): ({ [F in keyof T]: FromTsTypeString<T[F]> } & { id: string }) => {
  const item = {} as { [F in keyof T]: FromTsTypeString<T[F]> };

  (Object.entries(tsTypes) as [keyof T & string, TsTypeString][]).forEach(([fieldName, tsType]) => {
    const value = record.get(fieldName);
    // eslint-disable-next-line no-underscore-dangle
    const airtableType = record._table.fields.find((f) => f.name === fieldName)?.type;

    if (!airtableType) {
      throw new Error(`Failed to get airtable type for field ${fieldName}`);
    }

    const tsMapper = fieldMappers[tsType];
    if (!tsMapper) {
      throw new Error(`No mappers for ts type ${tsType}`);
    }
    const specificMapper = tsMapper[airtableType as keyof typeof tsMapper]?.fromAirtable;
    if (!specificMapper) {
      // eslint-disable-next-line no-underscore-dangle
      throw new Error(`Expected field ${record._table.name}.${fieldName} to be able to map to ts type ${tsType}, but got airtable type ${airtableType} which can't.`);
    }

    item[fieldName] = specificMapper(value as any) as FromTsTypeString<T[keyof T]>;
  });

  return Object.assign(item, { id: record.id });
};

/**
 * This function coerces a TypeScript object to a Airtable record, given an
 * Airtable table. It will do this using the field mappers on each field, based
 * on the tsTypes and Airtable table schema.
 * It does NOT change any property names.
 * 
 * @param tsTypes TypeScript types for the record (necessary to handle nullables).
 * @example { a: "string", b: "number", c: "boolean", d: "string" }
 *
 * @param tsRecord TypeScript object to convert.
 * @example { a: "Some text", b: 123, c: false, d: "rec123" }
 *
 * @param airtableTable An Airtable table.
 * @example { fields: { a: "singleLineText", b: "number", c: "checkbox", d: "multipleRecordLinks" }, ... }
 * 
 * @returns An Airtable FieldSet. Throws if cannot coerce to requested type.
 * @example { a: "Some text", b: 123, d: ["rec123"] } // (c is an un-ticked checkbox, d is a multipleRecordLinks)
 */
export const mapRecordTypeTsToAirtable = <T extends { [fieldName: string]: TsTypeString }, R extends Record<string, FromTsTypeString<TsTypeString>>>(
  tsTypes: T,
  tsRecord: R,
  airtableTable: AirtableTable,
): FieldSet => {
  const item = {} as FieldSet;

  (Object.entries(tsTypes) as [keyof T & string, TsTypeString][]).forEach(([fieldName, tsType]) => {
    const value = tsRecord[fieldName];
    const airtableType = airtableTable.fields.find((f) => f.name === fieldName)?.type;

    if (!airtableType) {
      throw new Error(`Failed to get airtable type for field ${fieldName}`);
    }

    const tsMapper = fieldMappers[tsType];
    if (!tsMapper) {
      throw new Error(`No mappers for ts type ${tsType}`);
    }
    const specificMapper = tsMapper[airtableType as keyof typeof tsMapper]?.toAirtable;
    if (!specificMapper) {
      throw new Error(`Expected field ${airtableTable.name}.${fieldName} to be able to map to airtable type ${airtableType}, but got ts type ${tsType} which can't.`);
    }

    item[fieldName] = (specificMapper as any)(value);
  });

  return Object.assign(item, { id: tsRecord.id });
};
