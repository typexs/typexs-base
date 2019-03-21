import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from 'chai';
import {Log} from "../../../src";
import {TestHelper} from "../TestHelper";
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const stdMocks = require('std-mocks');


@suite('functional/logging/logging')
class LoggingSpec {

  before() {
    Log.reset();
  }

  after() {
    Log.reset();
  }

  @test
  async 'log to console'() {

    Log.options({enable: true, level: 'debug'});
    let defaultLogger = Log.getLogger();
    let level = defaultLogger.getLevel();
    expect(level).to.deep.eq({name: 'debug', nr: null});

    stdMocks.use();
    Log.info('test');
    stdMocks.restore();

    let content = stdMocks.flush();
    expect(content.stdout[0]).to.contain('test');


  }

  @test
  async 'log to file'() {
    let tmp = os.tmpdir();
    let tmpId = 'testfile-' + (new Date()).getTime();
    let logFile = path.join(tmp, tmpId) + '.log';

    Log.options({enable: true, level: 'debug'});

    let defaultLogger = Log.getLogger();
    let level = defaultLogger.getLevel();
    expect(level).to.deep.eq({name: 'debug', nr: null});

    stdMocks.use();
    Log.info('test');
    stdMocks.restore();

    let content = stdMocks.flush();
    expect(content.stdout[0]).to.contain('test');

    Log.options({enable: true, level: 'debug', transports: [{file: {filename: logFile}}]});
    Log.info('testfile');

    await TestHelper.wait(100);
    let data = fs.readFileSync(logFile).toString();
    expect(data).to.contain('testfile');
    fs.unlinkSync(logFile);
  }


  @test
  async 'sublogger create / get / remove'() {
    let tmp = os.tmpdir();
    let tmpId = 'testfile-${testKey}';
    let logFile = path.join(tmp, tmpId) + '.log';

    Log.options({
      enable: true, level: 'debug',
      loggers: [
        {name: 'fixed_name', enable: true, transports: [{file: {filename: logFile}}]},
        {name: 'tasklog-*', enable: true, transports: [{file: {filename: logFile}}]}
      ]
    });

    let x = Log._().createLogger('fixed_name', {testKey: 'fixed'});
    expect(x.getOptions()).to.deep.eq({
      name: 'fixed_name',
      enable: true,
      transports:
        [{file: {filename: '/tmp/testfile-fixed.log'}}]
    });

    x.info('test_fix');

    let y = Log._().createLogger('tasklog-hallo', {testKey: 'tasklogfile'});
    expect(y.getOptions()).to.deep.eq({
      name: 'tasklog-*',
      enable: true,
      transports:
        [{file: {filename: '/tmp/testfile-tasklogfile.log'}}]
    });

    y.info('test_tasklog');

    await TestHelper.wait(100);
    let data_fixed = fs.readFileSync(logFile.replace('${testKey}', 'fixed')).toString();
    expect(data_fixed).to.contain('test_fix');

    let data_tasklog = fs.readFileSync(logFile.replace('${testKey}', 'tasklogfile')).toString();
    expect(data_tasklog).to.contain('test_tasklog');

    Log._().removeLogger('tasklog-hallo');
    expect(_.has(Log._()['loggers'],'tasklog-hallo')).to.be.true;
  }


  @test
  async 'use default "default" format'() {
    Log.options({enable: true, level: 'debug', transports: [{console: {}}]});
    stdMocks.use();
    Log.info('default_format');
    stdMocks.restore();
    let content = stdMocks.flush();
    expect(content.stdout[0]).to.contain('default_format')
  }


  @test
  async 'use format default'() {
    Log.options({enable: true, level: 'debug', format: 'default',transports: [{console: {}}]});
    stdMocks.use();
    Log.info('default_format');
    stdMocks.restore();
    let content = stdMocks.flush();
    expect(content.stdout[0]).to.contain('default_format')
  }


  @test
  async 'use format json'() {
    Log.options({enable: true, level: 'debug', format: 'json',transports: [{console: {}}]});
    stdMocks.use();
    Log.info('default_format');
    stdMocks.restore();
    let content = stdMocks.flush();
    expect(content.stdout[0]).to.contain('{"level":"info","message":"default_format"')
  }

}

