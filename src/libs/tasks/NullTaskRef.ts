import {TaskRef} from './TaskRef';

export class NullTaskRef extends TaskRef {

  constructor() {
    super('null');
  }

  prepare(name: any = null, fn: object | Function = null) {

  }

  subtasks(): any[] {
    return [];
  }

  grouping(): any[] {
    return [];
  }

  groups(): any[] {
    return [];
  }

  group(name: string): this {
    return this;
  }

  dependsOn(name: string): this {
    return this;
  }

}
