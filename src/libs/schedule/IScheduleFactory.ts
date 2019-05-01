import {Schedule} from "./Schedule";
import {IScheduleDef} from "./IScheduleDef";


export interface IScheduleFactory {

  isAvailable(): Promise<boolean>;

  detect(def: IScheduleDef): Promise<boolean>;

  attach(schedule: Schedule): Promise<boolean>;
}
