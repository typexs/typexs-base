import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Log, TaskRunner, Tasks} from "../../../src";
import {Container} from "typedi";
import {SimpleTask} from "./tasks/SimpleTask";
import {SimpleTaskPromise} from "./tasks/SimpleTaskPromise";
import {SimpleTaskWithArgs} from "./tasks/SimpleTaskWithArgs";


@suite('functional/tasks')
class TasksSpec {

  static before() {
    Log.options({level: 'debug', enable: true});
    let tasks = new Tasks();
    // no prepare using
    Container.set(Tasks.NAME, tasks);
  }


  @test
  async 'register simple tasks class and run'() {
    let tasks: Tasks = Container.get(Tasks.NAME);
    let taskRef = tasks.addTask(SimpleTask);
    expect(taskRef.name).to.be.eq('simple_task');
    let runner = new TaskRunner(tasks, ['simple_task']);
    let data = await runner.run();
    //expect(data.results);
    console.log(data);
  }


  @test
  async 'register simple tasks class with promise and run'() {
    let tasks: Tasks = Container.get(Tasks.NAME);
    let taskRef = tasks.addTask(SimpleTaskPromise);
    expect(taskRef.name).to.be.eq('simple_task_promise');
    let runner = new TaskRunner(tasks, ['simple_task_promise']);
    let data = await runner.run();
    // expect(data.results);
    console.log(data);
  }

  @test.skip
  async 'own task logger'() {
  }


  @test.skip
  async 'register simple tasks where name will be generated'() {
  }

  @test.skip
  async 'register simple tasks instance with exec method and run'() {
  }

  @test.skip
  async 'register function callback and run'() {
  }


  @test
  async 'register simple tasks class with arguments and run'() {
    let tasks: Tasks = Container.get(Tasks.NAME);
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


  @test.skip
  async 'map task to new one'() {
  }

  @test.skip
  async 'group tasks'() {
  }


  @test.skip
  async 'dependencies tasks'() {
  }
}

