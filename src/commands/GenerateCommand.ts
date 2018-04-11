import {RuntimeLoader} from "../base/RuntimeLoader";
import {Inject} from "typedi";
import {Config} from "commons-config";
import {terminal,} from '@angular-devkit/core';
import * as _ from 'lodash';

import {PlatformUtils,FileUtils} from "commons-base";
import {SchematicsExecutor} from "../index";

export class GenerateCommand {


  @Inject('RuntimeLoader')
  loader: RuntimeLoader;


  command = "generate [schematic] [collection]";

  aliases = "g";

  describe = "Generate schematics";


  builder(yargs: any) {
    return yargs
  }

  async handler(argv: any) {

    let _argv = Config.get('argv');
    let infos = await this.loader.getSchematicsInfos();

    if (!argv.schematic) {
      console.log(terminal.yellow('No schematic selected.') + '\n\nSelect one of the following:\n');
      for (let info of infos) {
        let out = '  ' + info.name + '\n';

        for (let collName in info.collection.schematics) {
          let def = info.collection.schematics[collName];
          out += '   - ' + collName + '\n';
          out += '     ' + def.description + '\n';

        }
        console.log(out);
      }
    } else {
      let res = _.filter(infos, x => {
        let _x = _.has(x.collection.schematics, argv.schematic);
        if (argv.collection) {
          return _x && x.name === argv.collection;
        }
        return _x;
      });

      if (res.length === 1) {
        // okay!
        let info = res.shift();

        let defSchematic = info.collection.schematics[argv.schematic];
        let schema = await FileUtils.getJson(PlatformUtils.join(info.path, defSchematic.schema));

        if (_argv.schema) {
          console.log(schema);

        } else {
          console.log('\n'+argv.schematic + ' from  '+info.name+'\n');

          let workdir = _argv.workdir ? _argv.workdir : '.';
          let appdir = _argv.appdir ? _argv.appdir : '.';

          let requiredChecked = true;

          if(schema.required){
            for(let r of schema.required){
              if(!_.has(_argv,r)){
                requiredChecked = false;
                console.log(' - required parameter \"'+r+'\" is not set');
              }
            }
          }

          if(requiredChecked){

            let executor = new SchematicsExecutor({
              workdir: PlatformUtils.pathResolve(workdir),
              basedir: PlatformUtils.pathResolve(appdir),
              collectionName: info.internal || info.submodule ? info.path : info.name,
              schematicName: argv.schematic,
              argv: _argv
            });

            try {
              await executor.run();
            } catch (e) {
              console.error(e);
            }

          }else{
            console.log('\nMissing required parameter. Processing skipped.\n');
          }
        }

      } else if (res.length > 1) {
        console.log('more then one results (' + res.length + ') for ' +
          'schematic ' + argv.schematic + '. Append collection name to reduce results.');
      } else {
        console.log('No schematic with this name found.')
      }
    }


  }
}

