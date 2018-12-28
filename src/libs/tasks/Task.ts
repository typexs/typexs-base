import * as _ from 'lodash'
import {Tasks} from "./Tasks";

export  class Task {

  $options:any;
  $registry:any;
  $name:any;
  $source:any;
  $fn:Function;



  constructor(registry:Tasks, name:any, fn:Function = null, options:any = null) {
    this.$options = options || {};
    this.$registry = registry;
    this.$source = null;

    if(_.isString(name)){
      this.$name = name;
      this.$fn = fn;
    } else if(_.isObject(name)) {
      this.$name = name['name'];

      // this.$groups = name['groups'] || [];
      if(name['groups']){
        for(let group of name['groups']){
          this.group(group);
        }
      }

      this.$fn = name['exec'].bind(name);
      this.$source = name;
    } else {
      throw new Error('task wrong defined '+ name+ ' '+fn);
    }


    if (options && options['source'] != undefined) {
      this.$source = options['source'];
    }
  }


  name() {
    return this.$name
  }

  subtasks() {
    let tasks = [];

    for (let i = 0; i < this.$registry.$bindings.length; i++) {
      let obj = this.$registry.$bindings[i];
      if (obj.type == Tasks.CONST.GROUP && obj.dest == this.$name) {
        tasks.push(obj.src);
      }
    }
    return tasks;
  }

  dependencies() {
    let tasks = [];

    for (let i = 0; i < this.$registry.$bindings.length; i++) {
      let obj = this.$registry.$bindings[i];
      if (obj.type == Tasks.CONST.DEPENDS_ON && obj.dest == this.$name) {
        tasks.push(obj.src);
      }
    }
    return tasks;
  }


  dependsOn(name:string) {
    this.$registry.dependsOn(this.$name, name);
    return this;
  }

  group(name:string) {
    this.$registry.group(this.$name, name);
    return this;
  }

}


