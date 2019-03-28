import * as _ from 'lodash';
import subscribe from "commons-eventbus/decorator/subscribe";
import {Log} from "../logging/Log";
import {EventBus} from "commons-eventbus";
import {C_KEY_SEPARATOR, C_STORAGE_DEFAULT, Invoker, SystemInfoEvent} from "../..";
import {StorageRef} from "../storage/StorageRef";
import {Inject} from "typedi";
import {SystemApi} from "../../api/System.api";
import {INodeInfo} from "./INodeInfo";
import {SystemNodeInfo} from "../../entities/SystemNodeInfo";
import {SystemInfo} from "./SystemInfo";
import * as os from "os";
import {SystemInfoRequestEvent} from "./SystemInfoRequestEvent";
import {SystemInfoRequest} from "./SystemInfoRequest";

export class System {

  @Inject(Invoker.NAME)
  invoker: Invoker;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  static NAME: string = 'System';


  updateTimer: any;

  /**
   * Information about this runtime enviroment
   */
  info: SystemInfo = new SystemInfo();

  /**
   * Information about this node
   */
  node: SystemNodeInfo;

  /**
   * Information about other runtime enviroments
   */
  nodes: SystemNodeInfo[] = [];

  /**
   *
   */
  _registered: boolean = false;


  async initialize(hostname: string, nodeId: string) {
    const key = [hostname, nodeId].join(C_KEY_SEPARATOR);

    // clear table before startup
    let c = await this.storageRef.connect();
    await c.manager.clear(SystemNodeInfo);
    await c.close();

    this.node = new SystemNodeInfo();
    this.node.key = key;
    this.node.hostname = hostname;
    this.node.nodeId = nodeId;
    this.node.started = new Date();
    this.node.state = 'startup';
    this.node.isBackend = true;
    this.updateInfo();
    await this.storageRef.getController().save(this.node);
  }


  @subscribe(SystemNodeInfo)
  onNodeInfo(nodeInfo: SystemNodeInfo) {
    return this.handleNode(nodeInfo);
  }


  async handleNode(nodeInfo: SystemNodeInfo) {
    if (this.node.nodeId == nodeInfo.nodeId) {
      // own information can be ignored
      return null;
    }

    if (nodeInfo instanceof SystemNodeInfo) {
      nodeInfo.restore();
    }

    // clear local info
    delete nodeInfo.isBackend;

    let node = _.find(this.nodes, n => n.nodeId == nodeInfo.nodeId);
    if (!node && (nodeInfo.state == 'register' || nodeInfo.state == 'idle')) {
      this.nodes.push(nodeInfo);
      Log.debug('add remote node ', nodeInfo);
      await this.invoker.use(SystemApi).onNodeRegister(nodeInfo);
      await this.storageRef.getController().save(nodeInfo);
      EventBus.postAndForget(this.node);
    } else if (node && nodeInfo.state == 'unregister') {
      _.remove(this.nodes, n => n.nodeId == nodeInfo.nodeId);
      Log.debug('remove remote node ', nodeInfo);
      await this.invoker.use(SystemApi).onNodeUnregister(nodeInfo);
      await this.storageRef.getController().save(nodeInfo);
    }
    return this.node;
  }


  async gatherNodeInfos() {
    let infos: INodeInfo | INodeInfo[] = await this.invoker.use(SystemApi).getNodeInfos();
    if (_.isArray(infos)) {
      for (let info of infos) {
        if (!_.isEmpty(info)) {
          this.node.contexts.push(info)
        }
      }
    } else {
      if (!_.isEmpty(infos)) {
        this.node.contexts.push(infos)
      }
    }
  }


  async getNodeInfos(nodeIds: string[] = []) {
    let request: SystemInfoRequest = new SystemInfoRequest(this);
    return request.run(nodeIds);
  }


  updateInfo() {
    this.info.networks = os.networkInterfaces();
    this.info.cpus = os.cpus();
    this.info.memory = {
      total: os.totalmem(),
      free: os.freemem(),
    };
    this.info.uptime = os.uptime();
    this.info.hostname = os.hostname();
    this.info.arch = os.arch();
    this.info.release = os.release();
    this.info.loadavg = os.loadavg();
    this.info.memoryUsage = process.memoryUsage();
    this.info.versions = process.versions;
    this.info.cpuUsage = process.cpuUsage();
  }


  @subscribe(SystemInfoRequestEvent)
  onInfoRequest(event: SystemInfoRequestEvent) {
    if (this.node.nodeId == event.nodeId) return;
    if (event.targetIds && event.targetIds.indexOf(this.node.nodeId) != -1) {
      let response = new SystemInfoEvent();
      response.nodeId = this.node.nodeId;
      response.targetIds = [event.nodeId];
      response.respId = this.node.nodeId;
      response.info = _.cloneDeep(this.info);
      EventBus.postAndForget(response);
    }
  }


  async register() {
    await this.gatherNodeInfos();
    this.node.state = 'register';
    this._registered = true;
    await EventBus.register(this);

    this.updateTimer = setInterval(this.updateInfo.bind(this), 5000);
    let ret = await EventBus.post(this.node);
    let nodeHandle = [];
    for (let x of ret) {
      for (let y of x) {
        if (!y) {
          continue;
        }
        y = _.assign(new SystemNodeInfo(), y);
        nodeHandle.push(this.handleNode(y));
      }
    }
    await Promise.all(nodeHandle);
    this.node.state = 'idle';

    await this.storageRef.getController().save(this.node);
  }


  async unregister() {
    if (!this._registered) return;
    clearInterval(this.updateTimer);
    this.node.state = 'unregister';
    this.node.finished = new Date();
    await this.storageRef.getController().save(this.node);
    await EventBus.unregister(this);
    await EventBus.postAndForget(this.node);

  }


}
