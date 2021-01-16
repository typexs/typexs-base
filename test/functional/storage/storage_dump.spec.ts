import {suite, test} from "@testdeck/mocha";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "@allgemein/config";


@suite('functional/storage/storage_dump')
class Storage_dumpSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }



  @test.skip()
  async 'dump'() {
    /*
    let appdir = path.join(__dirname, 'fake_app');
    let bootstrap = await Bootstrap.configure({
      app: {path: appdir},
      modules: {paths: [__dirname + '/../../..']}
    }).prepareRuntime();
    bootstrap = await bootstrap.activateStorage();

    let storageManager = bootstrap.getStorage();
    let storageRef = storageManager.get('default');
    let handler = storageRef.getSchemaHandler();
    let collectionNames = await handler.getCollectionNames();
    console.log(collectionNames);
    let connection = await storageRef.connect();
    let tables = await connection.manager.connection.createQueryRunner().getTables(collectionNames);
    console.log(inspect(tables,false,10));
*/

  }

}

