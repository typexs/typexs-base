import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';


import {Container} from 'typedi';
import {SimpleTask} from './tasks/SimpleTask';
import {SimpleTaskPromise} from './tasks/SimpleTaskPromise';
import {SimpleTaskWithArgs} from './tasks/SimpleTaskWithArgs';
import {DependentTask} from './tasks/DependentTask';
import {DependingTask} from './tasks/DependingTask';
import {GroupedTask1} from './tasks/GroupedTask1';
import {GroupedTask2} from './tasks/GroupedTask2';
import {GroupedTask3} from './tasks/GroupedTask3';
import {GroupedTask4} from './tasks/GroupedTask4';
import {GroupingTask} from './tasks/GroupingTask';
import {SimpleTaskNoName} from './tasks/SimpleTaskNoName';
import {SimpleTaskInstance} from './tasks/SimpleTaskInstance';
import {SimpleTaskUngrouped01} from './tasks/SimpleTaskUngrouped01';
import {SimpleTaskUngrouped02} from './tasks/SimpleTaskUngrouped02';
import {SimpleTaskError} from './tasks/SimpleTaskError';
import {SimpleTaskWithRuntimeLog} from './tasks/SimpleTaskWithRuntimeLog';
import {TestHelper} from '../TestHelper';
import {SimpleTaskWithDefaultArgs} from './tasks/SimpleTaskWithDefaultArgs';
import {SimpleOtherTask, SimpleTaskStartingOtherTask} from './tasks/SimpleTaskStartingOtherTask';
import {Log} from '../../../src/libs/logging/Log';
import {Invoker} from '../../../src/base/Invoker';
import {TasksApi} from '../../../src/api/Tasks.api';
import {TaskRunner} from '../../../src/libs/tasks/TaskRunner';
import {Tasks} from '../../../src/libs/tasks/Tasks';
import {TaskRunnerRegistry} from '../../../src/libs/tasks/TaskRunnerRegistry';
import {TasksHelper} from '../../../src/libs/tasks/TasksHelper';
import {Injector} from '../../../src/libs/di/Injector';
import {Config} from 'commons-config';
import moment = require('moment');

const stdMocks = require('std-mocks');

const LOG_EVENT = TestHelper.logEnable(false);


@suite('functional/tasks/tasks')
class TasksSpec {

  static async before() {
    await TestHelper.clearCache();
    Log.reset();
    // Log.options({level: 'debug', enable: LOG_EVENT});
    const i = new Invoker();
    Container.set(Invoker.NAME, i);
    i.register(TasksApi, []);

    const registry = new TaskRunnerRegistry();
    Container.set(TaskRunnerRegistry.NAME, registry);

  }

  static after() {
    Container.reset();
  }


  @test
  async 'register simple tasks class and run'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTask);
    expect(taskRef.name).to.be.eq('simple_task');
    const runner = new TaskRunner(tasks, ['simple_task']);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
    // tslint:disable-next-line:no-shadowed-variable
    const x = data.results.find(x => x.name === taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register simple tasks class with promise and run'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTaskPromise);
    expect(taskRef.name).to.be.eq('simple_task_promise');
    const runner = new TaskRunner(tasks, ['simple_task_promise']);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
    // tslint:disable-next-line:no-shadowed-variable
    const x = data.results.find(x => x.name === taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register simple tasks where name will be generated'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTaskNoName);
    expect(taskRef.name).to.be.eq('simple_task_no_name');
    const runner = new TaskRunner(tasks, [taskRef.name]);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
    // tslint:disable-next-line:no-shadowed-variable
    const x = data.results.find(x => x.name === taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register simple tasks instance with exec method and run'() {
    const tasks = new Tasks('testnode');
    const nn = new SimpleTaskInstance();
    const taskRef = tasks.addTask(nn);
    expect(taskRef.name).to.be.eq('simple_task_instance');
    const runner = new TaskRunner(tasks, [taskRef.name]);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
    const x = data.results.find(x => x.name === taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register function callback and run'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask('callback_task', function (done: Function) {
      done(null, 'test');
    });
    expect(taskRef.name).to.be.eq('callback_task');
    const runner = new TaskRunner(tasks, [taskRef.name]);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
    const x = data.results.find(x => x.name === taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register function callback and run as promise'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask('callback_task_async', async function () {
      return 'test';
    });
    expect(taskRef.name).to.be.eq('callback_task_async');
    const runner = new TaskRunner(tasks, [taskRef.name]);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
    const x = data.results.find(x => x.name === taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register simple tasks class with arguments and run'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTaskWithArgs);
    expect(taskRef.name).to.be.eq('simple_task_with_args');
    expect(taskRef.getIncomings().map(x => x.name)).to.be.deep.eq(['incoming', 'list']);
    expect(taskRef.getIncomings().map(x => x.storingName)).to.be.deep.eq(['incoming', 'param_list']);

    const runner = new TaskRunner(tasks, ['simple_task_with_args']);
    const req = runner.getRequiredIncomings();
    expect(req.map(x => x.storingName)).to.be.deep.eq(['incoming', 'param_list']);

    await runner.setIncoming('incoming', 'is_incomed;)');
    await runner.setIncoming('param_list', ['one', 'two']);

    const data = await runner.run();
    expect(data.results).to.have.length(1);
    const res = data.results.shift();
    expect(res.incoming.incoming).to.be.eq('is_incomed;)');
    expect(res.incoming.list).to.be.deep.eq(['one', 'two']);
    expect(res.outgoing.outgoing).to.be.eq('is_incomed;)-test one;two');
    expect(res.result).to.be.eq('is_incomed;)-test one;two');
    expect(res.has_error).to.be.false;
    expect(res.error).to.be.null;
  }

  @test
  async 'register simple tasks class with arguments and default values and run'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTaskWithDefaultArgs);
    expect(taskRef.name).to.be.eq('simple_task_with_default_args');
    expect(taskRef.getIncomings().map(x => x.name)).to.be.deep.eq(['value', 'list']);
    expect(taskRef.getIncomings().map(x => x.getOptions('default'))).to.be.deep.eq(['SomeValue', ['asd', 'bfr']]);

    const runner = new TaskRunner(tasks, ['simple_task_with_default_args']);
    const req = runner.getRequiredIncomings();
    expect(req.map(x => x.storingName)).to.be.deep.eq(['value', 'list']);

    const data = await runner.run();
    expect(data.results).to.have.length(1);

    const res = data.results.shift();
    expect(res.incoming).to.be.deep.eq({value: 'SomeValue', list: ['asd', 'bfr']});
  }

  @test
  async 'task execution'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTaskWithDefaultArgs);
    expect(taskRef.name).to.be.eq('simple_task_with_default_args');
    expect(taskRef.getIncomings().map(x => x.name)).to.be.deep.eq(['value', 'list']);
    expect(taskRef.getIncomings().map(x => x.getOptions('default'))).to.be.deep.eq(['SomeValue', ['asd', 'bfr']]);

    const runner = new TaskRunner(tasks, ['simple_task_with_default_args']);
    const req = runner.getRequiredIncomings();
    expect(req.map(x => x.storingName)).to.be.deep.eq(['value', 'list']);

    const data = await runner.run();
    expect(data.results).to.have.length(1);

    const res = data.results.shift();
    expect(res.incoming).to.be.deep.eq({value: 'SomeValue', list: ['asd', 'bfr']});
  }

  @test
  async 'grouped tasks without grouping task'() {
    const tasks = new Tasks('testnode');
    const group1 = tasks.addTask(GroupedTask1);
    const group2 = tasks.addTask(GroupedTask2);

    const runner = new TaskRunner(tasks, ['grouped']);
    const data = await runner.run();
    expect(data.results).to.have.length(3);
    const res = data.results.map(r => r.result).filter(f => f);
    expect(res).to.be.deep.eq(['grouped_1', 'grouped_2']);
  }


  @test
  async 'grouped tasks with a grouping task'() {
    const tasks = new Tasks('testnode');
    const grouping = tasks.addTask(GroupingTask);
    const group3 = tasks.addTask(GroupedTask3);
    const group4 = tasks.addTask(GroupedTask4);

    const runner = new TaskRunner(tasks, ['grouping']);
    const data = await runner.run();
    expect(data.results).to.have.length(3);
    const res = data.results.map(r => r.result).filter(f => f);
    expect(res).to.be.deep.eq(['grouping', 'grouped_3', 'grouped_4']);
  }


  @test
  async 'dependencies tasks'() {
    const tasks = new Tasks('testnode');
    const dependent = tasks.addTask(DependentTask);
    const depending = tasks.addTask(DependingTask);
    depending.dependsOn(dependent.name);
    expect(depending.dependencies()).to.be.deep.eq(['dependent']);

    const runner = new TaskRunner(tasks, [depending.name]);
    const data = await runner.run();
    expect(data.results).to.have.length(2);
    const res = data.results.find(r => r.name === depending.name);
    expect(res.result).to.deep.eq({new: 'data', test: 'true'});
  }


  @test
  async 'map task to new one (class-registered task)'() {
    const oldName = 'simple_task';
    const newName = 'copy_simple_task';

    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTask);
    expect(taskRef.name).to.be.eq(oldName);

    const copyTaskRef = tasks.taskMap(newName, oldName);
    expect(copyTaskRef.name).to.eq(newName);

    const c1 = taskRef.getClassRef();
    const c2 = copyTaskRef.getClassRef();
    expect(c1).to.eq(c2);

    const runner = new TaskRunner(tasks, [newName]);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
  }


  @test
  async 'map task to new one (instance-registered task)'() {
    const oldName = 'simple_task_instance';
    const newName = 'copy_simple_task_instance';
    const tasks = new Tasks('testnode');
    const nn = new SimpleTaskInstance();
    const taskRef = tasks.addTask(nn);
    expect(taskRef.name).to.be.eq(oldName);

    const copyTaskRef = tasks.taskMap(newName, oldName);
    expect(copyTaskRef.name).to.eq(newName);

    const c1 = taskRef.getClassRef();
    const c2 = copyTaskRef.getClassRef();
    // if instance is cloned then the classref is the same
    expect(c1).to.eq(c2);

    const runner = new TaskRunner(tasks, [newName]);
    const data = await runner.run();
    expect(data.results).to.have.length(1);

  }


  @test
  async 'map task to new one (callback-registered task)'() {
    const oldName = 'callback_test';
    const newName = 'copy_callback_test';
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(oldName, function (done: Function) {
      done(null, 'test');
    });
    expect(taskRef.name).to.be.eq(oldName);

    const copyTaskRef = tasks.taskMap(newName, oldName);
    expect(copyTaskRef.name).to.eq(newName);

    const c1 = taskRef.getClassRef();
    const c2 = copyTaskRef.getClassRef();
    expect(c1).to.eq(c2);

    const runner = new TaskRunner(tasks, [newName]);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
  }


  @test
  async 'map task group to new one'() {
    const tasks = new Tasks('testnode');
    const t1 = tasks.addTask(SimpleTaskUngrouped01);
    const t2 = tasks.addTask(SimpleTaskUngrouped02);

    t1.group('simple_group');
    t2.group('simple_group');

    const ref = tasks.taskMap('copy_simple_group', 'simple_group');
    expect(ref.name).to.eq('copy_simple_group');

    const groups = ref.grouping();
    expect(groups).to.deep.eq(['simple_task_ungrouped_01', 'simple_task_ungrouped_02']);

    let runner = new TaskRunner(tasks, ['simple_group']);
    let data = await runner.run();
    expect(data.results).to.have.length(3);

    runner = new TaskRunner(tasks, ['copy_simple_group']);
    data = await runner.run();
    expect(data.results).to.have.length(3);
  }


  @test
  async 'toJson and fromJson'() {
    const tasks = new Tasks('testnode');
    tasks.reset();

    tasks.addTask(SimpleTaskUngrouped01);
    tasks.addTask(SimpleTaskUngrouped02);
    tasks.addTask(SimpleTaskWithArgs);
    tasks.addTask(SimpleTaskWithRuntimeLog);

    const out = tasks.toJson();
//    console.log(inspect(out,false,10));
    expect(out).to.have.length(4);

    tasks.reset();
    const out01 = out.shift();
    const task01 = tasks.fromJson(out01);
    expect(task01.name).to.be.eq('simple_task_ungrouped_01');

    const out02 = out.shift();
    const task02 = tasks.fromJson(out02);
    expect(task02.name).to.be.eq('simple_task_ungrouped_02');

    const out03 = out.shift();
    const task03 = tasks.fromJson(out03);
    const props03 = task03.getPropertyRefs();
    expect(task03.name).to.be.eq('simple_task_with_args');
    expect(props03).to.have.length(4);

    const out04 = out.shift();
    const task04 = tasks.fromJson(out04);
    const props04 = task04.getPropertyRefs();
    expect(task04.name).to.be.eq('simple_task_with_runtime_log');
    expect(props04).to.have.length(1);
  }

  @test
  async 'runtime error in (class-registered task)'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTaskError);

    const runner = new TaskRunner(tasks, [taskRef.name]);
    const data = await runner.run();
    expect(data.results).to.have.length(1);
    expect(_.find(data.results, x => x.has_error)).exist;
  }


  @test
  async 'own task logger'() {
    // Log.options({enable:true})
    const tasks = new Tasks('testnode');
    tasks.reset();
    const taskRef = tasks.addTask(SimpleTaskWithRuntimeLog);
    stdMocks.use();
    const runner = new TaskRunner(tasks, [taskRef.name]);
    runner.getLogger().info('extern use ;)');
    await TestHelper.wait(50);

    let x: any[] = [];
    const reader = runner.getReadStream();
    reader.on('data', (data: any) => {
      x = _.concat(x,
        data.toString()
          .split('\n')
          .filter((x: string) => !_.isEmpty(x))
      );
    });

    const data = await runner.run();

    await TestHelper.wait(100);
    stdMocks.restore();
    const content = stdMocks.flush();
    expect(content.stdout).to.have.length(5);

    // let cNewLogger = content.stdout.shift();
    // expect(cNewLogger).to.contain('[DEBUG]   create new logger task-runner-');
    const cLogExec = content.stdout.shift();
    expect(cLogExec).to.contain('execute tasks: simple_task_with_runtime_log');
    let cLogExtern = content.stdout.shift();
    expect(cLogExtern).to.contain('extern use ;)\n');
    let cLogTaskInfo = content.stdout.shift();
    expect(cLogTaskInfo).to.match(/\[INFO\].+:simple_task_with_runtime_log:\d+.+doing something/);
    let cLogTaskWarn = content.stdout.shift();
    expect(cLogTaskWarn).to.match(/\[WARN\].+:simple_task_with_runtime_log:\d+.+doing something wrong/);
    let cLogTaskError = content.stdout.shift();
    expect(cLogTaskError).to.match(/\[ERROR\].+:simple_task_with_runtime_log:\d+.+doing something wrong\nnewline/);


    expect(x).to.have.length(4);
    cLogExtern = x.shift();
    expect(cLogExtern).to.contain('extern use ;)');
    cLogTaskInfo = x.shift();
    expect(cLogTaskInfo).to.contain('doing something');
    cLogTaskWarn = x.shift();
    expect(cLogTaskWarn).to.contain('doing something wrong');
    cLogTaskError = x.shift();
    expect(cLogTaskError).to.contain('doing something wrong\\nnewline');

  }


  @test
  async 'run task which starts and subtask in same runner'() {
    const tasks = new Tasks('testnode');
    const taskRef1 = tasks.addTask(SimpleTaskStartingOtherTask);
    const taskRef2 = tasks.addTask(SimpleOtherTask);

    const runner = new TaskRunner(tasks, [taskRef1.name]);
    const data = await runner.run();

    expect(data.results).to.have.length(2);
    expect(data.results.map(d => d.name)).to.be.deep.eq(['simple_task_starting_other_task', 'simple_other_task']);
  }


  @test
  async 'registry check task running collection'() {
    const tasks = new Tasks('testnode1');
    const taskRef = tasks.addTask(SimpleTask);
    expect(taskRef.name).to.be.eq('simple_task');

    const registry = Container.get(TaskRunnerRegistry.NAME) as TaskRunnerRegistry;
    expect(registry.getRunners()).to.have.length(0);

    const runner = new TaskRunner(tasks, ['simple_task']);
    expect(registry.getRunners()).to.have.length(1);
    expect(registry.hasRunnerForTasks('simple_task')).to.be.true;
    expect(registry.hasRunnerForTasks(['simple_task'])).to.be.true;

    const data = await runner.run();
    expect(data.results).to.have.length(1);
    expect(registry.getRunners()).to.have.length(0);
    expect(registry.hasRunningTasks('simple_task')).to.be.false;
  }


  @test
  async 'execute task by helper'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTaskPromise);
    Container.set(Tasks.NAME, tasks);

    // expect(taskRef.name).to.be.eq('simple_task_promise');
    // const runner = new TaskRunner(tasks, ['simple_task_promise']);
    // const data = await runner.run();
    // expect(data.results).to.have.length(1);
    // // tslint:disable-next-line:no-shadowed-variable
    // const x = data.results.find(x => x.name === taskRef.name);
    // expect(x.name).to.be.eq(taskRef.name);
    // expect(x.result).to.be.eq('test');
    const data = await TasksHelper.exec(['simple_task_promise'], {isLocal: true, skipTargetCheck: true}) as any;
    const x = data.results.find((x: any) => x.name === taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
    Container.remove(Tasks.NAME);
  }

  @test
  async 'execute task by helper and check concurrency limit'() {
    const tasks = new Tasks('testnode');
    const taskRef = tasks.addTask(SimpleTaskPromise);
    Container.set(Tasks.NAME, tasks);
    const taskRunnerRegistry = Injector.create(TaskRunnerRegistry);
    Container.set(TaskRunnerRegistry.NAME, taskRunnerRegistry);
    await taskRunnerRegistry.prepare();


    const promise1 = TasksHelper.exec(['simple_task_promise'], {
      isLocal: true,
      skipTargetCheck: true,
      executionConcurrency: 1
    }) as any;
    const promise2 = TasksHelper.exec(['simple_task_promise'], {
      isLocal: true,
      skipTargetCheck: true,
      executionConcurrency: 1
    }) as any;

    const results = await Promise.all([promise1, promise2]);
    expect(results.shift()).not.to.be.null;
    expect(results.shift()).to.be.null;
    await taskRunnerRegistry.prepare();
    Container.remove(Tasks.NAME);
    Container.remove(TaskRunnerRegistry.NAME);
  }


  @test
  async 'task helper log file path'() {
    const date = moment().format('YYYY-MM-DD');
    let path = TasksHelper.getTaskLogFile('123', 'go');
    expect(path).to.be.eq('/tmp/taskmonitor-123-go.log');
    Config.set('tasks.logdir', '/tmp/tasks-%YYYY-%MM-%DD');
    path = TasksHelper.getTaskLogFile('123', 'go');
    expect(path).to.be.eq('/tmp/tasks-' + date + '/taskmonitor-123-go.log');
    Config.set('tasks.logdir', '/tmp/tasks/%YYYY-%MM-%DD');
    path = TasksHelper.getTaskLogFile('123', 'go');
    expect(path).to.be.eq('/tmp/tasks/' + date + '/taskmonitor-123-go.log');
  }


  @test.skip
  async 'task status pub/sub'() {
  }


  @test.skip
  async 'add remote task '() {
  }


}

