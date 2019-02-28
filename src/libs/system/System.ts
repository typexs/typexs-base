import * as _ from 'lodash';
import {NodeInfo} from "./events/NodeInfo";
import subscribe from "commons-eventbus/decorator/subscribe";
import {Log} from "../logging/Log";
import {EventBus} from "commons-eventbus";


export class System {

  static NAME: string = 'System';

  /**
   * Information about this runtime enviroment
   */
  node: NodeInfo;

  /**
   * Information about other runtime enviroments
   */
  nodes: NodeInfo[] = [];

  /**
   *
   */
  _registered: boolean = false;


  constructor(nodeId: string) {
    this.node = new NodeInfo();
    this.node.nodeId = nodeId;
  }


  @subscribe(NodeInfo)
  onNodeInfo(nodeInfo: NodeInfo) {
    return this.handleNode(nodeInfo);
  }


  handleNode(nodeInfo: NodeInfo) {
    if (this.node.nodeId == nodeInfo.nodeId) {
      // own information can be ignored
      return null;
    }

    if (nodeInfo instanceof NodeInfo) {
      nodeInfo.restore();
    }

    let node = _.find(this.nodes, n => n.nodeId == nodeInfo.nodeId);
    if (!node && nodeInfo.state == 'register') {
      this.nodes.push(nodeInfo);
      Log.debug('add remote node ', nodeInfo);
    } else if (node && nodeInfo.state == 'unregister') {
      _.remove(this.nodes, n => n.nodeId == nodeInfo.nodeId);
      Log.debug('remove remote node ', nodeInfo);
    }
    return this.node;
  }


  async register() {
    this.node.state = 'register';
    this._registered = true;
    await EventBus.register(this);
    let ret = await EventBus.post(this.node);
    for (let x of ret) {
      for (let y of x) {
        if (!y) {
          continue;
        }
        y = _.assign(Reflect.construct(NodeInfo, []), y);
        this.handleNode(y);
      }
    }
  }


  async unregister() {
    if (!this._registered) return;
    this.node.state = 'unregister';
    await EventBus.unregister(this);
    EventBus.postAndForget(this.node);
  }


}
