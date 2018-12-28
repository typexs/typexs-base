export class TestTask {
  name:string = 'test';

  async exec(done:Function){
    done(null,{res:'okay'});
  }
}
