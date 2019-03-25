import {UseAPI} from "../decorators/UseAPI";
import {Inject} from "typedi";
import {Bootstrap, ITasksApi, StorageRef, Tasks, TasksApi} from "..";
import {TaskState} from "../libs/tasks/TaskState";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TaskEvent} from "../libs/tasks/worker/TaskEvent";
import {TaskLog} from "../entities/TaskLog";

@UseAPI(TasksApi)
export class TasksStorageExtension implements ITasksApi {

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject('storage.default')
  storageRef: StorageRef;


  @subscribe(TaskEvent)
  onTaskEvent(event: TaskEvent) {
    if (event.nodeId == Bootstrap.getNodeId()) return;
    // listen only on extern tasks
  }

  onError(state: TaskState): void {

  }

  async updateEntry(state: TaskState) {
    let entry:TaskLog = await this.storageRef.getController().findOne(TaskLog, {tasksId: state.tasksId, taskName: state.name});
    if (!entry) {
      entry = new TaskLog();
      entry.tasksId = state.tasksId;
      entry.taskName = state.name;
    }
    entry.started = state.start;
    entry.finished = state.stop;

    entry = await this.storageRef.getController().save(entry);
    return entry;
  }

  async onStart(state: TaskState): Promise<void> {

  }

  onProgress(state: TaskState): void {
  }

  onStop(state: TaskState): void {
  }


  onShutdown(): void {
  }


}
