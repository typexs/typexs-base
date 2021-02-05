import {AbstractSchemaHandler} from '../../../libs/storage/AbstractSchemaHandler';
import * as _ from 'lodash';
import {NotYetImplementedError} from '@allgemein/base';


export class SqliteSchemaHandler extends AbstractSchemaHandler {

  type: string = 'sqlite';

  initOnceByType() {
    super.initOnceByType();

    const fn = {

      year: (field: string) => 'cast(strftime(\'%Y\', ' + field + ', \'localtime\') as integer)',
      month: (field: string) => 'cast(strftime(\'%m\', ' + field + ', \'localtime\') as integer)',
      day: (field: string) => 'cast(strftime(\'%d\', ' + field + ', \'localtime\') as integer)',
      date: (field: string) => 'strftime(\'%Y-%m-%d\', ' + field + ', \'localtime\')',
      timestamp: (field: string) => 'cast(strftime(\'%s\', ' + field + ', \'localtime\') as integer)',
      regex: (k: string, field: string | RegExp, options: string) => {
        if (_.isString(field)) {
          return k + ' REGEXP ' + field;
        } else if (_.isRegExp(field)) {
          return k + ' REGEXP ' + field.source;
        } else {
          throw new NotYetImplementedError('regex for ' + k + ' with value ' + field);
        }

      },
      dateToString:
        (field: string, format: string = '%Y-%m-%d %H:%M:%S' /* +, timezone: any, onNull: any */) =>
          'strftime(\'' + format + '\', ' + field + ', \'localtime\')',
    };

    _.keys(fn).forEach(x => {
      this.registerOperationHandle(x, fn[x]);
    });

  }

  async getCollectionNames(): Promise<string[]> {
    const c = await this.storageRef.connect();
    const q = await c.manager.query('SELECT name FROM sqlite_master WHERE type=\'table\';');
    return _.map(q, x => x.name);
  }


}
