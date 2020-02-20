import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';
import {IFileOptions} from './IFileOptions';
import {IFileStat} from '../../../libs/filesystem/IFileStat';

export class FileSystemResponse extends AbstractEvent {

  options: IFileOptions;

  data: any;

  stats: IFileStat;


}
