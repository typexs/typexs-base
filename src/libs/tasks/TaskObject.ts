import * as _ from 'lodash';
import {TaskRun} from "./TaskRun";


export  class TaskObject {

  readonly $_run_:TaskRun;
  $results:any;
  $progress:any;
  $total:any;

  constructor(taskRun:TaskRun){
    this.$_run_ = taskRun;
    this.$results = null;
    this.$progress = null;
    this.$total = null;
  }


  name() {
    return this.$_run_.task().name();
  }

  id() {
    return this.$_run_.id;
  }

  results(data:any) {
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


