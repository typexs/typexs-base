import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';

export class FileResponse extends AbstractEvent {

  path: string = null;

  data: any;


}
