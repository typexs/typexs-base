

export class Activator {
  name:string;
  done:boolean = false;
  constructor(){
    this.name = 'base';
  }

  startup(){
    this.done = true;

  }
}
