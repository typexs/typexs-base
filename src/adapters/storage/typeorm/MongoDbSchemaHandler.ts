import {AbstractSchemaHandler} from '../../../libs/storage/AbstractSchemaHandler';
import * as _ from 'lodash';
import {MongoQueryRunner} from 'typeorm/driver/mongodb/MongoQueryRunner';
import {ICollection} from '../../../libs/storage/ICollection';
import {ICollectionProperty} from '../../../libs/storage/ICollectionProperty';
import {TypeOrmConnectionWrapper} from '../../../libs/storage/framework/typeorm/TypeOrmConnectionWrapper';


export class MongoDbSchemaHandler extends AbstractSchemaHandler {

  type = 'mongodb';

  private getDB(c: TypeOrmConnectionWrapper) {
    const runner = <MongoQueryRunner>c.manager.connection.createQueryRunner();
    const database = c.manager.connection.driver.database;
    return runner.databaseConnection.db(database);

  }

  supportsJson(): boolean {
    return true;
  }

  initOnceByType() {

  }

  async getCollectionNames(): Promise<string[]> {
    const c = await this.storageRef.connect();
    const cursor = this.getDB(c).listCollections(null);
    let v;
    const names: string[] = [];
    while (v = await cursor.next()) {
      names.push(v.name);
    }
    await c.close();
    return names;
  }


  async getCollection(name: string): Promise<any> {
    const c = await this.storageRef.connect();
    const collection = this.getDB(c).listCollections({name: name});
    const res = await collection.next();
    await c.close();
    return res;
  }

  async getCollections(names: string[]): Promise<ICollection[]> {
    const c = await this.storageRef.connect();
    const collections = this.getDB(c).listCollections({name: {$in: names}});

    const colls: ICollection[] = [];
    let cursor: any;
    while (cursor = await collections.next()) {
      const props: ICollectionProperty[] = [];

      const _c: ICollection = {
        name: cursor.name,
        framework: 'typeorm',
        properties: props
      };

      _.keys(cursor).filter(x => x !== 'columns').map(k => {
        _c[k] = cursor[k];
      });

      colls.push(_c);
    }
    return colls;
  }


}
