import * as _ from "lodash";
import {EventBus} from "commons-eventbus";
import {Schedule} from "../../libs/schedule/Schedule";
import EventBusMeta from "commons-eventbus/bus/EventBusMeta";
import {IScheduleFactory} from "../../libs/schedule/IScheduleFactory";
import {IScheduleDef} from "../../libs/schedule/IScheduleDef";

export interface IEventSchedule {
  name: string;
  params: any;
}


export class EventScheduleFactory implements IScheduleFactory {


  create(clazz: Function, params: any = {}) {
    return async function () {
      let event = Reflect.construct(clazz, []);
      _.assign(event, params);
      await EventBus.post(event);
    }
  }


  async attach(schedule: Schedule): Promise<boolean> {
    let event: IEventSchedule = _.get(schedule.options, 'event', null);
    if (event) {
      let def = EventBusMeta.$().findEvent(event.name);
      if (def) {
        schedule.execute = this.create(def.clazz, event.params ? event.params : {});
      }
    }
    return false;
  }


  async detect(opts: IScheduleDef) {
    return _.has(opts, 'event');
  }


  async isAvailable() {
    return true;
  }


}
