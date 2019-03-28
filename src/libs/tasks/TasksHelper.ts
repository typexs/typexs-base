import * as _ from "lodash";
import {TaskRef} from "./TaskRef";
import {TaskExchangeRef} from "./TaskExchangeRef";
import {K_CLS_TASKS, RuntimeLoader, TaskRunner, Tasks} from "../..";
import {ClassLoader} from "commons-base";


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

  static runner(tasks: Tasks, name: string | string[], options: any) {
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

}
