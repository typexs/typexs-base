//
// @UseAPI(TasksApi)
// export class TasksStorageExtension implements ITasksApi {
//
//   @Inject(Tasks.NAME)
//   tasks: Tasks;
//
//   @Inject(C_STORAGE_DEFAULT)
//   storageRef: StorageRef;
//
//
//
//   onError(state: TaskState): void {
//
//   }
//
//   async updateEntry(state: TaskState) {
//     let entry: TaskLog = await this.storageRef.getController().findOne(TaskLog, {
//       tasksId: state.tasksId,
//       taskName: state.name
//     });
//     if (!entry) {
//       entry = new TaskLog();
//       entry.tasksId = state.tasksId;
//       entry.taskName = state.name;
//     }
//     entry.started = state.start;
//     entry.stopped = state.stop;
//
//     entry = await this.storageRef.getController().save(entry);
//     return entry;
//   }
//
//   async onStart(state: TaskState): Promise<void> {
//
//   }
//
//   onProgress(state: TaskState): void {
//   }
//
//   onStop(state: TaskState): void {
//   }
//
//
//   onShutdown(): void {
//   }
//
//
// }
