import {IWorkerStatisitic} from "./IWorkerStatisitic";


export interface IWorker {

  name: string;


  prepare(options?: any): void;


  finish(): void;


  statistic?(): IWorkerStatisitic;




}
