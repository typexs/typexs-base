import {__NS__, ClassType, IClassRef, __CLASS__ as __CLASS___} from '@allgemein/schema-api';

export const K_CLS_USE_API = 'use_api';
export const K_CLS_API = 'api';
export const TYPEXS_NAME = 'typexs';
export const CONFIG_NAMESPACE = 'typexs';
export const K_WORKDIR = 'workdir';

export const __DEFAULT__ = '__default__';

export const K_CLS_ACTIVATOR = 'activator.js';
export const K_CLS_BOOTSTRAP = 'bootstrap.js';
export const K_CLS_COMMANDS = 'commands';
export const K_CLS_GENERATORS = 'generators';
export const K_CLS_SCHEDULE_ADAPTER_FACTORIES = 'scheduler-factories';
export const K_CLS_STORAGE_SCHEMAHANDLER = 'storage.schemahandler.adapters';
export const K_CLS_CACHE_ADAPTER = 'cache.adapters';
export const K_CLS_STORAGE_TYPES = 'storage.types';
export const K_CLS_ENTITIES_DEFAULT = 'entity.default';
export const K_CLS_EXCHANGE_MESSAGE = 'exchange.messages';


export const C_EVENTBUS = 'eventbus';
export const C_CONFIG = 'config';
export const C_ENTITY = 'entity';
export const K_DEFAULT_FRAMEWORK = '_defaultFramework';



export const APP_SYSTEM_DISTRIBUTED = 'app.system.distributed';
export const APP_SYSTEM_UPDATE_INTERVAL = 'app.system.updateInterval';

export const XS_P_$COUNT = '$count';
export const XS_P_$LIMIT = '$limit';
export const XS_P_$OFFSET = '$offset';

export const __NODE_ID__ = '__nodeId__';
export const __CLASS__ = __CLASS___;
// export const __REGISTRY__ = '__registry__';
export const __REGISTRY__ = __NS__;

export const C_KEY_SEPARATOR = ':';
export const C_STORAGE_DEFAULT = 'storage.default';

export const C_CONFIGURATION_FILTER_KEYS_KEY = 'config.hide.keys';
export const C_CONFIG_FILTER_KEYS = [
  'user',
  'username',
  'password',
  'pass',
  'credential',
  'credentials',
  'secret',
  'token'
];

export type CLS_DEF<T> = string | Function | ClassType<T> | IClassRef;
