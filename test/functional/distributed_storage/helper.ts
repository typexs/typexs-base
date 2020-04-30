import {DataRow} from './fake_app/entities/DataRow';
import {DataRow as DataRowMongo} from './fake_app_mongo/entities/DataRow';

export function generateSqlDataRows() {
  const entries = [];
  for (let i = 1; i <= 20; i++) {
    const e = new DataRow();
    e.id = i;
    e.someBool = i % 2 === 0;
    e.someDate = new Date(2020, i % 12, i % 30);
    e.someNumber = i * 10;
    e.someFlag = ((i % 3) * 10) + '';
    e.someString = 'test ' + i;
    // e.someAny = ['test ' + i, 'test ' + (i * 2)];
    entries.push(e);
  }
  return entries;
}


export function generateMongoDataRows() {
  const entries = [];
  for (let i = 1; i <= 20; i++) {
    const e = new DataRowMongo();
    e.id = i;
    e.someBool = i % 2 === 0;
    e.someDate = new Date(2020, i % 12, i % 30);
    e.someNumber = i * 10;
    e.someString = 'test ' + i;
    e.someAny = ['test ' + i, 'test ' + (i * 2)];
    entries.push(e);
  }
  return entries;
}
