import {join} from 'path';
import {strings} from '@angular-devkit/core';

import {apply, chain, mergeWith, Rule, SchematicContext, template, Tree, url} from '@angular-devkit/schematics';
import {Schema as ApplicationOptions} from './schema';

import * as fs from 'fs';
import {SimpleRegexCodeModifierHelper} from "../../../../libs/schematics/SimpleRegexCodeModifierHelper";

export default function (options: ApplicationOptions): Rule {
  return (host: Tree, context: SchematicContext) => {

    return chain([
      mergeWith(
        apply(url('./files'), [
          template({
            utils: strings,
            ...options,
            'dot': '.'
          }),
        ])),
      (tree: Tree, context: SchematicContext) => {
        let original_dir = tree['_host']['_root'];
        let overwrites: any[] = []

        tree.visit((path: string, entry) => {
          let filepath = join(original_dir, path)
          if (fs.existsSync(filepath)) {

            if (/package\.json/.test(path)) {
              let local = tree.read(path);
              let jsonNew = JSON.parse(local.toString('utf-8'));
              let json = JSON.parse(fs.readFileSync(filepath).toString('utf-8'));

              let updated = false;
              ['dependencies', 'devDependencies', 'scripts'].forEach(_key => {
                Object.keys(jsonNew[_key]).forEach(_d => {
                  if (!json[_key][_d]) {
                    json[_key][_d] = jsonNew[_key][_d];
                    updated = true;
                  }
                });
              });

              tree.delete(path);
              if (updated) {
                overwrites.push({path: path, content: JSON.stringify(json, null, 2)})
              }
            // } else if (/gulpfile\.ts/.test(path)) {
            //   let local = tree.read(path);
            //   let localStr = local.toString('utf-8');
            //   let exist = fs.readFileSync(filepath).toString('utf-8');
            //   let newContent = SimpleRegexCodeModifierHelper.copyMethods(exist, localStr);
            //   newContent = SimpleRegexCodeModifierHelper.copyImports(newContent, localStr);
            //   tree.delete(path);
            //   if (newContent.length !== exist.length) {
            //     overwrites.push({path: path, content: newContent});
            //   }
            } else {
              // compare?
              tree.delete(path);
            }
          }
        });

        tree = Tree.optimize(tree);

        overwrites.forEach(x => {
          tree.overwrite(x.path, x.content)
        });

        return tree;
      },
    ])(host, context);
  };
}
