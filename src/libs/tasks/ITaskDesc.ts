import {IExchange} from "./decorators/IExchange";

export interface ITaskDesc {
  type: 'incoming' | 'outgoing' | 'runtime';
  target: Function;
  propertyName: string;
  options?: IExchange;
}
