import {MetaArgs} from '@allgemein/base';
import {K_CLS_TASK_DESCRIPTORS} from '../Constants';
import {ITaskPropertyDesc} from '../ITaskPropertyDesc';
import {IIncomingOptions} from './IIncomingOptions';


export function Incoming(options: IIncomingOptions = {}) {
  return function (o: any, propertyName: String) {
    MetaArgs.key(K_CLS_TASK_DESCRIPTORS).push(<ITaskPropertyDesc>{
      target: o.constructor ? o.constructor : o,
      propertyName: propertyName,
      type: 'incoming',
      options: options
    });
  };
}
