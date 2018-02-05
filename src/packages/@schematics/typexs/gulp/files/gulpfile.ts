import {Gulpclass, Task, SequenceTask, MergedTask} from "gulpclass";
import * as fs from 'fs';

const gulp = require("gulp");
const bump = require('gulp-bump');
const del = require("del");
const glob = require("glob");
const shell = require("gulp-shell");
const replace = require("gulp-replace");
const sourcemaps = require("gulp-sourcemaps");
const ts = require("gulp-typescript");


@Gulpclass()
export class Gulpfile {
  /**
   * Cleans build folder.
   */
  @Task()
  clean(cb: Function) {
    return del(["./build/**"], cb);
  }

  /**
   * Runs typescript files compilation.
   */
  @Task()
  compile() {
    return gulp.src("package.json", {read: false})
      .pipe(shell(["tsc"]));
  }

  // -------------------------------------------------------------------------
  // Create / Update index.ts
  // -------------------------------------------------------------------------

  /**
   * Generate index.ts declaration
   */
  @Task()
  generateIndexTs() {
    let _glob = glob.sync('src/**').filter((f: string) => /\.ts$/.test(f) && !/^(src\/packages|src\/index\.ts$)/.test(f));
    let forIndexTs: string[] = ['// ---- Generated by gulp task ----'];
    let indexTs = '';
    let settings: any = {};
    if (fs.existsSync('./.typexs.json')) {
      settings = require('./.typexs.json');
      if (settings.packageExports) {
        settings.packageExports.forEach((f: string) => {
          forIndexTs.push(`export * from "${f}";`);
        })
      }
    }
    _glob.forEach((f: string) => {
      if(!/\/\/ index\.ts ignore/.test(fs.readFileSync(f).toString('utf-8'))){
        forIndexTs.push(`export * from "./${f.replace(/(^src\/)|((\.d)?\.ts$)/g,'')}";`);
      }
    });
    fs.writeFileSync('./src/index.ts',forIndexTs.join('\n'));
    return;
  }


  // -------------------------------------------------------------------------
  // Package
  // -------------------------------------------------------------------------

  /**
   * Copies all sources to the package directory.
   */
  @MergedTask()
  packageCompile() {
    const tsProject = ts.createProject("tsconfig.json", {typescript: require("typescript")});
    const tsResult = gulp.src(["./src/**/*.ts", "./node_modules/@types/**/*.ts"])
      .pipe(sourcemaps.init())
      .pipe(tsProject());

    return [
      tsResult.dts.pipe(gulp.dest("./build/package")),
      tsResult.js
        .pipe(sourcemaps.write(".", {sourceRoot: "", includeContent: true}))
        .pipe(gulp.dest("./build/package"))
    ];
  }

  /**
   * Removes /// <reference from compiled sources.
   */
  @Task()
  packageReplaceReferences() {
    return gulp.src("./build/package/**/*.d.ts")
      .pipe(replace(`/// <reference types="node" />`, ""))
      .pipe(replace(`/// <reference types="chai" />`, ""))
      .pipe(gulp.dest("./build/package"));
  }

  /**
   * Copies README.md into the package.
   */
  @Task()
  packageCopyReadme() {
    return gulp.src("./README.md")
      .pipe(replace(/```typescript([\s\S]*?)```/g, "```javascript$1```"))
      .pipe(gulp.dest("./build/package"));
  }


  /**
   * Copies Bin files.
   */
  @Task()
  packageCopyBin() {
    if (require('fs').existsSync('./bin')) {
      return gulp.src("./bin/*").pipe(gulp.dest("./build/package/bin"));
    } else {
      return;
    }
  }


  /**
   * Copy package.json file to the package.
   */
  @Task()
  packagePreparePackageFile() {
    return gulp.src("./package.json")
      .pipe(replace("\"private\": true,", "\"private\": false,"))
      .pipe(gulp.dest("./build/package"));
  }


  /**
   * Creates a package that can be published to npm.
   */
  @SequenceTask()
  package() {
    return [
      "clean",
      "packageCompile",
      [
        "packageCopyBin",
        "packageReplaceReferences",
        "packagePreparePackageFile",
        "packageCopyReadme",
      ],
    ];
  }

  // -------------------------------------------------------------------------
  // Main Packaging and Publishing tasks
  // -------------------------------------------------------------------------

  /**
   * Publishes a package to npm from ./build/package directory.
   */
  @Task()
  packagePublish() {
    return gulp.src("package.json", {read: false})
      .pipe(shell([
        "cd ./build/package && npm publish"
      ]));
  }

  /**
   * Publishes a package to npm from ./build/package directory with @next tag.
   */
  @Task()
  packagePublishNext() {
    return gulp.src("package.json", {read: false})
      .pipe(shell([
        "cd ./build/package && npm publish --tag next"
      ]));
  }



  @Task()
  buildIndexTs() {

  }

  // -------------------------------------------------------------------------
  // Versioning
  // -------------------------------------------------------------------------

  @Task()
  vpatch() {
    return gulp.src('package.json')
      .pipe(bump({type: "patch"}))
      .pipe(gulp.dest('./'));
  }

  @Task()
  vminor() {
    return gulp.src('package.json')
      .pipe(bump({type: "minor"}))
      .pipe(gulp.dest('./'));
  }

  @Task()
  vmajor() {
    return gulp.src('package.json')
      .pipe(bump({type: "major"}))
      .pipe(gulp.dest('./'));
  }


}
