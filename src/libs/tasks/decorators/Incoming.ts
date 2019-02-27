import {MetaArgs} from "commons-base/browser";
import {K_CLS_TASK_DESCRIPTORS} from "../Constants";
import {IExchange} from "./IExchange";
import {ITaskDesc} from "../ITaskDesc";


export function Incoming(options: IExchange = {}) {
  return function (o: any, propertyName: String) {
    MetaArgs.key(K_CLS_TASK_DESCRIPTORS).push(<ITaskDesc>{
      target: o.constructor ? o.constructor : o,
      propertyName: propertyName,
      type: "incoming",
      options: options
    });
  }
}
