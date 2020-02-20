import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';
import {IFileOptions} from './IFileOptions';

export class FileSystemRequest extends AbstractEvent {

  options: IFileOptions;

  constructor(options: IFileOptions) {
    super();
    this.options = options;
  }


}
