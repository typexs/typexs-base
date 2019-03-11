import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import { TaskRunner, Tasks} from "../../../src";
import {Log} from "../../../src/libs/logging/Log";
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


@suite('functional/tasks/tasks')
class TasksSpec {



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
    let nn = new SimpleTaskInstance()
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
    expect(res).to.be.deep.eq(['grouped_3', 'grouped_4', 'grouping']);
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

  @test.skip
  async 'own task logger'() {
  }

  @test.skip
  async 'task status pub/sub'() {
  }

  @test.skip
  async 'add remote task '() {
  }

  @test.skip
  async 'task runtime error'() {
  }

  @test.skip
  async 'map task to new one'() {
  }

  @test.skip
  async 'map task group to new one'() {
  }

}

