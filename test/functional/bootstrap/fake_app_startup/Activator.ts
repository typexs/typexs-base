import {IActivator} from '../../../../src';

export class Activator implements IActivator{
  name: string;
  done: boolean = false;

  constructor() {
    this.name = 'base';
  }

  configSchema(): any {
    return {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      'type': 'object',
      'properties': {
        'app': {
          'type': 'object',
          'properties': {
            'extending': {
              'type': 'string',
            },
          }
        },
        'server': {
          '$id': 'Server',
          'type': 'object',
          'properties': {
            'host': {
              'type': 'string',
            },
          }
        }
      }
    }
  }

  startup() {
    this.done = true;

  }
}
