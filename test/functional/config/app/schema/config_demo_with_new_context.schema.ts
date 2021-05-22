export const CONFIG_SCHEMA_FOR_GREAT_STUFF = {
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'description': 'Root configuration description for @typexs/base and theirs settings. Configuration of other moduls will be added by defaultsDeep functionality. \nSo base settings can not be overridden, only extending is possible.',
  'properties': {
    'great': {
      type: 'object',
      $id: 'Great',
      properties: {
        stuff: {
          type: 'string',
          description: 'Really great stuff property!'
        }
      }
    }
  }
};
