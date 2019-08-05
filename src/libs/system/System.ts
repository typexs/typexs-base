import * as _ from 'lodash';
import {EventBus, subscribe} from 'commons-eventbus';
import {Log} from '../logging/Log';
import {APP_SYSTEM_DISTRIBUTED, C_KEY_SEPARATOR, C_STORAGE_DEFAULT, TYPEXS_NAME} from '../Constants';
import {StorageRef} from '../storage/StorageRef';
import {Inject} from 'typedi';
import {SystemApi} from '../../api/System.api';
import {INodeInfo} from './INodeInfo';
import {SystemNodeInfo} from '../../entities/SystemNodeInfo';
import {SystemInfo} from './SystemInfo';
import * as os from 'os';
import {SystemInfoRequestEvent} from './SystemInfoRequestEvent';
import {SystemInfoRequest} from './SystemInfoRequest';
import * as machineId from 'node-machine-id';
import {Config} from 'commons-config';
import {Invoker} from '../../base/Invoker';
import {SystemInfoEvent} from './SystemInfoEvent';
import {ILoggerApi} from '../logging/ILoggerApi';

export class System {

  static NAME = 'System';

  static enabled = true;

  @Inject(Invoker.NAME)
  invoker: Invoker;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;


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


  async initialize(hostname: string, nodeId: string) {
    const key = [hostname, nodeId].join(C_KEY_SEPARATOR);

    // clear table before startup
    if (this.storageRef) {
      const c = await this.storageRef.connect();
      await c.manager.clear(SystemNodeInfo);
      await c.close();
    }

    this.node = new SystemNodeInfo();
    this.node.machineId = await machineId.machineId(true);
    this.node.hostname = hostname;
    this.node.nodeId = nodeId;
    this.node.key = key;
    this.node.started = new Date();
    this.node.state = 'startup';
    this.node.isBackend = true;
    this.updateInfo();
    if (this.storageRef) {
      await this.storageRef.getController().save(this.node);
    }
  }


  @subscribe(SystemNodeInfo)
  onNodeInfo(nodeInfo: SystemNodeInfo) {
    return this.handleNode(nodeInfo);
  }


  async handleNode(nodeInfo: SystemNodeInfo) {
    if (this.node.nodeId === nodeInfo.nodeId) {
      // own information can be ignored
      return null;
    }

    if (nodeInfo instanceof SystemNodeInfo) {
      nodeInfo.restore();
    }

    this.logger.debug('system node: ' + nodeInfo.hostname + ':' + nodeInfo.nodeId +
      ' state=' + nodeInfo.state + ' [' + this.node.nodeId + ']');
    // clear local info
    delete nodeInfo.isBackend;

    const node = _.find(this.nodes, n => n.nodeId === nodeInfo.nodeId);
    if ((nodeInfo.state === 'register' || (nodeInfo.state === 'idle' && !node))) {
      if (!node) {
        this.nodes.push(nodeInfo);
      }

      this.logger.debug('add remote node ' + nodeInfo.hostname + ':' + nodeInfo.nodeId);

      await EventBus.postAndForget(this.node);
      try {
        await this.invoker.use(SystemApi).onNodeRegister(nodeInfo);
      } catch (e) {
        this.logger.error(e);
      }
      try {
        await this.storageRef.getController().save(nodeInfo);
      } catch (e) {
        this.logger.error(e);
      }
    } else if (nodeInfo.state === 'unregister') {
      const nodes = _.remove(this.nodes, n => n.nodeId === nodeInfo.nodeId);

      this.logger.debug('remove remote node ' + nodeInfo.hostname + ':' + nodeInfo.nodeId);
      await this.invoker.use(SystemApi).onNodeUnregister(nodeInfo);
      try {
        nodes.map(x => x.state === 'offline');
        await this.storageRef.getController().save(nodes);
      } catch (e) {
        this.logger.error(e);
      }
    }

    return this.node;
  }


  getNodesWith(context: string) {
    return this.getNodes().filter(v => !!v.contexts.find(c => c.context === context));
  }


  getNodes(): SystemNodeInfo[] {
    return [this.node, ...this.nodes];
  }


  async gatherNodeInfos() {
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


  updateInfo() {
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
    if (this.node.nodeId === event.nodeId) {
      return Promise.resolve();
    }
    if (event.targetIds && event.targetIds.indexOf(this.node.nodeId) !== -1) {
      const response = new SystemInfoEvent();
      response.nodeId = this.node.nodeId;
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
    await this.gatherNodeInfos();
    this.node.state = 'register';
    this._registered = true;
    await EventBus.register(this);


    this.updateTimer = setInterval(this.updateInfo.bind(this), 5000);
    await EventBus.postAndForget(this.node);
    // const nodeHandle = [];
    // for (const x of ret) {
    //   for (let y of x) {
    //     if (!y) {
    //       continue;
    //     }
    //     y = _.assign(new SystemNodeInfo(), y);
    //     nodeHandle.push(this.handleNode(y));
    //   }
    // }
    // await Promise.all(nodeHandle);
    this.node.state = 'idle';

    if (this.storageRef) {
      await this.storageRef.getController().save(this.node);
    }
  }


  /**
   * Method for unregister blocking objects on system shutdown
   */
  async unregister() {
    if (!this._registered) {
      return;
    }
    clearInterval(this.updateTimer);
    this.node.state = 'unregister';
    this.node.finished = new Date();
    if (this.storageRef) {
      await this.storageRef.getController().save(this.node);
    }
    await EventBus.unregister(this);
    await EventBus.postAndForget(this.node);

  }


}
