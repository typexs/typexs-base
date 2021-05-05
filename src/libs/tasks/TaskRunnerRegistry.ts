/**
 * Registers all running tasks in the local node
 */
import * as _ from 'lodash';
import {TaskRunner} from './TaskRunner';
import {TASK_RUNNER_SPEC, TASKRUN_STATE_FINISHED} from './Constants';
import {Counters} from '../helper/Counters';
import {ITaskRunnerOptions} from './ITaskRunnerOptions';
import {Tasks} from './Tasks';
import {Inject} from 'typedi';
import {TaskRunnerEvent} from './TaskRunnerEvent';
import {EventBus, subscribe} from 'commons-eventbus';
import {ITaskRunnerStatus} from './ITaskRunnerStatus';
import {SystemNodeInfo} from '../../entities/SystemNodeInfo';
import {Log} from '../../libs/logging/Log';

/**
 * Node specific registry for TaskRunner which is initalized as singleton in Activator.
 */
export class TaskRunnerRegistry {

  public static NAME = TaskRunnerRegistry.name;

  @Inject(Tasks.NAME)
  tasks: Tasks;

  private localTaskRunner: TaskRunner[] = [];

  private globalTaskRunner: ITaskRunnerStatus[] = [];


  async onStartup() {
    await EventBus.register(this);
  }

  async onShutdown() {
    await EventBus.unregister(this);
  }

  @subscribe(TaskRunnerEvent)
  onTaskRunnerEvent(event: TaskRunnerEvent) {
    Log.debug('task runner event: ' + event.state + ' ' + event.id + ' ' + event.nodeId);
    if (['stopped', 'errored', 'request_error'].includes(event.state)) {
      _.remove(this.globalTaskRunner, x => x.id === event.id);
    } else {
      const found = this.globalTaskRunner.find(x => x.id === event.id);
      if (found) {
        _.assign(found, event);
      } else {
        this.globalTaskRunner.push(event);
      }
    }
  }

  /**
   * Called by TaskSystemExtension
   *
   * @param nodeInfo
   */
  onNodeUpdate(nodeInfo: SystemNodeInfo) {
    if (nodeInfo.state === 'register' || nodeInfo.state === 'unregister') {
      _.remove(this.globalTaskRunner, x => x.nodeId === nodeInfo.nodeId);
    }
  }


  /**
   * Add a runner mostly on startup
   */
  addRunner(runner: TaskRunner) {
    const runnerNr = runner.nr;
    if (!this.localTaskRunner.find(x => x.nr === runnerNr)) {
      this.localTaskRunner.push(runner);
      runner.once(TASKRUN_STATE_FINISHED, () => {
        _.remove(this.localTaskRunner, x => x.nr === runnerNr);
      });
    }
  }

  /**
   * Create new runner
   *
   * @param names
   * @param options
   */
  createNewRunner(names: TASK_RUNNER_SPEC[], options: ITaskRunnerOptions = null) {
    options.skipRegistryAddition = true;
    const runner = new TaskRunner(this.tasks, names, options);
    this.addRunner(runner);
    return runner;
  }


  /**
   * Check if tasks with name or names are running
   */
  hasRunnerForTasks(taskNames: string | string[]) {
    if (_.isString(taskNames)) {
      taskNames = [taskNames];
    }
    const intersect = _.intersection(taskNames, _.concat([], ...this.localTaskRunner.map(x => x.getTaskNames())));
    return intersect.length === taskNames.length;
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
  getRunningTasks(): ITaskRunnerStatus[] {
    return _.cloneDeep(this.globalTaskRunner);
  }

  /**
   * Count local active tasks
   *
   * @param taskNames
   */
  getLocalTaskCounts(taskNames: string | string[]) {
    if (_.isString(taskNames)) {
      taskNames = [taskNames];
    }
    const counters = new Counters();
    this.localTaskRunner.forEach(x => {
      x.getTaskNames().filter(y => taskNames.includes(y)).forEach(y => counters.get(y).inc());
    });
    return counters.asObject();
  }

  /**
   * Count local active tasks
   *
   * @param taskNames
   */
  getGlobalTaskCounts(taskNames: string | string[]) {
    if (_.isString(taskNames)) {
      taskNames = [taskNames];
    }
    const counters = new Counters();
    this.globalTaskRunner.forEach(x => {
      x.taskNames.filter(y => taskNames.includes(y)).forEach(y => counters.get(y).inc());
    });
    return counters.asObject();
  }

  /**
   * Return the runners variable
   */
  getRunners() {
    return this.localTaskRunner;
  }


}
