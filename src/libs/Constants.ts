
export type ClassType<T> = { new (...args: any[]): T; };

export type JS_DATA_TYPES = 'string' | 'text' | 'number' | 'boolean' | 'double' | 'json' | 'date' | 'time' | 'datetime' | 'timestamp' | 'byte';

export const K_CLS_USE_API = 'use_api';
export const K_CLS_API = 'api';
export const TYPEXS_NAME = 'typexs';
export const CONFIG_NAMESPACE = 'typexs';
export const K_WORKDIR: string = 'workdir';
export const K_CLS_ACTIVATOR = 'activator.js';
export const K_CLS_BOOTSTRAP = 'bootstrap.js';
export const K_CLS_STORAGE_SCHEMAHANDLER: string = 'storage.schemahandler.adapters';
export const K_CLS_TASKS: string = 'tasks';
