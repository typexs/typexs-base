import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedAggregateOptions} from './IDistributedAggregateOptions';
import {IEntityRef} from '@allgemein/schema-api';
import {IEntityController} from '../../storage/IEntityController';

export class DistributedAggregateRequest extends AbstractEvent {

  entityType: string;

  entityRef: IEntityRef;

  entityController: IEntityController;

  pipeline: any[];

  options: IDistributedAggregateOptions;
}
