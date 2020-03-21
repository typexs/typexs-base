import * as _ from 'lodash';
import {DistributedStorageEntityController} from './../DistributedStorageEntityController';
import {IFindOp} from '../../storage/framework/IFindOp';
import {System} from '../../system/System';
import {ClassRef, ClassType} from 'commons-schema-api';
import {IWorkerInfo} from '../../worker/IWorkerInfo';
import {DistributedQueryWorker} from '../../../workers/DistributedQueryWorker';
import {C_WORKERS} from '../../worker/Constants';
import {C_KEY_SEPARATOR, XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../../Constants';
import {DistributedFindResponse} from './DistributedFindResponse';
import {DistributedFindRequest} from './DistributedFindRequest';
import {IDistributedFindOptions} from './IDistributedFindOptions';
import {AbstractMessage} from '../../messaging/AbstractMessage';
import {EntityControllerRegistry} from '../../storage/EntityControllerRegistry';
import {ClassUtils} from 'commons-base';
import {__CLASS__, __REGISTRY__} from '../Constants';


export class DistributedFindOp<T>
  extends AbstractMessage<DistributedFindRequest, DistributedFindResponse>
  implements IFindOp<T> {

  protected findConditions: any;

  protected entityType: Function | ClassType<T> | string;

  protected entityControllerRegistry: EntityControllerRegistry;

  constructor(system: System, entityControllerRegistry: EntityControllerRegistry) {
    super(system, DistributedFindRequest, DistributedFindResponse);
    this.entityControllerRegistry = entityControllerRegistry;
    this.timeout = 10000;
  }

  getFindConditions() {
    return this.findConditions;
  }

  getEntityType(): string | Function | ClassType<T> {
    return this.entityType;
  }

  getOptions(): IDistributedFindOptions {
    return this.options;
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }


  async run(entityType: Function | string | ClassType<T>, findConditions?: any, options?: IDistributedFindOptions): Promise<T[]> {
    this.findConditions = findConditions;
    this.entityType = ClassUtils.getClassName(entityType);
    this.options = options;

    _.defaults(options, {
      limit: 50,
      offset: null,
      sort: null,
      timeout: 10000
    });
    this.options = options;
    this.timeout = this.options.timeout;


    const req = new DistributedFindRequest();
    req.conditions = this.findConditions;
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

    if (this.targetIds.length === 0) {
      throw new Error('no distributed worker found to execute the query.');
    }


    // this.queryEvent.targetIds = this.targetIds;
    if (this.targetIds.length === 0) {
      return this.results;
    }

    await this.send(req);

    return this.results;
  }


  doPostProcess(responses: DistributedFindResponse[], err?: Error): any {
    let count = 0;
    responses.map(x => {
      count += x.count;
    });

    const classRefs = {};
    _.concat([], ...responses.map(x => x.results)).map(x => {
      const classRefName = x[__CLASS__];
      const registry = x[__REGISTRY__];
      const key = [classRefName, registry].join(C_KEY_SEPARATOR);
      if (!classRefs[key]) {
        classRefs[key] = ClassRef.get(classRefName, registry);
      }
    });

    if (_.get(this.options, 'raw', false)) {
      this.results = _.concat([], ...responses.map(x => x.results)).map(x => {
        const classRefName = x[__CLASS__];
        const registry = x[__REGISTRY__];
        const key = [classRefName, registry].join(C_KEY_SEPARATOR);
        const ref = classRefs[key];
        const e = ref.create();
        _.assign(e, x);
        return e;
      });
    } else {
      this.results = _.concat([], ...responses.map(x => x.results))
        .map(r => {
          const classRefName = r[__CLASS__];
          const registry = r[__REGISTRY__];
          const key = [classRefName, registry].join(C_KEY_SEPARATOR);
          const ref = classRefs[key];
          return ref.build(r, {
            afterBuild: (c: any, f: any, t: any) => _.keys(f)
              .filter(k => k.startsWith('__'))
              .map(k => t[k] = f[k])
          });
        });
    }

    if (_.get(this.request.options, 'sort', false)) {
      const arr: string[][] = [];
      // order after concat
      _.keys(this.request.options.sort).forEach(k => {
        arr.push([k, this.request.options.sort[k].toUpperCase() === 'ASC' ? 'asc' : 'desc']);
      });
      _.orderBy(this.results, ...arr);
    }

    this.results[XS_P_$COUNT] = count;
    this.results[XS_P_$LIMIT] = this.request.options.limit;
    this.results[XS_P_$OFFSET] = this.request.options.offset;

    return this.results;
  }

}

