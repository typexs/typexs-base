import * as _ from 'lodash';
import {TaskRef} from './TaskRef';
import {TaskExchangeRef} from './TaskExchangeRef';
import {K_CLS_TASKS, Log, RuntimeLoader, TaskRunner, Tasks} from '../..';
import {ClassLoader, PlatformUtils} from 'commons-base';
import {Config} from 'commons-config';
import {ITaskRunnerOptions} from './ITaskRunnerOptions';
import {Container} from 'typedi';
import {TaskExecutionRequestFactory} from './worker/TaskExecutionRequestFactory';
import {ITaskExec} from './ITaskExec';


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


  static runner(tasks: Tasks, name: string | string[], options: ITaskRunnerOptions) {
    if (_.isArray(name)) {
      const names = [];
      for (let i = 0; i < name.length; i++) {
        if (!tasks.contains(name[i])) {
          throw new Error('task ' + name[i] + ' not exists');
        }
        names.push(name[i]);
      }
      return new TaskRunner(tasks, names, options);
    } else {
      if (tasks.contains(name)) {
        return new TaskRunner(tasks, [name], options);
      }
    }
    throw new Error('task ' + name + ' not exists');
  }


  static getTaskLogFile(runnerId: string, nodeId: string) {
    const logdir = Config.get('tasks.logdir', Config.get('os.tmpdir'));
    return PlatformUtils.join(logdir, 'taskmonitor-' + runnerId + '-' + nodeId + '.log');
  }


  static async exec(taskNames: string[], argv: ITaskExec) {
    // check nodes for tasks
    const tasksReg: Tasks = Container.get(Tasks.NAME);
    const tasks = tasksReg.getTasks(taskNames);
    const targetId = _.get(argv, 'targetId', null);
    let isLocal = _.get(argv, 'isLocal', true);
    const isRemote = _.get(argv, 'remote', false);

    if (targetId === null && !isRemote) {
      isLocal = true;
    } else {
      isLocal = false;
    }

    const tasksForWorkers = tasks.filter(t => t.hasWorker() && (targetId === null || (targetId && t.hasTargetNodeId(targetId))));
    const remotePossible = tasks.length === tasksForWorkers.length;
    const localPossible = taskNames.length === tasks.length;

    if (!isLocal) {

      if (remotePossible) {
        // all tasks can be send to workers
        // execute

        Log.debug('task command: before request fire');
        const execReq = Container.get(TaskExecutionRequestFactory).createRequest();
        const results = await execReq.run(taskNames, argv, targetId ? [targetId] : []);
        Log.debug('task command: event enqueue results', results);
        return results;
      } else {
        // there are no worker running!
        Log.error('There are no worker running for tasks: ' + taskNames.join(', '));
      }
    } else if (isLocal) {

      if (localPossible) {
        const options: any = {
          parallel: 5,
          dry_mode: _.get(argv, 'dry-mode', false)
        };

        // add parameters
        const parameters: any = {};
        _.keys(argv).map(k => {
          if (!/^_/.test(k)) {
            parameters[_.snakeCase(k)] = argv[k];
          }
        });

        // validate arguments
        const props = TasksHelper.getRequiredIncomings(taskNames.map(t => tasksReg.get(t)));
        if (props.length > 0) {
          for (const p of props) {
            if (!_.has(parameters, p.storingName) && !_.has(parameters, p.name)) {
              if (p.isOptional()) {
                Log.warn('task command: optional parameter "' + p.name + '" for ' + taskNames.join(', ') + ' not found');
              } else {
                throw new Error('The required value is not passed');
              }
            }
          }
        }

        const runner = TasksHelper.runner(tasksReg, taskNames, options);
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
        Log.error('There are no tasks: ' + taskNames.join(', '));
      }
    }
    return null;
  }

}
