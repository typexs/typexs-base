import {
  CONFIG_NAMESPACE,
  K_CLS_ACTIVATOR,
  K_CLS_API,
  K_CLS_BOOTSTRAP,
  K_CLS_CACHE_ADAPTER,
  K_CLS_COMMANDS,
  K_CLS_ENTITIES_DEFAULT,
  K_CLS_EXCHANGE_MESSAGE,
  K_CLS_GENERATORS,
  K_CLS_SCHEDULE_ADAPTER_FACTORIES,
  K_CLS_STORAGE_SCHEMAHANDLER,
  K_CLS_STORAGE_TYPES,
  K_CLS_USE_API
} from '../Constants';
import {IRuntimeLoaderOptions} from '../../base/IRuntimeLoaderOptions';
import {K_CLS_TASKS} from '../tasks/Constants';
import {K_CLS_WORKERS} from '../worker/Constants';
import {IStorageOptions} from '../storage/IStorageOptions';
import {ITypexsOptions} from '../ITypexsOptions';

/**
 * Command options
 */
export const LOAD_ORDER_ONLY = 'load-order-only';
export const USED_FILES_ONLY = 'used-files-only';
export const USED_SOURCES_ONLY = 'used-sources-only';
export const OPTIONS_ONLY = 'options-only';
export const VALIDATE_ONLY = 'validate-only';
export const SCHEMA_ONLY = 'schema-only';


export const ENV_CONFIG_LOAD_KEY = 'txs-config-load';


export const NAMESPACE_CONFIG = 'config';

/**
 * Search for config files
 * - first look for hostname specific files
 * - then for context specific controlled by startup arguments like 'nodeId' and 'stage'
 */
export const DEFAULT_CONFIG_LOAD_ORDER = [
  {
    type: 'file', file: '${argv.configfile}'
  },
  {
    type: 'file', file: '${env.configfile}'
  },
  {
    type: 'file',
    file: {
      dirname: './config',
      filename: 'typexs'
    },
    namespace: CONFIG_NAMESPACE,
    pattern: [
      'typexs--${os.hostname}',
      'typexs--${argv.nodeId}',
      'typexs--${os.hostname}--${argv.nodeId}',
      '${os.hostname}/typexs',
      '${os.hostname}/typexs--${argv.nodeId}'
    ]
  },
  {
    type: 'file',
    file: {dirname: './config', filename: '${app.name}'},
    pattern: [
      'secrets',
      'secrets--${os.hostname}',
      'secrets--${argv.nodeId}',
      'secrets--${app.nodeId}',
      'secrets--${env.nodeId}',
      'secrets--${os.hostname}--${argv.nodeId}',
      'secrets--${os.hostname}--${app.nodeId}',
      'secrets--${os.hostname}--${env.nodeId}',
      '${os.hostname}/secrets',
      '${app.name}--${os.hostname}',
      '${app.name}--${argv.nodeId}',
      '${app.name}--${app.nodeId}',
      '${app.name}--${env.stage}',
      '${app.name}--${argv.stage}',
      '${app.name}--${os.hostname}--${argv.stage}',
      '${app.name}--${os.hostname}--${env.stage}',
      '${app.name}--${os.hostname}--${argv.nodeId}',
      '${app.name}--${os.hostname}--${app.nodeId}',
      '${app.name}--${os.hostname}--${env.stage}--${argv.nodeId}',
      '${app.name}--${os.hostname}--${env.stage}--${app.nodeId}',
      '${app.name}--${os.hostname}--${argv.stage}--${argv.nodeId}',
      '${app.name}--${os.hostname}--${argv.stage}--${argv.nodeId}',
      '${app.name}/typexs--${os.hostname}--${argv.stage}--${argv.nodeId}',
      '${app.name}/${os.hostname}/typexs--${argv.stage}--${argv.nodeId}'
    ]
  }
];

/**
 * using default path for caching
 */
export const DEFAULT_RUNTIME_OPTIONS: IRuntimeLoaderOptions = {

  appdir: '.',

  paths: [],

  included: {},

  subModulPattern: [
    // 'packages',
    // 'src/packages'
  ],

  include: [
    '**/@typexs{,**/}*'
  ],

  exclude: [
    '**/@types{,**/}*'
  ],

  disableCache: false,

  libs: [
    {
      topic: K_CLS_ACTIVATOR,
      refs: [
        'Activator', 'src/Activator'
      ]
    },
    {
      topic: K_CLS_BOOTSTRAP,
      refs: [
        'Bootstrap', 'src/Bootstrap',
        'Startup', 'src/Startup'
      ]
    },
    {
      topic: K_CLS_API,
      refs: [
        'api/*.api.*',
        'src/api/*.api.*'
      ]
    },
    {
      topic: K_CLS_USE_API,
      refs: ['extend/*', 'src/extend/*']
    },
    {
      topic: K_CLS_COMMANDS,
      refs: ['commands', 'src/commands']
    },
    {
      topic: K_CLS_GENERATORS,
      refs: ['generators', 'src/generators']
    },
    {
      topic: K_CLS_STORAGE_SCHEMAHANDLER,
      refs: [
        'adapters/storage/*/*SchemaHandler.*',
        'src/adapters/storage/*/*SchemaHandler.*'
      ]
    },
    {
      topic: K_CLS_STORAGE_TYPES,
      refs: [
        'adapters/storage/*/*Storage.*',
        'src/adapters/storage/*/*Storage.*'
      ]
    },
    {
      topic: K_CLS_CACHE_ADAPTER,
      refs: [
        'adapters/cache/*CacheAdapter.*',
        'src/adapters/cache/*CacheAdapter.*'
      ]
    },
    {
      topic: K_CLS_SCHEDULE_ADAPTER_FACTORIES,
      refs: [
        'adapters/scheduler/*Factory.*',
        'src/adapters/scheduler/*Factory.*'
      ]
    },
    {
      topic: K_CLS_ENTITIES_DEFAULT,
      refs: [
        'entities', 'src/entities',
        'shared/entities', 'src/shared/entities',
        'modules/*/entities', 'src/modules/*/entities'
      ]
    },
    {
      topic: K_CLS_TASKS,
      refs: [
        'tasks', 'tasks/*/*', 'src/tasks', 'src/tasks/*/*'
      ]
    },
    {
      topic: K_CLS_WORKERS,
      refs: [
        'workers', 'workers/*/*', 'src/workers', 'src/workers/*/*'
      ]
    },
    {
      topic: K_CLS_EXCHANGE_MESSAGE,
      refs: [
        'adapters/exchange/*/*Exchange.*', 'src/adapters/exchange/*/*Exchange.*'
      ]
    },
  ]
};


export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = <any & IStorageOptions>{
  name: 'default',
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  connectOnStartup: false
};


export const DEFAULT_TYPEXS_OPTIONS: ITypexsOptions = {
  app: {
    name: 'app',
    path: '.'
  },

  modules: {},

  logging: {enable: false},

  storage: {
    'default': DEFAULT_STORAGE_OPTIONS
  }

};
