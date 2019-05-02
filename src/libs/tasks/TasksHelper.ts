import * as _ from "lodash";
import {TaskRef} from "./TaskRef";
import {TaskExchangeRef} from "./TaskExchangeRef";
import {Console, K_CLS_TASKS, Log, RuntimeLoader, TaskRunner, Tasks} from "../..";
import {ClassLoader, PlatformUtils} from "commons-base";
import {Config} from "commons-config";
import {ITaskRunnerOptions} from "./ITaskRunnerOptions";
import {Container} from "typedi";
import {TaskExecutionRequestFactory} from "./worker/TaskExecutionRequestFactory";


export interface ITaskExec {
  targetId?: string;
  isLocal?: boolean;
  remote?: boolean;

  [k: string]: any;
}

export class TasksHelper {

  static getRequiredIncomings(tasks: TaskRef[], withoutPassThrough: boolean = false): TaskExchangeRef[] {
    let incoming: TaskExchangeRef[] = [];
    tasks.map(t => {
      t.getIncomings().map(x => {
        incoming.push(x);
      });
      if (!withoutPassThrough) {
        t.getOutgoings().map(x => {
          _.remove(incoming, i => i.storingName == x.storingName)
        });
      }
    });
    return incoming;
  }


  static prepare(tasks: Tasks, loader: RuntimeLoader) {
    let klasses = loader.getClasses(K_CLS_TASKS);
    for (let klass of klasses) {
      let task = Reflect.construct(klass, []);
      if (!('name' in task) || !_.isFunction(task['exec'])) throw new Error('task ' + klass + ' has no name');
      tasks.addTask(klass);
    }
  }


  static async addClasses(tasks: Tasks, dir: string) {
    let klazzes = await ClassLoader.importClassesFromDirectoriesAsync([dir]);
    for (let klass of klazzes) {
      let task = Reflect.construct(klass, []);
      if (!('name' in task) || !_.isFunction(task['exec'])) throw new Error('task ' + klass + ' has no name');
      tasks.addTask(klass);
    }
  }


  static runner(tasks: Tasks, name: string | string[], options: ITaskRunnerOptions) {
    if (_.isArray(name)) {
      let names = [];
      for (let i = 0; i < name.length; i++) {
        if (!tasks.contains(name[i])) {
          throw new Error('task ' + name[i] + ' not exists')
        }
        names.push(name[i]);
      }
      return new TaskRunner(tasks, names, options);
    } else {
      if (tasks.contains(name)) {
        return new TaskRunner(tasks, [name], options);
      }
    }
    throw new Error('task ' + name + ' not exists')
  }


  static getTaskLogFile(runnerId: string, nodeId: string) {
    const logdir = Config.get('tasks.logdir', Config.get('os.tmpdir'));
    return PlatformUtils.join(logdir, 'taskmonitor-' + runnerId + '-' + nodeId + '.log');
  }


  static async exec(taskNames: string[], argv: ITaskExec) {
    // check nodes for tasks
    let tasksReg: Tasks = Container.get(Tasks.NAME);
    let tasks = tasksReg.getTasks(taskNames);
    let targetId = _.get(argv, 'targetId', null);
    let isLocal = _.get(argv, 'isLocal', true);
    let isRemote = _.get(argv, 'remote', false);

    if (targetId == null && !isRemote) {
      isLocal = true;
    } else {
      isLocal = false;
    }

    let tasksForWorkers = tasks.filter(t => t.hasWorker() && (targetId == null || (targetId && t.hasTargetNodeId(targetId))));
    let remotePossible = tasks.length == tasksForWorkers.length;
    let localPossible = taskNames.length == tasks.length;

    if (!isLocal) {

      if (remotePossible) {
        // all tasks can be send to workers
        // execute

        Log.debug('task command: before request fire');
        let execReq = Container.get(TaskExecutionRequestFactory).createRequest();
        let results = await execReq.run(taskNames, argv, targetId ? [targetId] : []);
        Log.debug('task command: event enqueue results', results);
        return results;
      } else {
        // there are no worker running!
        Log.error('There are no worker running for tasks: ' + taskNames.join(', '));
      }
    } else if (isLocal) {

      if (localPossible) {
        let options: any = {
          parallel: 5,
          dry_mode: _.get(argv, 'dry-mode', false)
        };

        // add parameters
        let parameters: any = {};
        _.keys(argv).map(k => {
          if (!/^_/.test(k)) {
            parameters[_.snakeCase(k)] = argv[k];
          }
        });

        // validate arguments
        let props = TasksHelper.getRequiredIncomings(taskNames.map(t => tasksReg.get(t)));
        if (props.length > 0) {
          for (let p of props) {
            if (!_.has(parameters, p.storingName) && !_.has(parameters, p.name)) {
              if (p.isOptional()) {
                Log.warn('task command: optional parameter "' + p.name + '" for ' + taskNames.join(', ') + ' not found')
              } else {
                throw new Error('The required value is not passed');
              }
            }
          }
        }

        let runner = TasksHelper.runner(tasksReg, taskNames, options);
        for (let p in parameters) {
          await runner.setIncoming(p, parameters[p]);
        }
        try {
          let results = await runner.run();
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
