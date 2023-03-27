import {
  AirtableTypeString, FromAirtableTypeString, FromTsTypeString, TsTypeString,
} from './types';

type Mapper = {
  [T in TsTypeString]?: {
    [A in AirtableTypeString]?: {
      toAirtable: (value: FromTsTypeString<T>) => FromAirtableTypeString<A>,
      fromAirtable: (value: FromAirtableTypeString<A> | null | undefined) => FromTsTypeString<T>,
    }
  }
};

const required = <T>(value: T): NonNullable<T> => {
  if (value === null || value === undefined) {
    throw new Error('missing required value');
  }
  return value;
};

const fallbackMapperPair = <T, F1, F2>(toFallback: F1, fromFallback: F2) => ({
  toAirtable: (value: T | null | undefined) => value ?? toFallback,
  fromAirtable: (value: T | null | undefined) => value ?? fromFallback,
});

const requiredMapperPair = {
  toAirtable: <T>(value: T | null | undefined) => required(value),
  fromAirtable: <T>(value: T | null | undefined) => required(value),
};

export const fieldMappers: Mapper = {
  string: {
    singleLineText: fallbackMapperPair('', ''),
    email: fallbackMapperPair('', ''),
    url: fallbackMapperPair('', ''),
    multilineText: fallbackMapperPair('', ''),
    richText: fallbackMapperPair('', ''),
    phoneNumber: fallbackMapperPair('', ''),
    multipleRecordLinks: {
      toAirtable: (value) => {
        return [value];
      },
      fromAirtable: (value) => {
        if (!value) {
          throw new Error('Failed to coerce multipleRecordLinks type field to a single string, as it was blank');
        }
        if (value.length !== 1) {
          throw new Error(`Can't coerce multipleRecordLinks to a single string, as there were ${value?.length} entries`);
        }
        return value[0];
      },
    },
  },
  'string | null': {
    singleLineText: fallbackMapperPair(null, null),
    email: fallbackMapperPair(null, null),
    url: fallbackMapperPair(null, null),
    multilineText: fallbackMapperPair(null, null),
    richText: fallbackMapperPair(null, null),
    phoneNumber: fallbackMapperPair(null, null),
    multipleRecordLinks: {
      toAirtable: (value) => {
        return value ? [value] : [];
      },
      fromAirtable: (value) => {
        if (!value || value.length === 0) {
          return null;
        }
        if (value.length !== 1) {
          throw new Error(`Can't coerce multipleRecordLinks to a single string, as there were ${value?.length} entries`);
        }
        return value[0];
      },
    },
  },
  boolean: {
    checkbox: fallbackMapperPair(false, false),
  },
  'boolean | null': {
    checkbox: fallbackMapperPair(null, null),
  },
  number: {
    number: requiredMapperPair,
    percent: requiredMapperPair,
    currency: requiredMapperPair,
    rating: requiredMapperPair,
    duration: requiredMapperPair,
    count: {
      fromAirtable: (value) => required(value),
      toAirtable: () => { throw new Error('count type field is readonly'); },
    },
    autoNumber: {
      fromAirtable: (value) => required(value),
      toAirtable: () => { throw new Error('autoNumber type field is readonly'); },
    },
  },
  'number | null': {
    number: fallbackMapperPair(null, null),
    percent: fallbackMapperPair(null, null),
    currency: fallbackMapperPair(null, null),
    rating: fallbackMapperPair(null, null),
    duration: fallbackMapperPair(null, null),
    count: {
      fromAirtable: (value) => value ?? null,
      toAirtable: () => { throw new Error('count type field is readonly'); },
    },
    autoNumber: {
      fromAirtable: (value) => value ?? null,
      toAirtable: () => { throw new Error('autoNumber field is readonly'); },
    },
  },
  'string[]': {
    multipleRecordLinks: fallbackMapperPair([], []),
  },
  'string[] | null': {
    multipleRecordLinks: fallbackMapperPair(null, null),
  },
};
