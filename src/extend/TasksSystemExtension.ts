import * as _ from 'lodash';
import {ISystemApi} from '../api/ISystemApi';
import {UseAPI} from '../decorators/UseAPI';
import {SystemApi} from '../api/System.api';
import {INodeInfo} from '../libs/system/INodeInfo';
import {Inject} from 'typedi';
import {C_TASKS} from '../libs/tasks/Constants';

import {ITaskInfo} from '../libs/tasks/ITaskInfo';
import {SystemNodeInfo} from '../entities/SystemNodeInfo';
import {Tasks} from '../libs/tasks/Tasks';
import {TaskRunnerRegistry} from '..';

@UseAPI(SystemApi)
export class TasksSystemExtension implements ISystemApi {

  @Inject(Tasks.NAME)
  tasks: Tasks;


  @Inject('TaskRunnerRegistry')
  tasksRunnerRegistry: TaskRunnerRegistry;

  getNodeInfos(): INodeInfo | INodeInfo[] {
    const infos = this.tasks.infos();
    const nodeTaskContext: INodeInfo = {context: C_TASKS};
    nodeTaskContext.tasks = infos;
    return nodeTaskContext;
  }


  onNodeRegister(x: SystemNodeInfo): void {
    if (x && _.has(x, 'contexts')) {
      const found = x.contexts.find(x => x.context === C_TASKS);
      if (found) {
        found.tasks.map((info: ITaskInfo) => {
          if (this.tasks.contains(info.name)) {
            this.tasks.get(info.name).addNodeId(x.nodeId, true);
          } else {
            if (!info.remote) {
              this.tasks.addRemoteTask(x.nodeId, info);
            }
          }
        });
      }
    }

    this.tasksRunnerRegistry.onNodeUpdate(x);
  }


  onNodeUnregister(x: SystemNodeInfo): void {
    if (x && _.has(x, 'contexts')) {
      const found = x.contexts.find(x => x.context === C_TASKS);
      if (found) {
        found.tasks.map((info: ITaskInfo) => {
          if (this.tasks.contains(info.name)) {
            const task = this.tasks.get(info.name);
            task.removeNodeId(x.nodeId);
            if (!task.hasNodeIds()) {
              this.tasks.removeTask(task);
            }
          }
        });
      }
    }

    this.tasksRunnerRegistry.onNodeUpdate(x);
  }

}
