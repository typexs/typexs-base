import {K_CLS_USE_API} from '../libs/Constants';
import {MetaArgs} from '@allgemein/base';

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
  };
}
