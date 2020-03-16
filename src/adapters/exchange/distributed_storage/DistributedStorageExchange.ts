import * as _ from 'lodash';
import {AbstractExchange} from '../../../libs/messaging/AbstractExchange';
import {DistributedStorageRequest} from './DistributedStorageRequest';
import {DistributedStorageResponse} from './DistributedStorageResponse';
import {ClassType} from 'commons-schema-api';
import {IDistributedFindOptions} from '../../../libs/distributed_storage/IDistributedFindOptions';

import {ClassUtils} from 'commons-base';
import {IDistributedSaveOptions} from '../../../libs/distributed_storage/IDistributedSaveOptions';
import {TypeOrmUtils} from '../../../libs/storage/framework/typeorm/TypeOrmUtils';
import {__DISTRIBUTED_ID__} from '../../../libs/distributed_storage/Constants';
import {IMessageOptions} from '../../../libs/messaging/IMessageOptions';
import {TypeOrmEntityRegistry} from '../../../libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {Injector} from '../../../libs/di/Injector';
import {Storage} from '../../../libs/storage/Storage';
import {IFindOptions} from '../../../libs/storage/framework/IFindOptions';
import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../../../libs/Constants';


export class DistributedStorageExchange extends AbstractExchange<DistributedStorageRequest, DistributedStorageResponse> {


  constructor() {
    super(DistributedStorageRequest, DistributedStorageResponse);
  }

  /**
   */
  async prepare() {
    // check if worker is active?
    await super.prepare();
  }


  find<T>(entityType: Function | string | ClassType<T>, findConditions?: any, options?: IDistributedFindOptions & IMessageOptions) {
    const req = new DistributedStorageRequest();
    req.op = 'find';
    req.entityType = ClassUtils.getClassName(entityType);
    req.condition = findConditions;
    req.options = options;
    const msg = this.create(options);
    return msg.send(req);

  }

  save<T>(objects: T | T[], options?: IDistributedSaveOptions & IMessageOptions) {
    const req = new DistributedStorageRequest();
    req.op = 'save';
    req.isArray = _.isArray(objects);
    const _objects = _.isArray(objects) ? objects : [objects];
    let inc = 0;
    _objects.forEach((o: any) => {
      _.set(o, __DISTRIBUTED_ID__, inc++);
    });
    req.objects = TypeOrmUtils.resolveByEntityDef(_objects);
    req.options = options;
    const msg = this.create(options);
    return msg.send(req);
  }

  update() {
  }

  remove() {
  }

  aggregate() {
  }


  async handleRequest(request: DistributedStorageRequest, res: DistributedStorageResponse) {
    res.op = request.op;
    switch (request.op) {
      case 'find':
        await this.handleFindRequest(request, res);
        break;

      case 'save':
        await this.handleSaveRequest(request, res);
        break;

    }
  }

  async handleFindRequest(request: DistributedStorageRequest, res: DistributedStorageResponse) {
    const entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(request.entityType);

    res.results = [];

    try {
      const classRef = entityRef.getClassRef();
      const storageRef = (Injector.get(Storage.NAME) as Storage).forClass(classRef);
      const opts: IFindOptions = request.options;

      res.results = await storageRef.getController().find(
        classRef.getClass(),
        request.condition,
        opts
      );

      res.count = res.results[XS_P_$COUNT];
      res.limit = res.results[XS_P_$LIMIT];
      res.offset = res.results[XS_P_$OFFSET];
      this.logger.debug('distributed query worker:  found ' + res.count +
        ' entries for ' + classRef.name + '[qId: ' + res.id + ']');
    } catch (err) {
      res.error = err.message;
      this.logger.error(err);
    }

  }

  async handleSaveRequest(request: DistributedStorageRequest, res: DistributedStorageResponse) {

  }


  handleResponse(responses: DistributedStorageResponse): any {
    return responses;
  }
}


