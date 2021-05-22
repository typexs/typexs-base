export const CONFIG_SCHEMA = {
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'description': 'Root configuration description for @typexs/base and theirs settings. Configuration of other moduls will be added by defaultsDeep functionality. \nSo base settings can not be overridden, only extending is possible.',
  'properties': {
    'app': {
      '$id': 'App',
      'type': 'object',
      'required': ['name'],
      'additionalProperties': false,
      'properties': {
        'name': {
          'type': 'string',
          'description': 'Name of the application. Also used for additional config file name pattern.'
        },
        'path': {
          'type': 'string',
          'description': 'Path to the application, if not the same as the of the installation.'
        },
        'enableShutdownOnUncaughtException': {
          'type': 'boolean',
          'description': 'TODO'
        }
      }
    }
  }
};
