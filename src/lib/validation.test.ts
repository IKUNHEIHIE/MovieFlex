import { describe, it, expect } from 'vitest';
import {
  validateInteger,
  validateString,
  validateEnum,
  validateObject,
  ValidationError,
} from './validation';

describe('validateInteger', () => {
  it('should parse valid integer', () => {
    expect(validateInteger('42')).toBe(42);
  });

  it('should return undefined for empty value', () => {
    expect(validateInteger('')).toBeUndefined();
    expect(validateInteger(undefined)).toBeUndefined();
  });

  it('should throw for non-integer', () => {
    expect(() => validateInteger('3.14')).toThrow(ValidationError);
    expect(() => validateInteger('abc')).toThrow(ValidationError);
  });

  it('should enforce min bound', () => {
    expect(() => validateInteger('0', { min: 1 })).toThrow(ValidationError);
    expect(validateInteger('1', { min: 1 })).toBe(1);
  });

  it('should enforce max bound', () => {
    expect(() => validateInteger('1000', { max: 100 })).toThrow(ValidationError);
    expect(validateInteger('100', { max: 100 })).toBe(100);
  });

  it('should throw for required empty value', () => {
    expect(() => validateInteger('', { required: true })).toThrow(ValidationError);
  });
});

describe('validateString', () => {
  it('should return valid string', () => {
    expect(validateString('hello')).toBe('hello');
  });

  it('should return undefined for empty value', () => {
    expect(validateString('')).toBeUndefined();
    expect(validateString(undefined)).toBeUndefined();
  });

  it('should enforce maxLength', () => {
    expect(() => validateString('a'.repeat(256), { maxLength: 255 })).toThrow(ValidationError);
    expect(validateString('a'.repeat(255), { maxLength: 255 })).toBe('a'.repeat(255));
  });

  it('should enforce pattern', () => {
    expect(() => validateString('abc', { pattern: /^[0-9]+$/ })).toThrow(ValidationError);
    expect(validateString('123', { pattern: /^[0-9]+$/ })).toBe('123');
  });

  it('should throw for required empty value', () => {
    expect(() => validateString('', { required: true })).toThrow(ValidationError);
  });
});

describe('validateEnum', () => {
  const SORT_OPTIONS = ['latest', 'score', 'views'] as const;

  it('should return valid enum value', () => {
    expect(validateEnum('latest', SORT_OPTIONS)).toBe('latest');
  });

  it('should return undefined for empty value', () => {
    expect(validateEnum('', SORT_OPTIONS)).toBeUndefined();
    expect(validateEnum(undefined, SORT_OPTIONS)).toBeUndefined();
  });

  it('should throw for invalid enum value', () => {
    expect(() => validateEnum('invalid', SORT_OPTIONS)).toThrow(ValidationError);
  });

  it('should throw for required empty value', () => {
    expect(() => validateEnum('', SORT_OPTIONS, { required: true })).toThrow(ValidationError);
  });
});

describe('validateObject', () => {
  it('should return valid object', () => {
    const obj = { key: 'value' };
    expect(validateObject(obj)).toEqual(obj);
  });

  it('should return undefined for null/undefined', () => {
    expect(validateObject(null)).toBeUndefined();
    expect(validateObject(undefined)).toBeUndefined();
  });

  it('should throw for array', () => {
    expect(() => validateObject([])).toThrow(ValidationError);
  });

  it('should enforce maxSize', () => {
    const largeObj = { data: 'x'.repeat(10000) };
    expect(() => validateObject(largeObj, { maxSize: 1000 })).toThrow(ValidationError);
  });

  it('should throw for required null value', () => {
    expect(() => validateObject(null, { required: true })).toThrow(ValidationError);
  });
});
