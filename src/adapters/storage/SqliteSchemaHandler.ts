import {AbstractSchemaHandler} from '../../libs/storage/AbstractSchemaHandler';
import * as _ from 'lodash';
import {NotYetImplementedError} from 'commons-base/browser';


export class SqliteSchemaHandler extends AbstractSchemaHandler {

  type: string = 'sqlite';

  initOnceByType() {
    super.initOnceByType();

    const fn = {

      year: (field: string) => 'strftime(\'%Y\', ' + field + ')',
      month: (field: string) => 'strftime(\'%m\', ' + field + ')',
      day: (field: string) => 'strftime(\'%d\', ' + field + ')',
      date: (field: string) => 'strftime(\'%Y-%m-%d\', ' + field + ')',
      timestamp: (field: string) => 'strftime(\'%s\', ' + field + ')',
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
          'strftime(\'' + format + '\', ' + field + ')',
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
