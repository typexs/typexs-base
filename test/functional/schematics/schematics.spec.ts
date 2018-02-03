import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {MetaArgs, SchematicsExecutor} from "../../../src";
import {Config} from "commons-config";
import {Bootstrap} from "../../../src/Bootstrap";
import * as path from "path";
import {PlatformUtils} from "commons-base";


@suite('functional/schematics')
class BootstrapGeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }

  after() {
    Bootstrap.reset();
    Config.clear();
  }

  @test
  async 'on bootstrap'() {
    let appdir = path.join(__dirname, 'fake_app');
    let bootstrap = Bootstrap.configure({app: {path: appdir}});
    await bootstrap.prepareRuntime();

    let loader = bootstrap.getLoader();
    let settings = await loader.getSettings('schematics');
    expect(Object.keys(settings)).to.have.length(3);
    expect(Object.keys(settings)).to.deep.eq(['@schematics/pattern01', '@schematics/pattern02', 'fake_app']);

    let schematicsInfos = await bootstrap.getLoader().getSchematicsInfos();
    expect(Object.keys(schematicsInfos)).to.have.length(2);
    expect(schematicsInfos.find(x => x.name === '@schematics/pattern01').internal).to.be.true;
    expect(schematicsInfos.find(x => x.name === '@schematics/pattern02').internal).to.be.false;
  }


  @test @timeout(5000)
  async 'gulp task'() {
    let appdir = __dirname + '/../../..';
    let workdir = __dirname + '/tmp/gulp';

    PlatformUtils.mkdir(workdir);

    let bootstrap = Bootstrap.configure({app: {path: appdir}});
    await bootstrap.prepareRuntime();

    console.log('ASDASD')

    let schematicsInfos = await bootstrap.getLoader().getSchematicsInfos();
    let schematics = schematicsInfos.find(x => x.name === '@schematics/typexs');

    let executor = new SchematicsExecutor({
      workdir: workdir,
      basedir: appdir,
      collectionName: schematics.internal ? schematics.path : schematics.name,
      schematicName: 'gulp',
      argv: {
        name: 'typexs-gulp-test'
      }
    });


    try {
      await executor.run();

    } catch (e) {
    }


    let data = await PlatformUtils.readFile(__dirname + '/tmp/gulp/package.json');
    let gulpExists = PlatformUtils.fileExist(__dirname + '/tmp/gulp/gulpfile.ts');
    let json = JSON.parse(data.toString('utf-8'));
    expect(json.name).to.eq('typexs-gulp-test');
    expect(gulpExists).to.be.true;

    await PlatformUtils.deleteDirectory(__dirname + '/tmp');

  }


}

