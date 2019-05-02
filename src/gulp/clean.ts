import * as gulp from "gulp";
const del = require("del");


gulp.task('clean',(cb:Function)=> {
  return del(["./build/**"], cb);
});
