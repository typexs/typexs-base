import {ISubModule} from '@allgemein/moduls/registry/ISubModule';

export interface IModule {
  name: string;
  version: string;
  path: string;
  weight: number;
  dependencies: any;
  child_modules: string[];
  internal: boolean;
  main: string;
  sub_modules: {
    [subpath: string]: ISubModule;
  };
  submodule: boolean;
  settings?: any;
  enabled?: boolean;
}
