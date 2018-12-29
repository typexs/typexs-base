export interface ITask {
  name: string;

  exec(done: Function): void;
}
