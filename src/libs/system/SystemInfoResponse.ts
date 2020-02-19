import {AbstractEvent} from '../messaging/AbstractEvent';
import {NodeRuntimeInfo} from './NodeRuntimeInfo';


export class SystemInfoResponse extends AbstractEvent {

  info: NodeRuntimeInfo;



}
