import * as path from 'path';
import * as _ from 'lodash';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {RuntimeLoader} from '../../../src/base/RuntimeLoader';
import {K_CLS_WORKERS} from '../../../src/libs/worker/Constants';
import {K_CLS_API, K_CLS_BOOTSTRAP, K_CLS_STORAGE_SCHEMAHANDLER, K_CLS_USE_API} from '../../../src/libs/Constants';
import {K_CLS_TASKS} from '../../../src/libs/tasks/Constants';


@suite('functional/bootstrap/general')
class BootstrapGeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'add additional config options'() {
    Bootstrap._({app: {path: __dirname}});
    const cfg = Bootstrap.addConfigOptions(
      {configs: [{type: 'file', file: './config/super.json'}]}
    );

    expect(cfg.configs).to.deep.include({
      type: 'file',
      file: './config/super.json'
    });

    const settings = Bootstrap.configure();

    let data = Config.get('', 'typexs');
    expect(data).to.deep.include(
      {app: {name: 'boottest', path: __dirname}}
    );

    data = Config.get('', 'default');
    expect(data).to.deep.eq({
      appdata: {loaded: true},
      super: 'yes'
    });

    data = Config.get();
    expect(data).to.deep.include({
      app: {name: 'boottest', path: __dirname},
      appdata: {loaded: true},
      super: 'yes'
    });
  }


  @test
  async 'load typexs modules'() {

    const p = path.join(__dirname, 'fake_app');
    let loader = new RuntimeLoader({
      appdir: p
    });

    await loader.rebuild();
    const modules = loader.registry.modules();
    expect(modules).to.have.length(3);
    expect(_.find(modules, {name: 'module1'})).to.exist;
    expect(_.find(modules, {name: 'module2'})).to.not.exist;

    const activators = loader.classesLoader.getClasses('activator.js');
    expect(activators).to.have.length(2);
    expect(activators.shift().prototype.constructor.name).to.eq('Activator');

    const commands = loader.classesLoader.getClasses('commands');
    expect(commands).to.have.length(1);
    expect(commands.shift().prototype.constructor.name).to.eq('Xyz');

    const builders = loader.classesLoader.getClasses('builder');
    expect(builders).to.have.length(1);
    expect(builders.shift().prototype.constructor.name).to.eq('UnitBuilder');

    loader = null;
  }


  @test
  async 'bootstrap app with modules'() {
    const appdir = path.join(__dirname, 'fake_app');

    let bootstrap = Bootstrap.configure({
      app: {name: 'test', path: appdir}
    });
    bootstrap = await bootstrap.prepareRuntime();

    expect(bootstrap['_options']).to.be.deep.include({
      app: {
        path: appdir,
        name: 'fake_app'
      },
      modules: {
        appdir: appdir,
        included: {
          'fake_app': {
            'enabled': true
          },
          'module1': {
            'enabled': true
          },
          'module3': {
            'enabled': true
          }
        }
        ,
        libs:
          [
            {topic: 'activator.js', refs: ['Activator', 'src/Activator']},
            {topic: K_CLS_API, refs: ['api/*.api.*', 'src/api/*.api.*']},
            {topic: K_CLS_BOOTSTRAP, refs: ['Bootstrap', 'src/Bootstrap', 'Startup', 'src/Startup']},
            {
              'topic': 'builder',
              'refs': [
                'builder'
              ]
            },
            {
              'refs': [
                'adapters/cache/*CacheAdapter.*',
                'src/adapters/cache/*CacheAdapter.*'
              ],
              'topic': 'cache.adapters'
            },

            {topic: 'commands', refs: ['commands', 'src/commands']},
            {
              topic: 'entity.default',
              refs: [
                'entities', 'src/entities',
                'shared/entities', 'src/shared/entities',
                'modules/*/entities', 'src/modules/*/entities', 'src/entitytest'
              ]
            },
            {topic: 'flow', refs: ['flow']},
            {topic: 'generators', refs: ['generators', 'src/generators']},
            {
              'refs': [
                'adapters/scheduler/*Factory.*',
                'src/adapters/scheduler/*Factory.*'
              ],
              'topic': 'scheduler-factories'
            },

            {
              topic: K_CLS_STORAGE_SCHEMAHANDLER,
              refs: [
                'adapters/storage/*SchemaHandler.*',
                'src/adapters/storage/*SchemaHandler.*'
              ]
            },
            {
              topic: K_CLS_TASKS,
              refs: [
                'tasks',
                'tasks/*/*',
                'src/tasks',
                'src/tasks/*/*'
              ]
            },
            {
              topic: K_CLS_USE_API,
              refs: ['extend/*', 'src/extend/*']
            },
            {
              topic: K_CLS_WORKERS,
              refs: ['workers',
                'workers/*/*',
                'src/workers',
                'src/workers/*/*']
            }


          ],
        'packageKeys': [
          'typexs'
        ]
        ,
        paths: [
          appdir
        ],
        'subModulPattern': [
          'node_modules',
          'packages',
          'src/packages'
        ]
      }
    });


  }

  @test
  async 'activator startups'() {
    const appdir = path.join(__dirname, 'fake_app_startup');
    let bootstrap = Bootstrap.configure({
      app: {name: 'test', path: appdir},
      logging: {enable: false, level: 'debug'},
      modules: {paths: [__dirname + '/../../..']}
    });

    await bootstrap.activateLogger();
    await bootstrap.activateErrorHandling();
    bootstrap = await bootstrap.prepareRuntime();
    // console.log(inspect(Config.get('modules'),false,10));
    await bootstrap.activateStorage();
    await bootstrap.startup();
    const activators = bootstrap.getActivators();

    await bootstrap.shutdown();
    expect(activators).to.have.length(2);
    // expect(activators[0]['done']).to.be.true;
    expect(activators[1]['done']).to.be.true;

  }


  @test
  async 'additional package keys'() {
    const appdir = path.join(__dirname, 'fake_app');
    let bootstrap = Bootstrap.configure({
      app: {
        name: 'test', path: appdir
      },
      modules: {
        packageKeys: ['pkg']
      }
    });
    bootstrap = await bootstrap.prepareRuntime();
    const modules = bootstrap.getModules();

    expect(modules).to.have.length(4);

  }


}

