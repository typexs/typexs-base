import {MetaArgs} from "commons-base/browser";
import {K_CLS_TASK_DESCRIPTORS} from "../Constants";


export function Incoming(options: any = {}) {
  return function (o: any, propertyName: String) {
    MetaArgs.key(K_CLS_TASK_DESCRIPTORS).push(<ITaskDesc>{
      target: o.constructor ? o.constructor : o,
      propertyName: propertyName,
      type: "incoming",
      options: options
    });
  }
}
