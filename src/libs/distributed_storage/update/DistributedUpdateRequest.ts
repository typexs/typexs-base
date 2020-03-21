import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedUpdateOptions} from './IDistributedUpdateOptions';
import {IEntityRef} from 'commons-schema-api';
import {IEntityController} from '../../storage/IEntityController';

export class DistributedUpdateRequest extends AbstractEvent {

  entityType: string;

  conditions: any;

  update: any;

  options: IDistributedUpdateOptions;

  entityRef: IEntityRef;

  entityController: IEntityController;

}
