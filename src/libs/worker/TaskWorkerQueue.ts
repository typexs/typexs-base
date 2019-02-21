import {AsyncWorkerQueue, IAsyncQueueOptions, IQueueProcessor, IQueueWorkload, Tasks} from "../..";
import {Inject} from "typedi";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TaskEvent} from "./TaskEvent";
import {EventBus} from "commons-eventbus";
import {Log} from "../logging/Log";


export interface ITaskDesc extends IQueueWorkload {

  /**
   * Name of the task to run
   */
  name: string;
}


export class TaskWorkerQueue implements IQueueProcessor<ITaskDesc> {


  queue: AsyncWorkerQueue<ITaskDesc>;

  @Inject(Tasks.NAME)
  tasks: Tasks;


  async prepare(options: IAsyncQueueOptions = {name: 'taskworkerqueue'}) {
    this.queue = new AsyncWorkerQueue<ITaskDesc>(this, options);
    await EventBus.register(this);
    Log.info('Waiting for tasks ...');
  }


  @subscribe(TaskEvent)
  onTaskEvent(){
    // TODO
  }


  do(workLoad: ITaskDesc, queue?: AsyncWorkerQueue<any>): Promise<any> {

    //this.tasks.get(workLoad.name);

    return undefined;
  }

  onEmpty(): Promise<void> {
    return undefined;
  }


}
