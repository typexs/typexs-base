import * as _ from 'lodash';
import {IEntityController} from './IEntityController';
import {ClassUtils} from '@allgemein/base';
import {ClassType, IClassRef} from '@allgemein/schema-api';

const CONTROLLER_REGISTRY = 'entity_controller_registry';

export class EntityControllerRegistry {

  static NAME: string = EntityControllerRegistry.name;

  private entityControllers: IEntityController[] = [];

  add(e: IEntityController) {
    this.entityControllers.push(e);
  }

  getControllerForClass(cls: string | ClassType<any> | Function | IClassRef, hint?: { className?: string, name?: string }) {
    const controllers = this.entityControllers.filter(x => !!x.forClass(cls));
    let found = null;
    if (controllers.length > 1 && !_.isEmpty(hint)) {

      if (hint.className) {
        found = controllers.find(x => ClassUtils.getClassName(x as any) === hint.className);
      }

      if (!found && hint.name) {
        found = controllers.find(x => x.name() === hint.name);
      }

      if (!found) {
        found = _.first(controllers);
      }
    } else if (controllers.length === 1) {
      found = _.first(controllers);
    }
    return found;
  }


  getControllers() {
    return this.entityControllers;
  }

}
