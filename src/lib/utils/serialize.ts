import { Decimal } from '@prisma/client/runtime/library';

export function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'object') {
    // Robust check for Prisma Decimal (decimal.js or custom Decimal)
    if (
      data instanceof Decimal ||
      (data as any)?.isDecimal ||
      (data as any)?._isDecimal ||
      (data as any)?.constructor?.name === 'Decimal' ||
      ('s' in data && 'd' in data && 'e' in data && Array.isArray((data as any).d)) ||
      (typeof (data as any).toNumber === 'function' && typeof (data as any).toFixed === 'function')
    ) {
      return Number((data as any).toString()) as any;
    }

    if (data instanceof Date) {
      return data.toISOString() as any;
    }

    if (Array.isArray(data)) {
      return data.map(item => serializeData(item)) as any;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeData(value);
    }
    return result;
  }

  return data;
}

