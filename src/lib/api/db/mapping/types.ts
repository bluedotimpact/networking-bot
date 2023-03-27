import type { Item, Table } from '../tables';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TsTypeString = NonNullToString<any> | ToTsTypeString<any>;

type NonNullToString<T> =
  T extends string ? 'string' :
    T extends number ? 'number' :
      T extends boolean ? 'boolean' :
        T extends number[] ? 'number[]' :
          T extends string[] ? 'string[]' :
            T extends boolean[] ? 'boolean[]' :
              never;

export type ToTsTypeString<T> =
  null extends T ? `${NonNullToString<T>} | null` : NonNullToString<T>;

export type FromTsTypeString<T> =
  T extends 'string' ? string :
    T extends 'string | null' ? string | null :
      T extends 'number' ? number :
        T extends 'number | null' ? number | null :
          T extends 'boolean' ? boolean :
            T extends 'boolean | null' ? boolean | null :
              T extends 'string[]' ? string[] :
                T extends 'string[] | null' ? string[] | null :
                  T extends 'number[]' ? number[] :
                    T extends 'number[] | null' ? number[] | null :
                      T extends 'boolean[]' ? boolean[] :
                        T extends 'boolean[] | null' ? boolean[] | null :
                          never;

export type AirtableTypeString = 'singleLineText' | 'email' | 'url' | 'multilineText' | 'phoneNumber' | 'checkbox' | 'number' | 'percent' | 'currency' | 'count' | 'autoNumber' | 'rating' | 'richText' | 'duration' | 'multipleRecordLinks';

export type FromAirtableTypeString<T> =
  T extends 'singleLineText' ? string | null :
    T extends 'email' ? string | null :
      T extends 'url' ? string | null :
        T extends 'multilineText' ? string | null :
          T extends 'richText' ? string | null :
            T extends 'phoneNumber' ? string | null :
              T extends 'checkbox' ? boolean | null :
                T extends 'number' ? number | null :
                  T extends 'percent' ? number | null :
                    T extends 'currency' ? number | null :
                      T extends 'rating' ? number | null :
                        T extends 'duration' ? number | null :
                          T extends 'count' ? number | null :
                            T extends 'autoNumber' ? number | null :
                              T extends 'multipleRecordLinks' ? string[] | null :
                                never;

interface TypeDef {
  single: 'string' | 'number' | 'boolean',
  array: boolean,
  nullable: boolean,
}

const parseType = (t: TsTypeString): TypeDef => {
  if (t.endsWith('[] | null')) {
    return {
      single: t.slice(0, -('[] | null'.length)) as TypeDef['single'],
      array: true,
      nullable: true,
    };
  }

  if (t.endsWith('[]')) {
    return {
      single: t.slice(0, -('[]'.length)) as TypeDef['single'],
      array: true,
      nullable: false,
    };
  }

  if (t.endsWith(' | null')) {
    return {
      single: t.slice(0, -(' | null'.length)) as TypeDef['single'],
      array: false,
      nullable: true,
    };
  }

  return {
    single: t as TypeDef['single'],
    array: false,
    nullable: false,
  };
};

/**
 * Verifies whether the given value is assignable to the given type
 *
 * @param value
 * @example [1, 2, 3]
 *
 * @param tsType
 * @example 'number[]'
 *
 * @returns
 * @example true
 */
export const matchesType = (value: unknown, tsType: TsTypeString): boolean => {
  const expectedType = parseType(tsType);

  if (expectedType.nullable && value === null) {
    return true;
  }

  if (!expectedType.array && typeof value === expectedType.single) {
    return true;
  }

  return (
    expectedType.array
    && Array.isArray(value)
    && (value as unknown[]).every((entry) => typeof entry === expectedType.single)
  );
};

/**
 * Returns a single type for an array type
 *
 * @param tsType
 * @example 'string[]'
 *
 * @returns
 * @example 'string'
 */
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

/**
 * Constructs a TypeScript object type definition given a table definition
 *
 * @param table Table definition
 * @example {
 *            schema: { someProp: 'string', otherProps: 'number[]', another: 'boolean' },
 *            mappings: { someProp: 'Some_Airtable_Field', otherProps: ['Field1', 'Field2'], another: 'another' },
 *            ...
 *          }
 *
 * @returns The TypeScript object type we expect the Airtable record to coerce to
 * @example {
 *            Some_Airtable_Field: 'string',
 *            Field1: 'number',
 *            Field2: 'number',
 *            another: 'boolean',
 *          }
 */
export const airtableFieldNameTsTypes = <T extends Item>(table: Table<T>): Record<string, TsTypeString> => {
  const schemaEntries = Object.entries(table.schema) as [keyof Omit<T, 'id'>, TsTypeString][];

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
    }).flat(1),
  );
};
