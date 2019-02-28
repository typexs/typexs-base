export interface ITask {

  name?: string;

  groups?: string[];

  exec(done: (err: Error, res: any) => void): void;
}
