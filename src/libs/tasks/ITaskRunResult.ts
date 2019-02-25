export interface ITaskRunResult {
  name: string;
  id: number;
  created: Date;
  start: Date;
  stop: Date;

  results: any;
  error: Error;

}
