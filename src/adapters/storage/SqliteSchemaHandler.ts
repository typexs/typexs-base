import {AbstractSchemaHandler} from '../../libs/storage/AbstractSchemaHandler';
import * as _ from 'lodash';


export class SqliteSchemaHandler extends AbstractSchemaHandler {

  type: string = 'sqlite';

  initOnceByType() {
    super.initOnceByType();
    this.registerOperationHandle('year', (field: string) => {
      return 'strftime(\'%Y\', ' + field + ')';
    });
    this.registerOperationHandle('month', (field: string) => {
      return 'strftime(\'%m\', ' + field + ')';
    });
    this.registerOperationHandle('day', (field: string) => {
      return 'strftime(\'%d\', ' + field + ')';
    });
    this.registerOperationHandle('date', (field: string) => {
      return 'strftime(\'%Y-%m-%d\', ' + field + ')';
    });
    this.registerOperationHandle('timestamp', (field: string) => {
      return 'strftime(\'%s\', ' + field + ')';
    });
    this.registerOperationHandle('regex', (key: string, value: RegExp | string) => {
      return key + ' REGEXP '+ value ;
    });
  }

  async getCollectionNames(): Promise<string[]> {
    const c = await this.storageRef.connect();
    const q = await c.manager.query('SELECT name FROM sqlite_master WHERE type=\'table\';');
    return _.map(q, x => x.name);
  }


}
