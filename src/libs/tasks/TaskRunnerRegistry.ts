/**
 * Registers all running tasks in the local node
 */
import * as _ from 'lodash';
import {TaskRunner} from './TaskRunner';
import {TASKRUN_STATE_FINISHED} from './Constants';
import {Counters} from "../..";

/**
 * Node specific registry for TaskRunner which is initalized as singleton in Activator.
 */
export class TaskRunnerRegistry {

  static NAME = TaskRunnerRegistry.name;

  private runners: TaskRunner[] = [];


  /**
   * Add a runner mostly on startup
   */
  addRunner(runner: TaskRunner) {
    const runnerNr = runner.nr;
    if (!this.runners.find(x => x.nr === runnerNr)) {
      this.runners.push(runner);
      runner.once(TASKRUN_STATE_FINISHED, () => {
        _.remove(this.runners, x => x.nr === runnerNr);
      });
    }
  }


  /**
   * Check if tasks with name or names are running
   */
  hasRunningTasks(taskNames: string | string[]) {
    if (_.isString(taskNames)) {
      taskNames = [taskNames];
    }
    const intersect = _.intersection(taskNames, _.concat([], ...this.getRunningTasks().map(x => x.taskNames)));
    return intersect.length === taskNames.length;
  }


  /**
   * Returns the currently running runnerIds with the taskNames
   */
  getRunningTasks(): { id: string, taskNames: string[] }[] {
    const results: { id: string, taskNames: string[] }[] = [];
    this.runners.forEach(x => {
      results.push({id: x.id, taskNames: x.getTaskNames()});
    });
    return results;
  }


  getTaskCounts(taskNames: string | string[]) {
    if (_.isString(taskNames)) {
      taskNames = [taskNames];
    }
    const stats = new Counters();
    this.runners.forEach(x => {
      x.getTaskNames().filter(y => taskNames.includes(y)).forEach(y => stats.get(y).inc());
    });
    return stats.asObject();
  }

  /**
   * Return the runners variable
   */
  getRunners() {
    return this.runners;
  }


}
