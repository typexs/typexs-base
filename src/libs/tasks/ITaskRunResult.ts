export interface ITaskRunResult {

  id: number;

  name: string;

  created: Date;

  start: Date;

  stop: Date;

  duration:number;

  progress?: number;

  total?:number;

  incoming?: any;

  outgoing?: any;

  result: any;

  error: Error;

  has_error:boolean;

}
