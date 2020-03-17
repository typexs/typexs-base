import {ISaveOptions} from '../../storage/framework/ISaveOptions';


export interface IDistributedSaveOptions extends ISaveOptions {
  targetIds?: string[];
  
  timeout?: number;

  contollerHint?: { className?: string, name?: string };
}
