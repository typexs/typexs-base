import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import {Scheduler} from "../../../src/libs/schedule/Scheduler";
import subscribe from "commons-eventbus/decorator/subscribe";
import {EventBus} from "commons-eventbus";
import {TestHelper} from "../TestHelper";
import {K_CLS_SCHEDULE_ADAPTER_FACTORIES, Log, RuntimeLoader} from "../../../src";
import moment = require("moment");
import {IScheduleFactory} from "../../../src/libs/schedule/IScheduleFactory";
import {Container} from "typedi";

let loader: RuntimeLoader = null;
let factories: IScheduleFactory[] = [];

@suite('functional/scheduler')
class SchedulerSpec {


  async before() {
    Bootstrap.reset();
    Log.options({enable: false})
    Config.clear();
    loader = new RuntimeLoader({
      appdir: __dirname + '/../../..',
      libs: [{
        topic: K_CLS_SCHEDULE_ADAPTER_FACTORIES,
        refs: [
          "src/adapters/scheduler/*Factory.*"
        ]
      }]
    });
    await loader.prepare()
    factories = loader.getClasses(K_CLS_SCHEDULE_ADAPTER_FACTORIES).map(x => Container.get(x));
  }


  @test
  async 'cron schedule'() {
    let scheduler = new Scheduler();
    await scheduler.prepare(factories);
    let schedule = await scheduler.register({
      name: 'test01',
      cron: '*/10 * * * *'
    });

    expect(schedule.name).to.eq('test01');
    expect(schedule.next).to.be.gt(new Date());
    expect(schedule.next).to.be.lt(moment(new Date()).add(10, "minutes").toDate());

    schedule = await scheduler.register({
      name: 'test02',
      cron: '*/10 * * * * *'
    });

    expect(schedule.name).to.eq('test02');
    expect(schedule.next).to.be.gt(new Date());
    expect(schedule.next).to.be.lt(moment(new Date()).add(10, "seconds").toDate());

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

    let listenr = new ActionListener();
    await EventBus.register(listenr);

    let scheduler = new Scheduler();
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

    let events: any[] = [];

    class ActionListener2 {
      @subscribe(ActionEvent2)
      onEvent(e: ActionEvent2) {
        Log.debug('event triggered');
        events.push(e);
      }
    }

    let listenr = new ActionListener2();
    await EventBus.register(listenr);

    let scheduler = new Scheduler();
    await scheduler.prepare(factories);
    let schedule = await scheduler.register({
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


}

