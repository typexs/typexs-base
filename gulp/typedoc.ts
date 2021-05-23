import {cloneDeep} from 'lodash';
import * as glob from 'glob';
import * as gulp from 'gulp';
import {readFileSync, writeFileSync} from 'fs';
import * as typedoc from 'gulp-typedoc';
import {join, resolve} from 'path';
// @ts-ignore


gulp.task('typedoc-cloudflare', function () {
  const root = resolve('.');
  const json = JSON.parse(readFileSync(join(root, 'typedoc.json')).toString()) as any;
  // console.log(json);
  const _copyJson = cloneDeep(json);
  const x = typedoc(json);
  x.on('end', () => {
    setTimeout(() => {
      const p = root + '/' + _copyJson.out + '/**/*.html';
      // console.log(p);
      const files = glob.sync(p);
      // console.log(files);
      for (const f of files) {
        const data = readFileSync(f).toString('utf-8');
        const newValue = data.replace(/\"(\.|\/)*assets/g, '\"/assets');
        writeFileSync(f, newValue, 'utf-8');
      }
    }, 15000);
  });
  return gulp.src(['src/**/*.ts'])
    .pipe(x);
});
