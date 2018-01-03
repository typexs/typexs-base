

import {IQueueWorkload} from "./IQueueWorkload";
import {AsyncWorkerQueue} from "./AsyncWorkerQueue";


export interface IQueueProcessor<T extends IQueueWorkload> {

    do(workLoad: T, queue?:AsyncWorkerQueue<any>): Promise<any>;

    onEmpty?(): Promise<void>
}
