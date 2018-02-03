import {join} from 'path';
import * as _ from 'lodash';
import * as fs from 'fs';

import {strings} from '@angular-devkit/core';

import {apply, chain, filter, mergeWith, Rule, SchematicContext, template, Tree, url} from '@angular-devkit/schematics';
import {Schema as ApplicationOptions} from './schema';
import {Config} from "commons-config";
import {PlatformUtils} from "commons-base";

export default function (options: ApplicationOptions): Rule {
  return (host: Tree, context: SchematicContext) => {

    let appdir = options['appdir'] || Config.get('app.path', process.cwd());
    appdir = PlatformUtils.pathResolve(appdir);

    options.name = options.name || Config.get('app.name', 'new-txs-app');

    return chain([
      mergeWith(
        apply(url('./files'), [
          template({
            utils: strings,
            ...options,
            'dot': '.'
          }),
          filter((path: string) => {
            let filepath = join(appdir, path);
            return !PlatformUtils.fileExist(filepath);
          })
        ])),
      (tree: Tree, context: SchematicContext) => {

        let overwrites: any[] = []
        let filepath = join(appdir, 'package.json');

        if (PlatformUtils.fileExist(filepath)) {
          let path = '/package.json'
          let localPath = join(__dirname,'files', 'package.json');
          let jsonNew = JSON.parse(fs.readFileSync(localPath).toString('utf-8'));
          let json = JSON.parse(fs.readFileSync(filepath).toString('utf-8'));

          let updated = false;
          ['dependencies', 'devDependencies', 'scripts'].forEach(_key => {
            Object.keys(jsonNew[_key]).forEach(_d => {
              if (!_.has(json[_key],_d)) {
                json[_key][_d] = jsonNew[_key][_d];
                updated = true;
              }
            });
          });
          if (updated) {
            overwrites.push({path: path, content: JSON.stringify(json, null, 2)})
          }
          overwrites.forEach(x => {
            tree.overwrite(x.path, x.content)
          });
        }
        return tree;
      },
    ])(host, context);
  };
}
