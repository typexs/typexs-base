import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedRemoveOptions} from './IDistributedRemoveOptions';
import {IEntityRef} from '@allgemein/schema-api';
import {IEntityController} from '../../storage/IEntityController';

export class DistributedRemoveRequest extends AbstractEvent {

  entityType: string;

  options: IDistributedRemoveOptions;

  removable: { [k: string]: any[] };

  condition: any;

  entityRefs: { [k: string]: IEntityRef };

  entityControllers: { [k: string]: IEntityController };

}
