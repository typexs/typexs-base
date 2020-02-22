import {INodeInfo} from '../libs/system/INodeInfo';
import {SystemNodeInfo} from '../entities/SystemNodeInfo';


export interface ISystemApi {

  /**
   * get additional informations for other nodes
   * @param x
   */
  getNodeInfos?(): INodeInfo | INodeInfo[] | Promise<INodeInfo | INodeInfo[]>;

  /**
   * fired when a node is added to the network
   * @param x
   */
  onNodeRegister?(x: SystemNodeInfo): void;

  /**
   * fired when a node is removed from network
   * @param x
   */
  onNodeUnregister?(x: SystemNodeInfo): void;

}
