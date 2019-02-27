import {AsyncWorkerQueue, CryptUtils, IAsyncQueueOptions, IQueueProcessor, IQueueWorkload, Tasks} from "../..";
import {Inject} from "typedi";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TaskEvent} from "./TaskEvent";
import {EventBus} from "commons-eventbus";
import {Log} from "../logging/Log";
import {ITaskWorkload} from "./ITaskWorkload";


export class TaskWorkerQueue implements IQueueProcessor<ITaskWorkload> {

  inc: number = 0;

  queue: AsyncWorkerQueue<ITaskWorkload>;

  @Inject(Tasks.NAME)
  tasks: Tasks;


  async prepare(options: IAsyncQueueOptions = {name: 'taskworkerqueue'}) {
    this.queue = new AsyncWorkerQueue<ITaskWorkload>(this, options);
    await EventBus.register(this);
    Log.info('Waiting for tasks ...');
  }


  @subscribe(TaskEvent)
  onTaskEvent(event: TaskEvent) {
    let eventDate = new Date();
    let str = eventDate.toISOString() + '' + (this.inc++);
    let taskId = CryptUtils.shorthash(str);

    // TODO
    // * generate uuid to task
    // * push task in queue data
    // * return event


    return event;
  }


  do(workLoad: ITaskWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {

    //this.tasks.get(workLoad.name);

    return undefined;
  }

  onEmpty(): Promise<void> {
    return undefined;
  }


}
