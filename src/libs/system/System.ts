import * as _ from 'lodash';
import {EventBus, subscribe} from 'commons-eventbus';
import {Log} from '../logging/Log';
import {
  APP_SYSTEM_DISTRIBUTED,
  APP_SYSTEM_UPDATE_INTERVAL,
  C_KEY_SEPARATOR,
  C_STORAGE_DEFAULT,
  TYPEXS_NAME
} from '../Constants';
import {StorageRef} from '../storage/StorageRef';
import {Inject} from 'typedi';
import {SystemApi} from '../../api/System.api';
import {INodeInfo} from './INodeInfo';
import {SystemNodeInfo} from '../../entities/SystemNodeInfo';
import {NodeRuntimeInfo} from './NodeRuntimeInfo';
import * as os from 'os';
import {SystemInfoRequestEvent} from './SystemInfoRequestEvent';
import {SystemInfoRequest} from './SystemInfoRequest';
import * as machineId from 'node-machine-id';
import {Config} from '@allgemein/config';
import {Invoker} from '../../base/Invoker';
import {SystemInfoResponse} from './SystemInfoResponse';
import {ILoggerApi} from '../logging/ILoggerApi';
import {IEntityController} from '../storage/IEntityController';
import {LockFactory} from '../LockFactory';

export class System {

  static NAME = System.name;

  static enabled = true;

  @Inject(Invoker.NAME)
  invoker: Invoker;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  semaphore = LockFactory.$().semaphore(1);

  /**
   * Use entity controller to handle values
   */
  controller: IEntityController;


  updateTimer: any;

  /**
   * Information about this runtime enviroment
   */
  info: NodeRuntimeInfo = new NodeRuntimeInfo();

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
  _registered = false;

  /**
   * Logger instance for this class
   */
  logger: ILoggerApi;


  static isDistributionEnabled() {
    const e = Config.get(APP_SYSTEM_DISTRIBUTED);
    if (_.isBoolean(e)) {
      return e;
    }
    return this.enabled;
  }


  static enableDistribution(b: boolean = true) {
    this.enabled = b;
    Config.set(APP_SYSTEM_DISTRIBUTED, b, TYPEXS_NAME);
  }


  constructor() {
    this.logger = Log.getLoggerFor(System);
  }


  async initialize(hostname: string, nodeId: string, instNr: number = 0) {
    const key = [hostname, nodeId, instNr].join(C_KEY_SEPARATOR);

    // clear table before startup
    if (this.storageRef) {
      this.controller = this.storageRef.getController();
      // check if instance number exists
      const nodes = await this.controller.find(SystemNodeInfo,
        {
          $and: [
            {state: {$ne: 'unregister'}},
            {state: {$ne: 'offline'}},
            {state: {$ne: 'startup'}}]
        }, {limit: 0});
      const filtered = nodes.filter(c => c.nodeId === nodeId && !['unregister', 'offline', 'startup'].includes(c.state));
      if (!_.isEmpty(filtered)) {
        instNr = _.max(filtered.map(x => x.instNr)) + 1;
      }
    }

    this.node = new SystemNodeInfo();
    this.node.machineId = await machineId.machineId(true);
    this.node.hostname = hostname;
    this.node.nodeId = nodeId;
    this.node.instNr = instNr;
    this.node.key = key;
    this.node.started_at = new Date();
    this.node.state = 'startup';
    this.node.isBackend = true;
    this.node.updated_at = this.node.started_at;
    this.updateNodeRuntimeInfo();
  }

  getNodeId() {
    return this.node.nodeId;
  }


  @subscribe(SystemNodeInfo)
  async onNodeInfo(nodeInfo: SystemNodeInfo) {
    if (this.node.eqNode(nodeInfo)) {
      // own information can be ignored
      return null;
    }

    await this.semaphore.acquire();

    if (nodeInfo instanceof SystemNodeInfo) {
      nodeInfo.restore();
    }

    // clear local info
    delete nodeInfo.isBackend;

    const node = _.find(this.nodes, n => n.eqNode(nodeInfo));
    this.logger.debug(`system node: ${nodeInfo.hostname}:${nodeInfo.nodeId}-${nodeInfo.instNr} ` +
      `state=${nodeInfo.state} [${this.node.nodeId}] already exists=${!!node}`);
    if ((nodeInfo.state === 'register' || (nodeInfo.state === 'idle' && !node))) {
      if (!node) {
        this.nodes.push(nodeInfo);
      }
      this.logger.debug(`add remote node ${nodeInfo.hostname}:${nodeInfo.nodeId}--${nodeInfo.instNr}`);
      await EventBus.postAndForget(this.node);
      try {
        await this.invoker.use(SystemApi).onNodeRegister(nodeInfo);
      } catch (e) {
        this.logger.error(e);
      }
      await this.save(nodeInfo);
    } else if (nodeInfo.state === 'unregister') {
      const nodes = _.remove(this.nodes, n => n.eqNode(nodeInfo));
      this.logger.debug(`remove remote node ${nodeInfo.hostname}:${nodeInfo.nodeId}--${nodeInfo.instNr}`);
      try {
        await this.invoker.use(SystemApi).onNodeUnregister(nodeInfo);
      } catch (e) {
        this.logger.error(e);
      }

      if (nodes.length > 0) {
        try {
          await this.controller.remove(SystemNodeInfo, {key: {$in: nodes.map(x => x.key)}});
        } catch (e) {
          this.logger.error(e);
        }
      }
    }
    this.semaphore.release();
    return this.node;
  }


  getNodesWith(context: string) {
    return this.getAllNodes().filter(v => !!v.contexts.find(c => c.context === context));
  }


  getAllNodes(): SystemNodeInfo[] {
    return [this.node, ...this.nodes];
  }


  getRemoteNodes() {
    return this.nodes;
  }


  async gatherCurrentNodeInfos() {
    const infos: INodeInfo | INodeInfo[] = await this.invoker.use(SystemApi).getNodeInfos();
    if (_.isArray(infos)) {
      for (const info of infos) {
        if (!_.isEmpty(info)) {
          this.node.contexts.push(info);
        }
      }
    } else {
      if (!_.isEmpty(infos)) {
        this.node.contexts.push(infos);
      }
    }
  }


  async getNodeInfos(nodeIds: string[] = []) {
    const request: SystemInfoRequest = new SystemInfoRequest(this);
    return request.run(nodeIds);
  }


  updateNodeRuntimeInfo() {
    this.node.updated_at = new Date();
    this.info.nodeId = this.node.nodeId;
    this.info.machineId = this.node.machineId;
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

  /**
   * Act on info request event and send the
   * system runtime informations back
   *
   * @param event
   */
  @subscribe(SystemInfoRequestEvent)
  onInfoRequest(event: SystemInfoRequestEvent) {
    if (this.node.eqNode(event)) {
      return Promise.resolve();
    }
    if (event.targetIds && event.targetIds.indexOf(this.node.nodeId) !== -1) {
      const response = new SystemInfoResponse();
      response.of(this.node);
      response.targetIds = [event.nodeId];
      response.respId = this.node.nodeId;
      response.info = _.cloneDeep(this.info);
      return EventBus.postAndForget(response);
    }
    return Promise.resolve();
  }

  /**
   * Register this system node
   */
  async register() {
    await this.gatherCurrentNodeInfos();
    this.node.state = 'register';
    this._registered = true;
    await EventBus.register(this);

    const interval = Config.get(APP_SYSTEM_UPDATE_INTERVAL, 1000);
    this.updateTimer = setInterval(this.updateNodeRuntimeInfo.bind(this), interval);
    await EventBus.postAndForget(this.node);
    await this.idle();
  }


  /**
   * Method for unregister blocking objects on system onShutdown
   */
  async unregister() {
    if (!this._registered) {
      return;
    }
    clearInterval(this.updateTimer);
    this.node.state = 'unregister';
    this.node.finished = new Date();
    if (this.controller) {
      try {
        await this.controller.remove(SystemNodeInfo,
          {$or: [{state: 'unregister'}, {state: 'offline'}, {key: this.node.key}]});
      } catch (e) {
        this.logger.error(e);
      }
    }
    await EventBus.unregister(this);
    await EventBus.postAndForget(this.node);
  }


  async idle() {
    this.node.state = 'idle';
    this.node.updated_at = new Date();
    await this.save(this.node);
  }


  async offline() {
    this.node.state = 'offline';
    this.node.updated_at = new Date();
    await this.save(this.node);
  }

  private async save(node: SystemNodeInfo) {
    if (this.controller) {
      try {
        let r = await this.controller.findOne(SystemNodeInfo, {key: node.key});
        if (r) {
          _.assign(r, node);
        } else {
          r = node;
        }
        await this.controller.save(r);
      } catch (e) {
        this.logger.error(e);
      }
    }
  }


}
