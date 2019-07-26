import * as _ from 'lodash';
import {TaskRef} from './TaskRef';
import {TaskExchangeRef} from './TaskExchangeRef';
import {ClassLoader, PlatformUtils} from 'commons-base';
import {Config} from 'commons-config';
import {ITaskRunnerOptions} from './ITaskRunnerOptions';
import {Container} from 'typedi';
import {TaskExecutionRequestFactory} from './worker/TaskExecutionRequestFactory';
import {ITaskExec} from './ITaskExec';
import {K_CLS_TASKS, TASK_RUNNER_SPEC} from './Constants';
import {RuntimeLoader} from '../../base/RuntimeLoader';
import {Tasks} from './Tasks';
import {Log} from '../logging/Log';
import {TaskRunner} from './TaskRunner';


export class TasksHelper {

  static getRequiredIncomings(tasks: TaskRef[], withoutPassThrough: boolean = false): TaskExchangeRef[] {
    const incoming: TaskExchangeRef[] = [];
    tasks.map(t => {
      t.getIncomings().map(x => {
        incoming.push(x);
      });
      if (!withoutPassThrough) {
        t.getOutgoings().map(x => {
          _.remove(incoming, i => i.storingName === x.storingName);
        });
      }
    });
    return incoming;
  }


  static prepare(tasks: Tasks, loader: RuntimeLoader) {
    const klasses = loader.getClasses(K_CLS_TASKS);
    for (const klass of klasses) {
      const task = Reflect.construct(klass, []);
      if (!('name' in task) || !_.isFunction(task['exec'])) {
        throw new Error('task ' + klass + ' has no name');
      }
      tasks.addTask(klass);
    }
  }


  static async addClasses(tasks: Tasks, dir: string) {
    const klazzes = await ClassLoader.importClassesFromDirectoriesAsync([dir]);
    for (const klass of klazzes) {
      const task = Reflect.construct(klass, []);
      if (!('name' in task) || !_.isFunction(task['exec'])) {
        throw new Error('task ' + klass + ' has no name');
      }
      tasks.addTask(klass);
    }
  }


  static runner(tasks: Tasks, name: TASK_RUNNER_SPEC | TASK_RUNNER_SPEC[], options: ITaskRunnerOptions) {
    if (_.isArray(name)) {
      const names = [];
      for (let i = 0; i < name.length; i++) {
        const def = name[i];
        let taskName = null;
        if (_.isString(def)) {
          taskName = def;
        } else if (def.name) {
          taskName = def.name;
        } else {
          throw new Error('unknown def');
        }
        if (!tasks.contains(taskName)) {
          throw new Error('task ' + taskName + ' not exists');
        }
        names.push(def);
      }
      return new TaskRunner(tasks, names, options);
    } else {
      let taskName = null;
      if (_.isString(name)) {
        taskName = name;
      } else if (name.name) {
        taskName = name.name;
      } else {
        throw new Error('unknown def');
      }

      if (tasks.contains(taskName)) {
        return new TaskRunner(tasks, [name], options);
      }
    }
    throw new Error('task ' + name + ' not exists');
  }


  static getTaskLogFile(runnerId: string, nodeId: string) {
    const logdir = Config.get('tasks.logdir', Config.get('os.tmpdir'));
    return PlatformUtils.join(logdir, 'taskmonitor-' + runnerId + '-' + nodeId + '.log');
  }

  static getTaskNames(taskSpec: TASK_RUNNER_SPEC[]) {
    return taskSpec.map(x => _.isString(x) ? x : x.name);
  }


  static async exec(taskSpec: TASK_RUNNER_SPEC[], argv: ITaskExec) {
    // check nodes for tasks
    if (!_.isArray(taskSpec) || _.isEmpty(taskSpec)) {
      throw new Error('no task definition found');
    }

    const taskNames = this.getTaskNames(taskSpec);
    const tasksReg: Tasks = Container.get(Tasks.NAME);
    const tasks = tasksReg.getTasks(taskNames);
    const targetId = _.get(argv, 'targetId', null);
    let isLocal = _.get(argv, 'isLocal', true);
    const isRemote = _.get(argv, 'remote', false);
    const skipTargetCheck = _.get(argv, 'skipTargetCheck', false);

    if (targetId === null && !isRemote) {
      isLocal = true;
    } else {
      isLocal = false;
    }

    // const tasksForWorkers = tasks.filter(t => t.hasWorker() && (targetId === null || (targetId && t.hasTargetNodeId(targetId))));
    // const remotePossible = tasks.length === tasksForWorkers.length;
    const localPossible = _.uniq(taskNames).length === tasks.length;

    if (!isLocal) {

      // if (remotePossible) {
      //   // all tasks can be send to workers
      //   // execute

      Log.debug('task command: before request fire');
      const execReq = Container.get(TaskExecutionRequestFactory).createRequest();
      const results = await execReq.run(taskSpec, argv, {targetIds: targetId ? [targetId] : [], skipTargetCheck: skipTargetCheck});
      Log.debug('task command: event enqueue results', results);
      return results;
      // } else {
      //   // there are no worker running!
      //   Log.error('There are no worker running for tasks: ' + taskNames.join(', '));
      // }
    } else if (isLocal) {

      if (localPossible) {
        const options: any = {
          parallel: 5,
          dry_mode: _.get(argv, 'dry-mode', false),
          local: true
        };

        // add parameters
        const parameters: any = {};
        _.keys(argv).map(k => {
          if (!/^_/.test(k)) {
            parameters[_.snakeCase(k)] = argv[k];
          }
        });

        // validate arguments
        const props = TasksHelper.getRequiredIncomings(taskSpec.map(x => _.isString(x) ? x : x.name).map(t => tasksReg.get(t)));
        if (props.length > 0) {
          for (const p of props) {
            if (!_.has(parameters, p.storingName) && !_.has(parameters, p.name)) {
              if (p.isOptional()) {
                Log.warn('task command: optional parameter "' + p.name + '" for ' + taskSpec.join(', ') + ' not found');
              } else {
                // TODO parameter maybe passed by incomings?
                if (_.has(argv, 'skipRequiredThrow') && argv.skipRequiredThrow) {
                  Log.warn('task command: required parameter "' + p.name + '" for ' + taskSpec.join(', ') + ' not found.');
                } else {
                  throw new Error('The required value is not passed');
                }
              }
            }
          }
        }

        const runner = TasksHelper.runner(tasksReg, taskSpec, options);
        for (const p in parameters) {
          if (parameters.hasOwnProperty(p)) {
            await runner.setIncoming(p, parameters[p]);
          }
        }
        try {
          const results = await runner.run();
          return results;
        } catch (err) {
          Log.error(err);
        }
      } else {
        Log.error('There are no tasks: ' + taskSpec.join(', '));
      }
    }
    return null;
  }

}
