import {ISystemApi} from '../api/ISystemApi';
import {UseAPI} from '../decorators/UseAPI';
import {SystemApi} from '../api/System.api';
import {INodeInfo} from '../libs/system/INodeInfo';
import {Inject} from 'typedi';
import {Workers} from '../libs/worker/Workers';
import {C_WORKERS} from '../libs/worker/Constants';

@UseAPI(SystemApi)
export class WorkersSystemExtension implements ISystemApi {

  @Inject(Workers.NAME)
  workers: Workers;


  getNodeInfos(): INodeInfo | INodeInfo[] {
    const infos = this.workers.infos();
    const nodeTaskContext: INodeInfo = {context: C_WORKERS};
    nodeTaskContext[C_WORKERS] = infos;
    return nodeTaskContext;
  }


}

