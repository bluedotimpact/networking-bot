import { describe, test, expect } from 'vitest';
import { fieldMappers } from './fieldMappers';

describe('string', () => {
  test.each([
    ['singleLineText'],
    ['email'],
    ['url'],
    ['multilineText'],
    ['richText'],
    ['phoneNumber'],
  ] as const)('%s', (airtableType) => {
    const mapperPair = fieldMappers.string?.[airtableType];
    if (!mapperPair) {
      throw new Error(`Expected mapper pair for [string, ${airtableType}]`);
    }

    expect(mapperPair.fromAirtable('Some text from Airtable!')).toBe('Some text from Airtable!');
    expect(mapperPair.fromAirtable(null)).toBe('');
    expect(mapperPair.fromAirtable(undefined)).toBe('');

    expect(mapperPair.toAirtable('Some text to Airtable!')).toBe('Some text to Airtable!');
  });

  test('multipleRecordLinks', () => {
    const mapperPair = fieldMappers.string?.multipleRecordLinks;
    if (!mapperPair) {
      throw new Error('Expected mapper pair for [string, multipleRecordLinks]');
    }

    expect(mapperPair.fromAirtable(['rec123'])).toBe('rec123');
    expect(() => mapperPair.fromAirtable(null)).toThrow();
    expect(() => mapperPair.fromAirtable(undefined)).toThrow();
    expect(() => mapperPair.fromAirtable([])).toThrow();
    expect(() => mapperPair.fromAirtable(['rec123', 'rec456'])).toThrow();

    expect(mapperPair.toAirtable('rec789')).toEqual(['rec789']);
  });
});

describe('string | null', () => {
  test.each([
    ['singleLineText'],
    ['email'],
    ['url'],
    ['multilineText'],
    ['richText'],
    ['phoneNumber'],
  ] as const)('%s', (airtableType) => {
    const mapperPair = fieldMappers['string | null']?.[airtableType];
    if (!mapperPair) {
      throw new Error(`Expected mapper pair for [string | null, ${airtableType}]`);
    }

    expect(mapperPair.fromAirtable('Some text from Airtable!')).toBe('Some text from Airtable!');
    expect(mapperPair.fromAirtable(null)).toBe(null);
    expect(mapperPair.fromAirtable(undefined)).toBe(null);

    expect(mapperPair.toAirtable('Some text to Airtable!')).toBe('Some text to Airtable!');
    expect(mapperPair.toAirtable(null)).toBe(null);
  });

  test('multipleRecordLinks', () => {
    const mapperPair = fieldMappers['string | null']?.multipleRecordLinks;
    if (!mapperPair) {
      throw new Error('Expected mapper pair for [string | null, multipleRecordLinks]');
    }

    expect(mapperPair.fromAirtable(['rec123'])).toBe('rec123');
    expect(mapperPair.fromAirtable(null)).toBe(null);
    expect(mapperPair.fromAirtable(undefined)).toBe(null);
    expect(mapperPair.fromAirtable([])).toBe(null);
    expect(() => mapperPair.fromAirtable(['rec123', 'rec456'])).toThrow();

    expect(mapperPair.toAirtable('rec789')).toEqual(['rec789']);
    expect(mapperPair.toAirtable(null)).toEqual([]);
  });
});

describe('boolean', () => {
  test('checkbox', () => {
    const mapperPair = fieldMappers.boolean?.checkbox;
    if (!mapperPair) {
      throw new Error('Expected mapper pair for [boolean, checkbox]');
    }

    expect(mapperPair.fromAirtable(true)).toBe(true);
    expect(mapperPair.fromAirtable(false)).toBe(false);
    expect(mapperPair.fromAirtable(null)).toBe(false);
    expect(mapperPair.fromAirtable(undefined)).toBe(false);

    expect(mapperPair.toAirtable(true)).toBe(true);
    expect(mapperPair.toAirtable(false)).toBe(false);
  });
});

describe('number', () => {
  test.each([
    ['number'],
    ['percent'],
    ['currency'],
    ['rating'],
    ['duration'],
  ] as const)('%s', (airtableType) => {
    const mapperPair = fieldMappers.number?.[airtableType];
    if (!mapperPair) {
      throw new Error(`Expected mapper pair for [number, ${airtableType}]`);
    }

    expect(mapperPair.fromAirtable(123)).toBe(123);
    expect(() => mapperPair.fromAirtable(null)).toThrow('required');
    expect(() => mapperPair.fromAirtable(undefined)).toThrow('required');

    expect(mapperPair.toAirtable(123)).toBe(123);
  });

  test.each([
    ['count'],
    ['autoNumber'],
  ] as const)('%s', (airtableType) => {
    const mapperPair = fieldMappers.number?.[airtableType];
    if (!mapperPair) {
      throw new Error(`Expected mapper pair for [number, ${airtableType}]`);
    }

    expect(mapperPair.fromAirtable(123)).toBe(123);
    expect(() => mapperPair.fromAirtable(null)).toThrow('required');
    expect(() => mapperPair.fromAirtable(undefined)).toThrow('required');

    expect(() => mapperPair.toAirtable(123)).toThrow('readonly');
  });
});

describe('string[]', () => {
  test('multipleRecordLinks', () => {
    const mapperPair = fieldMappers['string[]']?.multipleRecordLinks;
    if (!mapperPair) {
      throw new Error('Expected mapper pair for [string[], multipleRecordLinks]');
    }

    expect(mapperPair.fromAirtable(['rec123'])).toEqual(['rec123']);
    expect(mapperPair.fromAirtable(null)).toEqual([]);
    expect(mapperPair.fromAirtable(undefined)).toEqual([]);
    expect(mapperPair.fromAirtable([])).toEqual([]);
    expect(mapperPair.fromAirtable(['rec123', 'rec456'])).toEqual(['rec123', 'rec456']);

    expect(mapperPair.toAirtable([])).toEqual([]);
    expect(mapperPair.toAirtable(['rec789'])).toEqual(['rec789']);
    expect(mapperPair.toAirtable(['rec789', 'rec012'])).toEqual(['rec789', 'rec012']);
  });
});