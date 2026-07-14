import { NextResponse } from 'next/server';

export class ValidationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateInteger(
  value: string | undefined,
  options: { min?: number; max?: number; required?: boolean } = {}
): number | undefined {
  const { min = 1, max = Number.MAX_SAFE_INTEGER, required = false } = options;
  
  if (value === undefined || value === '') {
    if (required) throw new ValidationError('此字段为必填项');
    return undefined;
  }
  
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new ValidationError('必须是整数');
  }
  
  if (parsed < min || parsed > max) {
    throw new ValidationError(`必须在 ${min} 到 ${max} 之间`);
  }
  
  return parsed;
}

export function validateString(
  value: string | undefined,
  options: { minLength?: number; maxLength?: number; pattern?: RegExp; required?: boolean } = {}
): string | undefined {
  const { minLength = 0, maxLength = 255, pattern, required = false } = options;
  
  if (value === undefined || value === '') {
    if (required) throw new ValidationError('此字段为必填项');
    return undefined;
  }
  
  if (value.length < minLength) {
    throw new ValidationError(`长度不能小于 ${minLength}`);
  }
  
  if (value.length > maxLength) {
    throw new ValidationError(`长度不能超过 ${maxLength}`);
  }
  
  if (pattern && !pattern.test(value)) {
    throw new ValidationError('格式无效');
  }
  
  return value;
}

export function validateEnum<T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
  options: { required?: boolean } = {}
): T | undefined {
  const { required = false } = options;
  
  if (value === undefined || value === '') {
    if (required) throw new ValidationError('此字段为必填项');
    return undefined;
  }
  
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`必须是以下值之一: ${allowedValues.join(', ')}`);
  }
  
  return value as T;
}

export function validateObject(
  value: unknown,
  options: { maxSize?: number; required?: boolean } = {}
): Record<string, unknown> | undefined {
  const { maxSize = 8192, required = false } = options;
  
  if (value === undefined || value === null) {
    if (required) throw new ValidationError('此字段为必填项');
    return undefined;
  }
  
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('必须是对象');
  }
  
  const serialized = JSON.stringify(value);
  if (serialized.length > maxSize) {
    throw new ValidationError(`数据大小不能超过 ${maxSize} 字节`);
  }
  
  return value as Record<string, unknown>;
}

export function handleValidationError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }
  
  console.error('Unexpected validation error:', error);
  return NextResponse.json(
    { success: false, error: '验证失败' },
    { status: 500 }
  );
}
