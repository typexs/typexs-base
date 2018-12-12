
export type ClassType<T> = { new (...args: any[]): T; };

export type JS_DATA_TYPES = 'string' | 'text' | 'number' | 'boolean' | 'double' | 'json' | 'date' | 'time' | 'datetime' | 'timestamp' | 'byte';

export const K_CLS_USE_API = 'use_api';
export const K_CLS_API = 'api';
