export const CONFIG_SCHEMA = {
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'description': 'Root configuration description for @typexs/base and theirs settings. Configuration of other moduls will be added by defaultsDeep functionality. \nSo base settings can not be overridden, only extending is possible.',
  'properties': {
    'app': {
      '$id': '#App',
      'type': 'object',
      'required': ['name'],
      'additionalProperties': false,
      'properties': {
        'name': {
          'type': 'string',
          'description': 'Name of the application. Also used for additional config file name pattern.'
        },
        'nodeId': {
          'type': 'string',
          'description': 'Node id for this instance.'
        },
        'path': {
          'type': 'string',
          'description': 'Path to the application, if not the same as the of the installation.'
        },
        'enableShutdownOnUncaughtException': {
          'type': 'boolean',
          'description': 'TODO'
        },
        'system': {
          'type': 'object',
          'properties': {
            'distributed': {
              'type': 'boolean',
              'description': 'Defines if this node instance is distributed and should communicate with other nodes.'
            }
          }
        }
      }
    },
    modules: {
      $id: '#Modules',
      type: 'object',
      description: 'IRuntimeLoaderOptions',
      properties: {
        appdir: {
          type: 'string'
        },
        cachePath: {
          type: 'string'
        },
        paths: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        subModulPattern: {
          description: 'Lookup directory pattern for included submodules. (Default: \'node_modules\')',
          type: 'array',
          items: {
            type: 'string'
          }
        },
        include: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        exclude: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        packageKeys: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        disabled: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        libs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: {
                type: 'string'
              },
              refs: {
                type: 'array',
                items: {
                  type: 'string'
                }
              }
            }
          }
        }
      }
    },
    storage: {
      $id: '#Storage',
      type: 'object',
      properties: {
        _defaultFramework: {
          type: 'string',
          default: 'typeorm'
        }
      },
      patternProperties: {
        '\w+': {
          $id: '#StorageRef',
          type: 'object',
          title: 'StorageRef',
          properties: {
            name: {
              type: 'string'
            },
            type: {
              type: 'string'
            },
            database: {
              type: 'string'
            },
            synchronize: {
              type: 'boolean'
            },
          }
        }
      }
    }
  }
};
