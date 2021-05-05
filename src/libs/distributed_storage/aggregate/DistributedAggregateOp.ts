import {DistributedStorageEntityController} from './../DistributedStorageEntityController';
import {System} from '../../system/System';
import {ClassType} from '@allgemein/schema-api';
import {AbstractMessage} from '../../messaging/AbstractMessage';
import {EntityControllerRegistry} from '../../storage/EntityControllerRegistry';
import {DistributedAggregateRequest} from './DistributedAggregateRequest';
import {DistributedAggregateResponse} from './DistributedAggregateResponse';
import {IDistributedAggregateOptions} from './IDistributedAggregateOptions';
import {IAggregateOp} from '../../storage/framework/IAggregateOp';
import * as _ from 'lodash';
import {IWorkerInfo} from '../../worker/IWorkerInfo';
import {DistributedQueryWorker} from '../../../workers/DistributedQueryWorker';
import {ClassUtils} from '@allgemein/base';
import {C_WORKERS} from '../../worker/Constants';
import {__NODE_ID__, XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../../Constants';


export class DistributedAggregateOp
  extends AbstractMessage<DistributedAggregateRequest, DistributedAggregateResponse>
  implements IAggregateOp {

  protected entityType: Function | ClassType<any> | string;

  protected pipeline: any[];

  protected entityControllerRegistry: EntityControllerRegistry;

  constructor(system: System, entityControllerRegistry: EntityControllerRegistry) {
    super(system, DistributedAggregateRequest, DistributedAggregateResponse);
    this.entityControllerRegistry = entityControllerRegistry;
    this.timeout = 10000;
  }


  getOptions(): IDistributedAggregateOptions {
    return this.options;
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }

  async run(entryType: Function | string | ClassType<any>, pipeline: any[], options?: IDistributedAggregateOptions): Promise<any[]> {
    this.entityType = ClassUtils.getClassName(entryType);
    this.pipeline = pipeline;
    options = options || {};
    _.defaults(options, {
      limit: 50,
      offset: null,
      sort: null,
      timeout: 10000
    });
    this.options = options;
    this.timeout = this.options.timeout;

    const req = new DistributedAggregateRequest();
    req.pipeline = this.pipeline;
    req.entityType = this.entityType;
    req.options = this.options;


    // also fire self
    this.targetIds = this.system.getNodesWith(C_WORKERS)
      .filter(n => n.contexts
        .find(c => c.context === C_WORKERS).workers
        .find((w: IWorkerInfo) => w.className === DistributedQueryWorker.name))
      .map(n => n.nodeId);

    if (this.options.targetIds) {
      this.targetIds = _.intersection(this.targetIds, this.options.targetIds);
    }

    if (this.options.skipLocal) {
      _.remove(this.targetIds, x => x === this.getSystem().getNodeId());
    }


    if (this.targetIds.length === 0) {
      throw new Error('no distributed worker found to execute the query.');
    }

    if (this.targetIds.length === 0) {
      return this.results;
    }

    await this.send(req);

    return this.results;
  }

  doPostProcess(responses: DistributedAggregateResponse[], err?: Error): any {
    let count = 0;
    const errors: string[] = [];
    responses.map(x => {
      count += x.count;
      if (x.error) {
        errors.push(x.nodeId + ': ' + x.error.message);
      }
    });

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }


    const results = [];
    for (const res of responses) {
      for (const r of res.results) {
        _.set(r, __NODE_ID__, res.nodeId);
        results.push(r);
      }
    }
    results[XS_P_$COUNT] = count;
    results[XS_P_$LIMIT] = this.request.options.limit;
    results[XS_P_$OFFSET] = this.request.options.offset;
    return results;
  }

  getEntityType(): Function | string | ClassType<any> {
    return this.entityType;
  }

  getPipeline(): any[] {
    return this.pipeline;
  }


}


