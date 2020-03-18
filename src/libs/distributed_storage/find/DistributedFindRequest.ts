import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedFindOptions} from './IDistributedFindOptions';
import {IEntityRef} from 'commons-schema-api';
import {IEntityController} from '../../storage/IEntityController';

export class DistributedFindRequest extends AbstractEvent {

  entityType: string;

  entityRef: IEntityRef;

  entityController: IEntityController;

  conditions: any;

  options: IDistributedFindOptions;
}
