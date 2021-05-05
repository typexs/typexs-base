import {MetaArgs} from '@allgemein/base';
import {K_CLS_TASK_DESCRIPTORS} from '../Constants';
import {ITaskPropertyRefOptions} from '../ITaskPropertyRefOptions';


export function TaskRuntime() {
  return function (o: any, propertyName: String) {
    MetaArgs.key(K_CLS_TASK_DESCRIPTORS).push(<ITaskPropertyRefOptions>{
      target: o.constructor ? o.constructor : o,
      propertyName: propertyName,
      propertyType: 'runtime'
    });
  };
}
