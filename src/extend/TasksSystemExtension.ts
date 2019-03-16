import * as _ from 'lodash';
import {ISystemApi} from "../api/ISystemApi";
import {UseAPI} from "../decorators/UseAPI";
import {SystemApi} from "../api/System.api";
import {INodeInfo} from "../libs/system/INodeInfo";
import {Inject} from "typedi";
import {Log, Tasks} from "..";
import {C_TASKS} from "../libs/tasks/Constants";
import {NodeInfo} from "../libs/system/events/NodeInfo";
import {ITaskInfo} from "../libs/tasks/ITaskInfo";

@UseAPI(SystemApi)
export class TasksSystemExtension implements ISystemApi {

  @Inject(Tasks.NAME)
  tasks: Tasks;


  getNodeInfos(): INodeInfo | INodeInfo[] {
    let infos = this.tasks.infos();
    let nodeTaskContext: INodeInfo = {context: C_TASKS};
    nodeTaskContext.tasks = infos;
    return nodeTaskContext;
  }


  onNodeRegister(x: NodeInfo): void {
    if(x && _.has(x,'contexts')){
      let found = x.contexts.find(x => x.context == C_TASKS);
      if (found) {
        found.tasks.map((info: ITaskInfo) => {
          if (this.tasks.contains(info.name)) {
            this.tasks.get(info.name).addNodeId(x.nodeId, true);
          } else {
            if (!info.remote) {
              this.tasks.addRemoteTask(x.nodeId, info);
            }
          }
        })
      }
    }
  }


  onNodeUnregister(x: NodeInfo): void {
    if(x && _.has(x,'contexts')){
      let found = x.contexts.find(x => x.context == C_TASKS);
      if (found) {
        found.tasks.map((info: ITaskInfo) => {
          if (this.tasks.contains(info.name)) {
            let task = this.tasks.get(info.name);
            task.removeNodeId(x.nodeId);
            if (!task.hasNodeIds()) {
              this.tasks.removeTask(task);
            }
          }
        });
      }
    }
  }

}
