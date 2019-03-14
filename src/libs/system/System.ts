import * as _ from 'lodash';
import {NodeInfo} from "./events/NodeInfo";
import subscribe from "commons-eventbus/decorator/subscribe";
import {Log} from "../logging/Log";
import {EventBus} from "commons-eventbus";
import {Invoker} from "../..";
import {Inject} from "typedi";
import {SystemApi} from "../../api/System.api";
import {INodeInfo} from "./INodeInfo";


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

  @Inject(Invoker.NAME)
  invoker: Invoker;


  initialize(nodeId: string) {
    this.node = new NodeInfo();
    this.node.nodeId = nodeId;
  }


  @subscribe(NodeInfo)
  onNodeInfo(nodeInfo: NodeInfo) {
    return this.handleNode(nodeInfo);
  }


  async handleNode(nodeInfo: NodeInfo) {
    if (this.node.nodeId == nodeInfo.nodeId) {
      // own information can be ignored
      return null;
    }

    if (nodeInfo instanceof NodeInfo) {
      nodeInfo.restore();
    }

    let node = _.find(this.nodes, n => n.nodeId == nodeInfo.nodeId);
    if (!node && (nodeInfo.state == 'register' || nodeInfo.state == 'idle') ) {
      this.nodes.push(nodeInfo);
      Log.debug('add remote node ', nodeInfo);
      await this.invoker.use(SystemApi).onNodeRegister(nodeInfo);
      EventBus.postAndForget(this.node);
    } else if (node && nodeInfo.state == 'unregister') {
      _.remove(this.nodes, n => n.nodeId == nodeInfo.nodeId);
      Log.debug('remove remote node ', nodeInfo);
      await this.invoker.use(SystemApi).onNodeUnregister(nodeInfo);
    }


    return this.node;
  }

  async gatherNodeInfos() {
    let infos: INodeInfo | INodeInfo[] = await this.invoker.use(SystemApi).getNodeInfos();
    infos.map((x: INodeInfo | INodeInfo[]) => _.isArray(x) ? this.node.contexts.push(...x) : this.node.contexts.push(x));
  }

  async register() {
    await this.gatherNodeInfos();
    this.node.state = 'register';
    this._registered = true;
    await EventBus.register(this);

    let ret = await EventBus.post(this.node);
    let nodeHandle = [];
    for (let x of ret) {
      for (let y of x) {
        if (!y) {
          continue;
        }
        y = _.assign(Reflect.construct(NodeInfo, []), y);
        nodeHandle.push(this.handleNode(y));
      }
    }
    await Promise.all(nodeHandle);
    this.node.state = 'idle';
  }


  async unregister() {
    if (!this._registered) return;
    this.node.state = 'unregister';
    await EventBus.unregister(this);
    await EventBus.postAndForget(this.node);
  }


}
