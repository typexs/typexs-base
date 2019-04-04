import {Inject} from "typedi";
import {Workers} from "../libs/worker/Workers";
import {Log} from "../libs/logging/Log";


export class WorkerCommand {


  @Inject(Workers.NAME)
  workers: Workers;

  command = "worker";

  aliases = "w";

  describe = "Handle worker";

  builder(yargs: any) {
    return yargs
  }


  async handler(argv: any) {
    // worker are started in Startup if defined neewer

    if (this.workers.workers.length > 0) {
      Log.info(this.workers.workers.length + ' workers are online.')
      await new Promise(resolve => {
      });
    } else {
      console.log('No workers found.')
    }

  }

}

