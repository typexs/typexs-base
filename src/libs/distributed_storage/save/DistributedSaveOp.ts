import * as _ from 'lodash';
import {DistributedStorageEntityController} from './../DistributedStorageEntityController';
import {System} from '../../system/System';
import {ClassRef} from 'commons-schema-api';
import {ISaveOp} from '../../storage/framework/ISaveOp';
import {DistributedSaveRequest} from './DistributedSaveRequest';
import {DistributedSaveResponse} from './DistributedSaveResponse';
import {__CLASS__, __DISTRIBUTED_ID__, __REGISTRY__, __REMOTE_IDS__, XS_P_$ERRORED, XS_P_$SAVED} from './../Constants';
import {IDistributedSaveOptions} from './IDistributedSaveOptions';
import {AbstractMessage} from '../../messaging/AbstractMessage';
import {IMessageOptions} from '../../messaging/IMessageOptions';
import {C_WORKERS} from '../../worker/Constants';
import {DistributedQueryWorker} from '../../../workers/DistributedQueryWorker';
import {IWorkerInfo} from '../../worker/IWorkerInfo';
import {EntityControllerRegistry} from '../../storage/EntityControllerRegistry';
import {ClassUtils} from 'commons-base';


export class DistributedSaveOp<T>
  extends AbstractMessage<DistributedSaveRequest,
    DistributedSaveResponse> implements ISaveOp<T> {

  constructor(system: System, entityControllerRegistry: EntityControllerRegistry) {
    super(system, DistributedSaveRequest, DistributedSaveResponse);
    this.entityControllerRegistry = entityControllerRegistry;
    this.timeout = 10000;
  }

  private objects: any[] = [];

  // private entityRefs: { [k: string]: IEntityRef } = {};

  private isArray: boolean;


  protected entityControllerRegistry: EntityControllerRegistry;


  static resolveByClassName<T>(objs: T[]) {
    const resolved: { [entityType: string]: T[] } = {};
    for (const obj of objs) {
      const entityName = ClassUtils.getClassName(obj as any);
      if (!resolved[entityName]) {
        resolved[entityName] = [];
      }
      resolved[entityName].push(obj);

    }
    return resolved;
  }

  getOptions(): IDistributedSaveOptions & IMessageOptions {
    return this.options;
  }

  getObjects(): T[] {
    return this.objects;
  }

  getIsArray(): boolean {
    return this.isArray;
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }

  async run(objects: T | T[], options?: IDistributedSaveOptions & IMessageOptions): Promise<T[]> {
    this.options = _.defaults(options, {timeout: 10000});
    this.timeout = this.options.timeout;

    let inc = 0;
    this.isArray = _.isArray(objects);
    this.objects = _.isArray(objects) ? objects : [objects];

    // mark objects
    this.objects.forEach((o: any) => {
      _.set(o, __DISTRIBUTED_ID__, inc++);
    });

    // create request event
    const req = new DistributedSaveRequest();
    req.objects = DistributedSaveOp.resolveByClassName(this.objects);
    req.options = this.options;

    // _.keys(req.objects).map(entityType => {
    //   this.entityRefs[entityType] = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
    // });


    // also fire self
    this.targetIds = this.system.getNodesWith(C_WORKERS)
      .filter(n => n.contexts
        .find(c => c.context === C_WORKERS).workers
        .find((w: IWorkerInfo) => w.className === DistributedQueryWorker.name))
      .map(n => n.nodeId);

    if (this.options.nodeIds) {
      this.targetIds = _.intersection(this.targetIds, this.options.nodeIds);
    }

    if (this.targetIds.length === 0) {
      throw new Error('no distributed worker found to execute the query.');
    }

    // this.request.targetIds = this.targetIds;
    if (this.targetIds.length === 0) {
      return this.results;
    }

    await this.send(req);

    return this.objects;
  }


  doPostProcess(responses: DistributedSaveResponse[], err: Error) {
    const errors = [];
    let saved = 0;
    let errored = 0;
    for (const event of responses) {
      if (!_.isEmpty(event.error)) {
        errors.push(new Error('distributed save error: ' + event.nodeId + ' > ' + event.error));
        errored++;
      }
      _.keys(event.results).map(entityType => {
        const obj = _.first(event.results[entityType]);
        if (!obj) {
          return;
        }
        const ref = ClassRef.get(obj[__CLASS__], obj[__REGISTRY__]);
        const ids = ref.getPropertyRefs().filter(p => p.isIdentifier());

        for (const entry of event.results[entityType]) {
          const distributedId = _.get(entry, __DISTRIBUTED_ID__);
          const id = {};
          ids.forEach(_id => {
            id[_id.name] = _id.get(entry);
          });
          const localObject = this.objects.find(x => _.get(x, __DISTRIBUTED_ID__) === distributedId);
          if (!localObject[__REMOTE_IDS__]) {
            localObject[__REMOTE_IDS__] = {};
          }
          saved++;
          localObject[__REMOTE_IDS__][event.nodeId] = id;
        }
      });
    }

    this.objects[XS_P_$SAVED] = saved;
    this.objects[XS_P_$ERRORED] = errored;

    return this.objects;
  }


}


