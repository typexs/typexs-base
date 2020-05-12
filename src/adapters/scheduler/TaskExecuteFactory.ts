import * as _ from 'lodash';
import {Schedule} from '../../libs/schedule/Schedule';
import {IScheduleFactory} from '../../libs/schedule/IScheduleFactory';
import {IScheduleDef} from '../../libs/schedule/IScheduleDef';
import {TasksHelper} from '../../libs/tasks/TasksHelper';
import {ITaskExectorOptions} from '../../libs/tasks/ITaskExectorOptions';
import {TASK_RUNNER_SPEC} from '../../libs/tasks/Constants';

export interface ITaskSchedule extends ITaskExectorOptions {
  name: string | string[];
}

export class TaskExecuteFactory implements IScheduleFactory {

  create(taskNames: TASK_RUNNER_SPEC[], params: ITaskExectorOptions = {skipTargetCheck: false, executionConcurrency: 1}) {
    return async function () {
      return TasksHelper.exec(taskNames, params);
    };
  }


  async attach(schedule: Schedule): Promise<boolean> {
    const taskDef: ITaskSchedule = _.get(schedule.options, 'task', null);
    if (taskDef) {
      const names = _.isArray(taskDef.name) ? taskDef.name : [taskDef.name];
      let def = _.clone(taskDef);
      delete def.name;
      if (_.has(def, 'params')) {
        def = def['params'];
      }
      if (_.has(def, 'parallel')) {
        def.executionConcurrency = _.get(def, 'parallel', 1);
      }
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
