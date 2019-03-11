import * as _ from 'lodash';
import {INodeInfo} from "../INodeInfo";

export class NodeInfo {

  start: Date = new Date();

  nodeId: string;

  ip: string;

  command: string;

  state: string;

  contexts: INodeInfo[] = [];


  getRuntime() {
    return (new Date().getTime()) - this.start.getTime();
  }

  restore() {
    if (_.isString(this.start)) {
      this.start = new Date(this.start);
    }
  }
}
