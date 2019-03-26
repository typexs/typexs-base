import * as _ from 'lodash';
import * as fs from 'fs';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Invoker, Log, TaskRunner, Tasks, TasksApi} from "../../../src";
import {Container} from "typedi";
import {SimpleTask} from "./tasks/SimpleTask";
import {SimpleTaskPromise} from "./tasks/SimpleTaskPromise";
import {SimpleTaskWithArgs} from "./tasks/SimpleTaskWithArgs";
import {DependentTask} from "./tasks/DependentTask";
import {DependingTask} from "./tasks/DependingTask";
import {GroupedTask1} from "./tasks/GroupedTask1";
import {GroupedTask2} from "./tasks/GroupedTask2";
import {GroupedTask3} from "./tasks/GroupedTask3";
import {GroupedTask4} from "./tasks/GroupedTask4";
import {GroupingTask} from "./tasks/GroupingTask";
import {SimpleTaskNoName} from "./tasks/SimpleTaskNoName";
import {SimpleTaskInstance} from "./tasks/SimpleTaskInstance";
import {SimpleTaskUngrouped01} from "./tasks/SimpleTaskUngrouped01";
import {SimpleTaskUngrouped02} from "./tasks/SimpleTaskUngrouped02";
import {SimpleTaskError} from "./tasks/SimpleTaskError";
import {SimpleTaskWithRuntimeLog} from "./tasks/SimpleTaskWithRuntimeLog";
import {TestHelper} from "../TestHelper";

const stdMocks = require('std-mocks');

@suite('functional/tasks/tasks')
class TasksSpec {

  static before() {
    Log.reset();
    let i = new Invoker();
    Container.set(Invoker.NAME, i);
    i.register(TasksApi, []);
  }

  static after() {
    Container.reset();
  }


  @test
  async 'register simple tasks class and run'() {
    let tasks = new Tasks();
    let taskRef = tasks.addTask(SimpleTask);
    expect(taskRef.name).to.be.eq('simple_task');
    let runner = new TaskRunner(tasks, ['simple_task']);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
    let x = data.results.find(x => x.name == taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register simple tasks class with promise and run'() {
    let tasks = new Tasks();
    let taskRef = tasks.addTask(SimpleTaskPromise);
    expect(taskRef.name).to.be.eq('simple_task_promise');
    let runner = new TaskRunner(tasks, ['simple_task_promise']);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
    let x = data.results.find(x => x.name == taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register simple tasks where name will be generated'() {
    let tasks = new Tasks();
    let taskRef = tasks.addTask(SimpleTaskNoName);
    expect(taskRef.name).to.be.eq('simple_task_no_name');
    let runner = new TaskRunner(tasks, [taskRef.name]);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
    let x = data.results.find(x => x.name == taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register simple tasks instance with exec method and run'() {
    let tasks = new Tasks();
    let nn = new SimpleTaskInstance();
    let taskRef = tasks.addTask(nn);
    expect(taskRef.name).to.be.eq('simple_task_instance');
    let runner = new TaskRunner(tasks, [taskRef.name]);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
    let x = data.results.find(x => x.name == taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register function callback and run'() {
    let tasks = new Tasks();
    let taskRef = tasks.addTask('callback_task', function (done: Function) {
      done(null, 'test')
    });
    expect(taskRef.name).to.be.eq('callback_task');
    let runner = new TaskRunner(tasks, [taskRef.name]);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
    let x = data.results.find(x => x.name == taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register function callback and run as promise'() {
    let tasks = new Tasks();
    let taskRef = tasks.addTask('callback_task_async', async function () {
      return 'test';
    });
    expect(taskRef.name).to.be.eq('callback_task_async');
    let runner = new TaskRunner(tasks, [taskRef.name]);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
    let x = data.results.find(x => x.name == taskRef.name);
    expect(x.name).to.be.eq(taskRef.name);
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'register simple tasks class with arguments and run'() {
    let tasks = new Tasks();
    let taskRef = tasks.addTask(SimpleTaskWithArgs);
    expect(taskRef.name).to.be.eq('simple_task_with_args');
    expect(taskRef.getIncomings().map(x => x.name)).to.be.deep.eq(['incoming', 'list']);
    expect(taskRef.getIncomings().map(x => x.storingName)).to.be.deep.eq(['incoming', 'param_list']);

    let runner = new TaskRunner(tasks, ['simple_task_with_args']);
    let req = runner.getRequiredIncomings();
    expect(req.map(x => x.storingName)).to.be.deep.eq(['incoming', 'param_list']);

    await runner.setIncoming('incoming', 'is_incomed;)');
    await runner.setIncoming('param_list', ['one', 'two']);

    let data = await runner.run();
    expect(data.results).to.have.length(1);
    let res = data.results.shift();
    expect(res.incoming.incoming).to.be.eq('is_incomed;)');
    expect(res.incoming.list).to.be.deep.eq(['one', 'two']);
    expect(res.outgoing.outgoing).to.be.eq('is_incomed;)-test one;two');
    expect(res.result).to.be.eq('is_incomed;)-test one;two');
    expect(res.has_error).to.be.false;
    expect(res.error).to.be.null;
  }


  @test
  async 'grouped tasks without grouping task'() {
    let tasks = new Tasks();
    let group1 = tasks.addTask(GroupedTask1);
    let group2 = tasks.addTask(GroupedTask2);

    let runner = new TaskRunner(tasks, ['grouped']);
    let data = await runner.run();
    expect(data.results).to.have.length(3);
    let res = data.results.map(r => r.result).filter(f => f);
    expect(res).to.be.deep.eq(['grouped_1', 'grouped_2']);
  }


  @test
  async 'grouped tasks with a grouping task'() {
    let tasks = new Tasks();
    let grouping = tasks.addTask(GroupingTask);
    let group3 = tasks.addTask(GroupedTask3);
    let group4 = tasks.addTask(GroupedTask4);

    let runner = new TaskRunner(tasks, ['grouping']);
    let data = await runner.run();
    expect(data.results).to.have.length(3);
    let res = data.results.map(r => r.result).filter(f => f);
    expect(res).to.be.deep.eq(['grouping', 'grouped_3', 'grouped_4']);
  }


  @test
  async 'dependencies tasks'() {
    let tasks = new Tasks();
    let dependent = tasks.addTask(DependentTask);
    let depending = tasks.addTask(DependingTask);
    depending.dependsOn(dependent.name);
    expect(depending.dependencies()).to.be.deep.eq(['dependent']);

    let runner = new TaskRunner(tasks, [depending.name]);
    let data = await runner.run();
    expect(data.results).to.have.length(2);
    let res = data.results.find(r => r.name == depending.name);
    expect(res.result).to.deep.eq({new: 'data', test: 'true'});
  }


  @test
  async 'map task to new one (class-registered task)'() {
    const oldName = 'simple_task';
    const newName = 'copy_simple_task';

    let tasks = new Tasks();
    let taskRef = tasks.addTask(SimpleTask);
    expect(taskRef.name).to.be.eq(oldName);

    let copyTaskRef = tasks.taskMap(newName, oldName);
    expect(copyTaskRef.name).to.eq(newName);

    let c1 = taskRef.getClassRef();
    let c2 = copyTaskRef.getClassRef();
    expect(c1).to.eq(c2);

    let runner = new TaskRunner(tasks, [newName]);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
  }


  @test
  async 'map task to new one (instance-registered task)'() {
    const oldName = 'simple_task_instance';
    const newName = 'copy_simple_task_instance';
    let tasks = new Tasks();
    let nn = new SimpleTaskInstance();
    let taskRef = tasks.addTask(nn);
    expect(taskRef.name).to.be.eq(oldName);

    let copyTaskRef = tasks.taskMap(newName, oldName);
    expect(copyTaskRef.name).to.eq(newName);

    let c1 = taskRef.getClassRef();
    let c2 = copyTaskRef.getClassRef();
    // if instance is cloned then the classref is the same
    expect(c1).to.eq(c2);

    let runner = new TaskRunner(tasks, [newName]);
    let data = await runner.run();
    expect(data.results).to.have.length(1);

  }


  @test
  async 'map task to new one (callback-registered task)'() {
    const oldName = 'callback_test';
    const newName = 'copy_callback_test';
    let tasks = new Tasks();
    let taskRef = tasks.addTask(oldName, function (done: Function) {
      done(null, 'test')
    });
    expect(taskRef.name).to.be.eq(oldName);

    let copyTaskRef = tasks.taskMap(newName, oldName);
    expect(copyTaskRef.name).to.eq(newName);

    let c1 = taskRef.getClassRef();
    let c2 = copyTaskRef.getClassRef();
    expect(c1).to.eq(c2);

    let runner = new TaskRunner(tasks, [newName]);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
  }


  @test
  async 'map task group to new one'() {
    let tasks = new Tasks();
    let t1 = tasks.addTask(SimpleTaskUngrouped01);
    let t2 = tasks.addTask(SimpleTaskUngrouped02);

    t1.group('simple_group');
    t2.group('simple_group');

    let ref = tasks.taskMap('copy_simple_group', 'simple_group');
    expect(ref.name).to.eq('copy_simple_group');

    let groups = ref.grouping();
    expect(groups).to.deep.eq(['simple_task_ungrouped_01', 'simple_task_ungrouped_02']);

    let runner = new TaskRunner(tasks, ['simple_group']);
    let data = await runner.run();
    expect(data.results).to.have.length(3);

    runner = new TaskRunner(tasks, ['copy_simple_group']);
    data = await runner.run();
    expect(data.results).to.have.length(3);
  }


  @test
  async 'runtime error in (class-registered task)'() {
    let tasks = new Tasks();
    let taskRef = tasks.addTask(SimpleTaskError);

    let runner = new TaskRunner(tasks, [taskRef.name]);
    let data = await runner.run();
    expect(data.results).to.have.length(1);
    expect(_.find(data.results, x => x.has_error)).exist;
  }


  @test
  async 'own task logger'() {

    let tasks = new Tasks();
    let taskRef = tasks.addTask(SimpleTaskWithRuntimeLog);
    stdMocks.use();
    let runner = new TaskRunner(tasks, [taskRef.name]);
    runner.getLogger().info('extern use ;)');
    await TestHelper.wait(50);
    let logFile = runner.getLogFile();
    expect(fs.existsSync(logFile)).to.be.true;

    let x: any[] = [];
    let reader = runner.getReadStream();
    reader.on('data', (data: any) => {
      x = x.concat(data.toString().split('\n').filter((x: string) => !_.isEmpty(x)));
    });

    let p = new Promise((resolve, reject) => {
      reader.on('end', resolve);
    });

    let data = await runner.run();
    stdMocks.restore();
    let content = stdMocks.flush();
    expect(content.stdout).to.have.length(5);

    //let cNewLogger = content.stdout.shift();
    //expect(cNewLogger).to.contain('[DEBUG]   create new logger task-runner-');
    let cLogExec = content.stdout.shift();
    expect(cLogExec).to.contain('[INFO]   Log execution of tasks:\n[\n  "simple_task_with_runtime_log"\n]');
    let cLogExtern = content.stdout.shift();
    expect(cLogExtern).to.contain('[INFO]   extern use ;)\n');
    let cLogTaskInfo = content.stdout.shift();
    expect(cLogTaskInfo).to.match(/:simple_task_with_runtime_log:\d+ \[INFO\]   doing something/);
    let cLogTaskWarn = content.stdout.shift();
    expect(cLogTaskWarn).to.match(/:simple_task_with_runtime_log:\d+ \[WARN\]   doing something wrong/);
    let cLogTaskError = content.stdout.shift();
    expect(cLogTaskError).to.match(/:simple_task_with_runtime_log:\d+ \[ERROR\]  doing something wrong\nnewline/);

    // runn
    await p;

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


  @test.skip
  async 'task status pub/sub'() {
  }


  @test.skip
  async 'add remote task '() {
  }


}

