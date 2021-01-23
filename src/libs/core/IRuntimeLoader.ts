import {IModuleRegistry} from '@allgemein/moduls';

export interface IRuntimeLoader {

  prepare?(): any;

  getOptions?(): any;

  getRegistry(): IModuleRegistry;

  getDisabledModuleNames(): string[];

  getSettings(key: string): any;

  getClasses(topic: string): Function[];
}
