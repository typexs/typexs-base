import {ISystemApi} from "./ISystemApi";
import {INodeInfo} from "../libs/system/INodeInfo";
import {NodeInfo} from "../libs/system/events/NodeInfo";


export class SystemApi implements ISystemApi {

  /**
   * get additional informations for other nodes
   * @param x
   */
  getNodeInfos(): INodeInfo | INodeInfo[] {
    return null;
  }

  /**
   * fired when a node is added to the network
   * @param x
   */
  onNodeRegister(x: NodeInfo): void {
  }

  /**
   * fired when a node is removed from network
   * @param x
   */
  onNodeUnregister(x: NodeInfo): void {
  }

}
