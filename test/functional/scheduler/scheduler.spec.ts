import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {Scheduler} from '../../../src/libs/schedule/Scheduler';
import {EventBus, subscribe} from 'commons-eventbus';
import {TestHelper} from '../TestHelper';
import {IScheduleFactory} from '../../../src/libs/schedule/IScheduleFactory';
import {SimpleTask} from '../tasks/tasks/SimpleTask';
import {RuntimeLoader} from '../../../src/base/RuntimeLoader';
import {Log} from '../../../src/libs/logging/Log';
import {K_CLS_SCHEDULE_ADAPTER_FACTORIES} from '../../../src/libs/Constants';
import {Invoker} from '../../../src/base/Invoker';
import {TasksApi} from '../../../src/api/Tasks.api';
import {Tasks} from '../../../src/libs/tasks/Tasks';
import {TaskRunnerRegistry} from '../../../src/libs/tasks/TaskRunnerRegistry';
import {RegistryFactory} from '@allgemein/schema-api';
import {Injector} from '../../../src/libs/di/Injector';
import {C_TASKS} from '../../../src/libs/tasks/Constants';
import {DateTime} from 'luxon';

let loader: RuntimeLoader = null;
let factories: IScheduleFactory[] = [];

@suite('functional/scheduler')
class SchedulerSpec {

  static after() {
    Injector.reset();
  }


  async before() {
    Bootstrap.reset();
    Log.options({enable: false, level: 'debug'});
    Config.clear();
    loader = new RuntimeLoader({
      appdir: __dirname + '/../../..',
      libs: [{
        topic: K_CLS_SCHEDULE_ADAPTER_FACTORIES,
        refs: [
          'src/adapters/scheduler/*Factory.*'
        ]
      }]
    });
    await loader.prepare();
    factories = loader.getClasses(K_CLS_SCHEDULE_ADAPTER_FACTORIES).map(x => Injector.get(x));


    const i = new Invoker();
    Injector.set(Invoker.NAME, i);
    i.register(TasksApi, []);


    RegistryFactory.remove(C_TASKS);
    RegistryFactory.register(/^tasks\.?/, Tasks);

    const tasks = RegistryFactory.get(C_TASKS) as Tasks;
    Injector.set(Tasks.NAME, tasks);

    const registry = new TaskRunnerRegistry();
    Injector.set(TaskRunnerRegistry.NAME, registry);

  }


  @test
  async 'cron schedule'() {
    const scheduler = new Scheduler();
    await scheduler.prepare(factories);
    let schedule = await scheduler.register({
      name: 'test01',
      cron: '*/10 * * * *'
    });

    expect(schedule.name).to.eq('test01');
    expect(schedule.next).to.be.gt(new Date());
    expect(schedule.next).to.be.lt(DateTime.fromJSDate(new Date()).plus({minutes: 10}).toJSDate());

    schedule = await scheduler.register({
      name: 'test02',
      cron: '*/10 * * * * *'
    });

    expect(schedule.name).to.eq('test02');
    expect(schedule.next).to.be.gt(new Date());
    expect(schedule.next).to.be.lt(DateTime.fromJSDate(new Date()).plus({seconds: 10}).toJSDate());

    await scheduler.shutdown();

  }


  @test
  async 'event exec'() {

    class ActionEvent {
      field: string;
    }

    let events: any[] = [];

    class ActionListener {
      @subscribe(ActionEvent)
      onEvent(e: ActionEvent) {
        Log.debug('event triggered');
        events.push(e);
      }
    }

    const listenr = new ActionListener();
    await EventBus.register(listenr);

    const scheduler = new Scheduler();
    await scheduler.prepare(factories);
    let schedule = await scheduler.register({
      name: 'test01',
      event: {
        name: 'action_event'
      }
    });

    await schedule.runSchedule();
    await TestHelper.waitFor(() => events.length > 0);
    expect(events).to.have.length(1);
    events = [];

    schedule = await scheduler.register({
      name: 'test02',
      event: {
        name: 'action_event',
        params: {field: 'data'}
      }
    });

    await schedule.runSchedule();
    await TestHelper.waitFor(() => events.length > 0);
    expect(events).to.have.length(1);
    expect(events[0].field).to.be.eq('data');

    await EventBus.unregister(listenr);
    await scheduler.shutdown();
  }


  @test
  async 'schedule event on cron pattern'() {

    class ActionEvent2 {
      field: string;
    }

    const events: any[] = [];

    class ActionListener2 {
      @subscribe(ActionEvent2)
      onEvent(e: ActionEvent2) {
        Log.debug('event triggered');
        events.push(e);
      }
    }

    const listenr = new ActionListener2();
    await EventBus.register(listenr);

    const scheduler = new Scheduler();
    await scheduler.prepare(factories);
    const schedule = await scheduler.register({
      name: 'test01',
      event: {
        name: 'action_event_2'
      },
      cron: '*/1 * * * * *'
    });

    await TestHelper.waitFor(() => events.length > 0);
    expect(events).to.have.length(1);

    await EventBus.unregister(listenr);
    await scheduler.shutdown();
  }


  @test
  async 'default schedule'() {
    const scheduler = new Scheduler();
    await scheduler.prepare(factories);

    let schedule = await scheduler.register({
      name: 'test01',
      offset: '5s'
    });

    clearTimeout(schedule.timer);
    let now = new Date();

    expect(schedule.name).to.eq('test01');
    expect(schedule.next).to.be.gt(now);
    expect(schedule.next).to.be.lte(DateTime.fromJSDate(now).toUTC().plus({minutes: 5}).toJSDate());

    schedule = await scheduler.register({
      name: 'test02',
      offset: '5m'
    });

    clearTimeout(schedule.timer);
    now = new Date();

    expect(schedule.name).to.eq('test02');
    expect(schedule.next).to.be.gt(now);
    expect(schedule.next).to.be.lte(DateTime.fromJSDate(now).toUTC().plus({minutes: 5}).toJSDate());


    schedule = await scheduler.register({
      name: 'test03',
      offset: '10m',
      start: '10:00'
    });
    clearTimeout(schedule.timer);
    now = new Date();

    expect(schedule.name).to.eq('test03');
    expect(schedule.next).to.be.gt(now);
    expect(schedule.next).to.be.lte(DateTime.fromJSDate(now).toUTC().plus({hours: 23}).toJSDate());


    const str = DateTime.now().plus({days: 1}).minus({hours: 1}).toISO();
    schedule = await scheduler.register({
      name: 'test04',
      offset: '10m',
      start: str
    });
    clearTimeout(schedule.timer);
    now = new Date();

    expect(schedule.name).to.eq('test04');
    expect(schedule.next).to.be.gte(DateTime.fromJSDate(now).plus({days: 1}).minus({hours: 2}).toJSDate());
    expect(schedule.next).to.be.lte(DateTime.fromJSDate(now).plus({days: 2}).toJSDate());
    await scheduler.shutdown();

  }

  @test
  async 'execute task'() {
    const tasks = RegistryFactory.get(C_TASKS) as Tasks;
    tasks.setNodeId('testnode');
    const taskRef = tasks.addTask(SimpleTask);
    Injector.set(Tasks.NAME, tasks);

    const scheduler = new Scheduler();
    await scheduler.prepare(factories);
    const schedule = await scheduler.register({
      name: 'test01',
      task: {
        name: 'simple_task',
        remote: false
      }
    });

    await schedule.runSchedule();
    expect(schedule.lastResults).to.not.be.null;
    expect(schedule.lastResults.tasks).to.be.deep.eq(['simple_task']);
  }


}


