import * as _ from "lodash";
import {TaskRef} from "./TaskRef";
import {TaskExchangeRef} from "./TaskExchangeRef";


export class TasksHelper {
  static getRequiredIncomings(tasks: TaskRef[], withoutPassThrough: boolean = false): TaskExchangeRef[] {
    let incoming: TaskExchangeRef[] = [];
    tasks.map(t => {
      t.getIncomings().map(x => {
        incoming.push(x);
      });
      if (!withoutPassThrough) {
        t.getOutgoings().map(x => {
          _.remove(incoming, i => i.storingName == x.storingName)
        });
      }
    });
    return incoming;
  }
}
