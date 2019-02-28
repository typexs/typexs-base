import * as _ from 'lodash';
import {TaskRun} from "./TaskRun";
import {ITaskRuntimeContainer} from "./ITaskRuntimeContainer";


export class TaskRuntimeContainer implements ITaskRuntimeContainer {

  private readonly $_run_: TaskRun;

  private $results: any;

  private $progress: number = 0;

  private $limit: number = 100;

  private $total: any;


  constructor(taskRun: TaskRun) {
    this.$_run_ = taskRun;
    this.$results = null;
    this.$total = null;
  }


  private getRunner(){
    this.$_run_.getRunner()
  }



  progress(nr: number) {
    this.$progress = nr;
    //Log.debug(this.name + ': ' + Math.round((this.$progress / this.$total) * 100) +'%');
  }


  total(nr: number) {
    this.$total = nr;
  }




  get name() {
    return this.$_run_.taskRef().name;
  }


  get id() {
    return this.$_run_.id;
  }


  results(data: any) {
    return this.$results = data;
  }


  stats() {
    return {
      progress: this.$progress,
      total: this.$total,
      results: _.clone(this.$results)
    }
  }
}


