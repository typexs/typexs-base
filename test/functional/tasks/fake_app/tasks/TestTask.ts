import {ITask} from "../../../../../src";

export class TestTask implements ITask{
  name:string = 'test';

  description:string = 'Hallo welt';

  async exec(done:Function){
    done(null,{res:'okay'});
  }
}
