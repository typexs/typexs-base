import {MetaArgs} from '@allgemein/base/browser';
import {K_CLS_TASK_DESCRIPTORS} from '../Constants';
import {ITaskPropertyDesc} from '../ITaskPropertyDesc';


export function TaskRuntime() {
  return function (o: any, propertyName: String) {
    MetaArgs.key(K_CLS_TASK_DESCRIPTORS).push(<ITaskPropertyDesc>{
      target: o.constructor ? o.constructor : o,
      propertyName: propertyName,
      type: 'runtime'
    });
  };
}
