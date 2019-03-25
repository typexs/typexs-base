import {Inject} from "typedi";
import {Workers} from "../libs/worker/Workers";


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
    // worker are started in Startup if defined
  }

}

