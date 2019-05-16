import * as fs from 'fs';
import * as glob from 'glob';
import * as gulp from 'gulp';

const m = require("merge-stream");
import * as ts from "gulp-typescript";


const bump = require('gulp-bump');

const shell = require("gulp-shell");
const replace = require("gulp-replace");
const sourcemaps = require("gulp-sourcemaps");
//const ts = require("gulp-typescript");


gulp.task('compile', () => {
  return gulp.src("package.json", {read: false})
    .pipe(shell(["tsc"]));
});


// -------------------------------------------------------------------------
// Create / Update index.ts
// -------------------------------------------------------------------------

/**
 * Generate index.ts declaration
 */
gulp.task('generateIndexTs', () => {
  let _glob = glob.sync('src/**').filter((f: string) => /\.ts$/.test(f) && !/^(src\/packages|src\/index\.ts$)/.test(f));
  let forIndexTs: string[] = ['// ---- Generated by gulp taskRef ----'];
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
    if (!/\/\/ index\.ts ignore/.test(fs.readFileSync(f).toString('utf-8'))) {
      forIndexTs.push(`export * from "./${f.replace(/(^src\/)|((\.d)?\.ts$)/g, '')}";`);
    }
  });
  fs.writeFileSync('./src/index.ts', forIndexTs.join('\n'));
  return;
});


// -------------------------------------------------------------------------
// Package
// -------------------------------------------------------------------------

/**
 * Copies all sources to the package directory.
 */

gulp.task('packageCompile', () => {
  const tsProject = ts.createProject("tsconfig.json");
  const tsResult = gulp.src([
    "./src/**/*.ts",
    "!./src/**/files/*.ts",
    //"./node_modules/@types/**/*.ts"
  ])
    .pipe(sourcemaps.init())
    .pipe(tsProject());

  return m(
    tsResult.dts.pipe(gulp.dest("./build/package")),
    tsResult.js
      .pipe(sourcemaps.write(".", {sourceRoot: "", includeContent: true}))
      .pipe(gulp.dest("./build/package"))
  );
})

/**
 * Removes /// <reference from compiled sources.
 */
gulp.task('packageReplaceReferences', () => {
  return gulp.src("./build/package/**/*.d.ts")
    .pipe(replace(`/// <reference types="node" />`, ""))
    .pipe(replace(`/// <reference types="chai" />`, ""))
    .pipe(gulp.dest("./build/package"));
});

/**
 * Copies README.md into the package.
 */
gulp.task('packageCopyReadme', () => {
  return gulp.src("./README.md")
    .pipe(replace(/```typescript([\s\S]*?)```/g, "```javascript$1```"))
    .pipe(gulp.dest("./build/package"));
});

/**
 * Copies README.md into the package.
 */
gulp.task('packageCopyJsons', () => {
  return gulp.src("./src/**/*.json").pipe(gulp.dest("./build/package"));
})

/**
 * Copies README.md into the package.
 */
gulp.task('packageCopyFiles', () => {
  return gulp.src("./src/**/files/*").pipe(gulp.dest("./build/package"));
});

/**
 * Copies Bin files.
 */
gulp.task('packageCopyBin', () => {
  return gulp.src("./bin/*").pipe(gulp.dest("./build/package/bin"));
});


/**
 * Copy package.json file to the package.
 */
gulp.task('packagePreparePackageFile', () => {
  return gulp.src("./package.json")
    .pipe(replace("\"private\": true,", "\"private\": false,"))
    .pipe(gulp.dest("./build/package"));
});


/**
 * Creates a package that can be published to npm.
 */
gulp.task('package', gulp.series(
  "clean",
  "packageCompile",
  "packageCopyBin",
  "packageCopyJsons",
  "packageCopyFiles",
  "packageReplaceReferences",
  "packagePreparePackageFile",
  "packageCopyReadme"
));

/**
 * Creates a package that can be published to npm.
 */
gulp.task('packageNoClean', gulp.series(
  "packageCompile",
  gulp.parallel(
    "packageCopyBin",
    "packageCopyJsons",
    "packageCopyFiles",
    "packageReplaceReferences",
    "packagePreparePackageFile",
    "packageCopyReadme")
));


// gulp.task('watchPackage', () => {
//   return watch(["src/**/*.(ts|json|css|scss)"], {ignoreInitial: true, read: false}, (file: any) => {
//     sequence(["packageNoClean"]);
//   })
// });


// -------------------------------------------------------------------------
// Main Packaging and Publishing tasks
// -------------------------------------------------------------------------

/**
 * Publishes a package to npm from ./build/package directory.
 */
gulp.task('packagePublish', () => {
  return gulp.src("package.json", {read: false})
    .pipe(shell([
      "cd ./build/package && npm publish --access=public"
    ]));
});

/**
 * Publishes a package to npm from ./build/package directory with @next tag.
 */
gulp.task('packagePublishNext', () => {
  return gulp.src("package.json", {read: false})
    .pipe(shell([
      "cd ./build/package && npm publish --tag next --access=public"
    ]));
});


// -------------------------------------------------------------------------
// Versioning
// -------------------------------------------------------------------------

gulp.task('vpatch', () => {
  return gulp.src('package.json')
    .pipe(bump({type: "patch"}))
    .pipe(gulp.dest('./'));
});

gulp.task('vminor', () => {
  return gulp.src('package.json')
    .pipe(bump({type: "minor"}))
    .pipe(gulp.dest('./'));
});

gulp.task('vmajor', () => {
  return gulp.src('package.json')
    .pipe(bump({type: "major"}))
    .pipe(gulp.dest('./'));
});
