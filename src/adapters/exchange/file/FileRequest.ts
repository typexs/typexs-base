import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';

export class FileRequest extends AbstractEvent {

  path: string = null;

}
