import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import * as _ from "lodash";
import {inspect} from "util";

import {Log, TaskRunner, Tasks, TreeUtils, WalkValues} from "../../../src";
import {Container} from "typedi";
import {SimpleTask} from "./tasks/SimpleTask";
import {SimpleTaskPromise} from "./tasks/SimpleTaskPromise";
import {SimpleTaskWithArgs} from "./tasks/SimpleTaskWithArgs";



@suite('functional/tasks_worker')
class Tasks_workerSpec {

  static before() {
    Log.options({level: 'debug', enable: true});
    let tasks = new Tasks();
    // no prepare using
    Container.set(Tasks.NAME, tasks);
  }

}

