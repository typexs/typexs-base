import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import * as _ from "lodash";
import {inspect} from "util";

import {Log, TaskRunner, Tasks, TreeUtils, WalkValues} from "../../../src";
import {Container} from "typedi";
import {SimpleTask} from "./tasks/SimpleTask";
import {SimpleTaskPromise} from "./tasks/SimpleTaskPromise";
import {SimpleTaskWithArgs} from "./tasks/SimpleTaskWithArgs";

@suite('functional/tasks')
class TasksSpec {

  static before() {
    Log.options({level:'debug',enable:true});
    let tasks = new Tasks();
    // no prepare using
    Container.set(Tasks.NAME,tasks);
  }


  @test
  async 'register simple tasks class and run'() {
    let tasks:Tasks = Container.get(Tasks.NAME);
    let taskRef = tasks.addTask(SimpleTask);
    expect(taskRef.name).to.be.eq('simple_task');
    let runner = new TaskRunner(tasks,['simple_task']);
    let data = await runner.run();
    //expect(data.results);
    console.log(data);
  }


  @test
  async 'register simple tasks class with promise and run'() {
    let tasks:Tasks = Container.get(Tasks.NAME);
    let taskRef = tasks.addTask(SimpleTaskPromise);
    expect(taskRef.name).to.be.eq('simple_task_promise');
    let runner = new TaskRunner(tasks,['simple_task_promise']);
    let data = await runner.run();
    //expect(data.results);
    console.log(data);
  }


  @test
  async 'register simple tasks class with arguments and run'() {
    let tasks:Tasks = Container.get(Tasks.NAME);
    let taskRef = tasks.addTask(SimpleTaskWithArgs);
    expect(taskRef.name).to.be.eq('simple_task_with_args');

    expect(taskRef.getIncomings().map(x => x.name)).to.be.deep.eq(['incoming']);

    let runner = new TaskRunner(tasks,['simple_task_with_args']);
    runner.setIncoming('incoming','is_incomed;)');
    let data = await runner.run();
    //expect(data.results);
    console.log(inspect(data,false,10));
  }

}

