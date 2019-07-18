import * as _ from 'lodash';
import {Schedule} from '../../libs/schedule/Schedule';
import {IScheduleFactory} from '../../libs/schedule/IScheduleFactory';
import {IScheduleDef} from '../../libs/schedule/IScheduleDef';
import {TasksHelper} from '../../libs/tasks/TasksHelper';
import {ITaskExec} from '../../libs/tasks/ITaskExec';
import {TASK_RUNNER_SPEC} from '../..';

export interface ITaskSchedule extends ITaskExec {
  name: string | string[];
}

export class TaskExecuteFactory implements IScheduleFactory {

  create(taskNames: TASK_RUNNER_SPEC[], params: ITaskExec = {skipTargetCheck: false}) {
    return async function () {
      return TasksHelper.exec(taskNames, params);
    };
  }


  async attach(schedule: Schedule): Promise<boolean> {
    const taskDef: ITaskSchedule = _.get(schedule.options, 'task', null);
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
