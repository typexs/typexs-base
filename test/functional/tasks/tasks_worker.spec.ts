import {suite, test} from 'mocha-typescript';


import {Bootstrap} from "../../../src/Bootstrap";
import {ITypexsOptions, Tasks} from "../../../src";
import {Container} from "typedi";
import {Config} from "commons-config";
import {TEST_STORAGE_OPTIONS} from "../config";
import {EventBus, IEventBusConfiguration} from "commons-eventbus";
import {TaskWorkerQueue} from "../../../src/libs/worker/TaskWorkerQueue";
import {SimpleWorkerTask} from "./tasks/SimpleWorkerTask";
import {TaskEvent} from "../../../src/libs/worker/TaskEvent";
import subscribe from "commons-eventbus/decorator/subscribe";
import {inspect} from "util";


@suite('functional/tasks/tasks_worker')
class Tasks_workerSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'worker on redis bus'() {
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'worker'},
        logging: {enable: true, level: 'debug'},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: TEST_STORAGE_OPTIONS},
        //cache: {bins: {default: 'redis1'}, adapter: {redis1: {type: 'redis', host: '127.0.0.1', port: 6379}}},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    class T {

      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        console.log(inspect(e, false, 10));
      }
    }

    let tasks: Tasks = Container.get(Tasks.NAME);
    let ref = tasks.addTask(SimpleWorkerTask);

    const worker = <TaskWorkerQueue>Container.get(TaskWorkerQueue);
    await worker.prepare();

    let t = new T();
    await EventBus.register(t);


    let taskEvent = new TaskEvent();
    taskEvent.nodeId = Bootstrap.getNodeId();
    taskEvent.name = ref.name;

    let res = await EventBus.post(taskEvent);
    console.log(inspect(res, false, 10));


    await worker.queue.await();


    await bootstrap.shutdown();
  }

}

