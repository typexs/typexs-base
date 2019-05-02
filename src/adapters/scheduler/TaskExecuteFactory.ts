import * as _ from "lodash";
import {EventBus} from "commons-eventbus";
import {Schedule} from "../../libs/schedule/Schedule";
import EventBusMeta from "commons-eventbus/bus/EventBusMeta";
import {IScheduleFactory} from "../../libs/schedule/IScheduleFactory";
import {IScheduleDef} from "../../libs/schedule/IScheduleDef";
import {ITaskExec, TasksHelper} from "../../libs/tasks/TasksHelper";

export interface ITaskSchedule extends ITaskExec {
  name: string | string[];
}


export class TaskExecuteFactory implements IScheduleFactory {


  create(taskNames: string[], params: any = {}) {
    return async function () {
      return TasksHelper.exec(taskNames, params);
    }
  }


  async attach(schedule: Schedule): Promise<boolean> {
    let taskDef: ITaskSchedule = _.get(schedule.options, 'task', null);
    if (taskDef) {
      const names = _.isArray(taskDef.name) ? taskDef.name : [taskDef.name];
      const def = _.clone(taskDef);
      delete def.name;
      schedule.execute = this.create(names, def);
      return true;
    }
    return false;
  }


  async detect(opts: IScheduleDef) {
    return _.has(opts, 'task');
  }


  async isAvailable() {
    return true;
  }


}
