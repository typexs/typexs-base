import {ITaskRefNodeInfo} from './ITaskRefNodeInfo';

export interface ITaskInfo {

  name?: string;

  groups?: string[];

  permissions?: string[];

  description?: string;

  nodeInfos?: ITaskRefNodeInfo[];

  remote?: boolean;

}
