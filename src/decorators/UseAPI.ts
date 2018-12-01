import {MetaArgs} from "..";
import {K_CLS_USE_API} from "../libs/Constants";

interface ApiProviderEntry {
  target: Function;
  api: Function;
}

export function UseAPI(api: Function) {
  return function (o: any) {
    MetaArgs.key(K_CLS_USE_API).push(<ApiProviderEntry>{
      target: o,
      api: api
    });
  }
}
