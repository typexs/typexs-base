import {IAsyncQueueStats} from "../queue/IAsyncQueueStats";

export interface IWorkerStatisitic {

  stats: IAsyncQueueStats;

  paused: boolean;

  idle: boolean;

  occupied: boolean;

  running: boolean;

}
