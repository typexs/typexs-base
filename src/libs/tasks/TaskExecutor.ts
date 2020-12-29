import {Inject} from 'typedi';
import {Tasks} from './Tasks';
import {TaskRunnerRegistry} from './TaskRunnerRegistry';
import {TASK_RUNNER_SPEC} from './Constants';
import {ITaskExectorOptions} from './ITaskExectorOptions';
import * as _ from 'lodash';
import {ILoggerApi} from '../../libs/logging/ILoggerApi';
import {Log} from '../../libs/logging/Log';
import {TaskRequestFactory} from './worker/TaskRequestFactory';
import {TasksHelper} from './TasksHelper';
import {EventEmitter} from 'events';
import {ITaskRunnerOptions} from './ITaskRunnerOptions';
import {TaskEvent} from './worker/TaskEvent';
import {EventBus, subscribe, unsubscribe} from 'commons-eventbus';
import {TaskFuture} from './worker/execute/TaskFuture';
import {ITaskRunnerResult} from './ITaskRunnerResult';
import {IError} from '../exceptions/IError';
import {Bootstrap} from '../../Bootstrap';

/**
 * Class controlling local or remote tasks execution.
 *
 * Initialize by
 * ```
 * const executor = Injector.create(TaskExecutor);
 * ```
 *
 * Tasks can be called by name or by task specs.
 *
 */

const DEFAULT_TASK_EXEC: ITaskExectorOptions = {
  skipTargetCheck: false,
  executionConcurrency: null,
  skipRequiredThrow: false,
  skipThrow: false,
  targetId: null,
  targetIds: null,
  isLocal: true,
  remote: false,
  executeOnMultipleNodes: 1,
  randomRemoteNodeSelection: true,
  waitForRemoteResults: true,
  timeout: 5000
};

const TASK_PREFIX = 'task_done_';

// TODO Arguments from incoming!!!
export class TaskExecutor extends EventEmitter {

  private executeable: boolean = true;

  private options: ITaskExectorOptions;

  private passedOptions: ITaskExectorOptions = {};

  private params: any;

  private spec: TASK_RUNNER_SPEC[];

  private taskNames: string[];

  private targetIds: string[];


  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(TaskRunnerRegistry.NAME)
  taskRunnerRegistry: TaskRunnerRegistry;

  @Inject(() => TaskRequestFactory)
  requestFactory: TaskRequestFactory;

  constructor() {
    super();
  }

  logger: ILoggerApi = Log.getLoggerFor(TaskExecutor);

  setOptions(options: ITaskExectorOptions) {
    const _opts = options || {skipTargetCheck: false};
    this.passedOptions = _.clone(_opts);
    this.options = _opts;
    _.defaults(this.options, DEFAULT_TASK_EXEC);
  }

  /**
   * Executeable
   */
  isExecuteable() {
    return this.executeable;
  }

  /**
   * Initialize the task executor
   *
   * @param taskSpec
   * @param _argv
   */
  create(taskSpec: TASK_RUNNER_SPEC[], param: any = {}, _argv: ITaskExectorOptions) {
    // check nodes for tasks
    if (!_.isArray(taskSpec) || _.isEmpty(taskSpec)) {
      throw new Error('no task definition found');
    }
    this.params = param;

    this.spec = taskSpec;
    this.setOptions(_argv);

    this.taskNames = TasksHelper.getTaskNames(taskSpec);


    if (this.options.targetId && !this.options.remote) {
      this.targetIds = [this.options.targetId];
      this.options.isLocal = false;
      this.options.remote = true;
    } else if (this.options.targetIds && !this.options.remote) {
      this.targetIds = this.options.targetIds;
      this.options.isLocal = false;
      this.options.remote = true;
    } else if (this.options.remote) {
      this.options.isLocal = false;
    } else {

      const nodeId = Bootstrap.getNodeId();
      const tasks = this.tasks.getTasks(this.taskNames);
      if (_.isUndefined(this.passedOptions.isLocal)) {
        // when isLocal is not set manuell
        this.options.remote = false;
        this.options.isLocal = true;
        const taskRef = tasks.find(x => !!x.nodeInfos.find(x => x.nodeId === nodeId));
        if (taskRef) {
          // found local reference look if
          const taskRefNodeInfo = taskRef.nodeInfos.find(x => x.nodeId === nodeId);
          if (taskRefNodeInfo && taskRefNodeInfo.hasWorker) {
            // local worker is running
            this.options.isLocal = false;
            this.targetIds = [nodeId];
          }
        } else {
          // try remote lookup
          this.options.remote = true;
          this.options.isLocal = false;
        }
      } else {
        this.options.remote = false;
        this.options.isLocal = true;
      }
    }


    if (this.options.executionConcurrency) {
      if (this.options.executionConcurrency !== 0) {

        const counts = this.options.isLocal ?
          this.taskRunnerRegistry.getLocalTaskCounts(this.taskNames) :
          this.taskRunnerRegistry.getGlobalTaskCounts(this.taskNames)
        ;
        if (!_.isEmpty(counts)) {
          const max = _.max(_.values(counts));
          if (max >= this.options.executionConcurrency) {
            this.logger.warn(
              `task command: ` +
              `maximal concurrent process of ${this.taskNames} reached (${max} < ${this.options.executionConcurrency}).`);
            this.executeable = false;
          }
        }
      }
    }

    return this;
  }


  async run(asFuture: boolean = false): Promise<ITaskRunnerResult | ITaskRunnerResult[] | TaskFuture | TaskEvent[]> {
    if (!this.executeable) {
      return null;
    }
    if (!this.options.isLocal) {
      return this.executeOnWorker(asFuture);
    } else {
      return this.executeLocally();
    }
  }

  /**
   * Task will be executed locally
   */
  async executeLocally() {
    const tasks = this.tasks.getTasks(this.taskNames);
    const localPossible = _.uniq(this.taskNames).length === tasks.length;

    if (localPossible) {
      const options: ITaskRunnerOptions = {
        parallel: 5,
        dryMode: _.get(this.options, 'dry-outputMode', false),
        local: true,
      };

      // add parameters
      const parameters: any = {};
      _.keys(this.params).map(k => {
        // TODO why this check?
        if (!/^_/.test(k)) {
          parameters[_.snakeCase(k)] = this.params[k];
        }
      });

      const runner = TasksHelper.runner(this.tasks, this.spec, options);
      for (const p in parameters) {
        if (parameters.hasOwnProperty(p)) {
          await runner.setIncoming(p, parameters[p]);
        }
      }
      return runner.run();
    } else {
      this.logger.error('There are no tasks: ' + this.spec.join(', '));
    }
    return null;
  }


  async executeOnWorker(asFuture: boolean = false) {
    this.logger.debug(this.taskNames + ' before request fire');
    let execReq = this.requestFactory.executeRequest();
    const options = _.clone(this.options);
    if (this.targetIds) {
      options.targetIds = this.targetIds;
    }
    execReq = execReq.create(
      this.spec,
      this.params,
      options
    );
    let future: TaskFuture = null;
    if (this.options.waitForRemoteResults) {
      future = await execReq.future();
    }

    const enqueueEvents = await execReq.run();
    if (enqueueEvents && enqueueEvents.length === 0) {
      // ERROR!!! NO RESPONSE
      throw new Error('no enqueue responses arrived');
    } else if (enqueueEvents && enqueueEvents.length > 0) {
      if (enqueueEvents[0].state === 'request_error') {
        if (_.isArray(enqueueEvents[0].errors) && enqueueEvents[0].errors.length > 0) {
          if (future) {
            await future.close();
          }
          if (!options.skipThrow) {
            enqueueEvents[0].errors.forEach((x: IError) => {
              throw new Error(x.message + '' + (x.data ? ' data: ' + JSON.stringify(x.data) : ''));
            });
          }
          return enqueueEvents;
        }


      }
    }

    if (future) {
      if (asFuture) {
        return future;
      }
      return future.await();
    }
    return enqueueEvents;
  }


  async register() {
    if (this.options.waitForRemoteResults) {
      subscribe(TaskEvent)(this, 'onTaskEvent');
      await EventBus.register(this);
    }
  }

  async unregister() {
    try {
      await EventBus.unregister(this);
      unsubscribe(this, TaskEvent, 'onTaskEvent');
    } catch (e) {

    }
  }
}
