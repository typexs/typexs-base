import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";


@suite('functional/bootstrap/general')
class BootstrapGeneralSpec {


  @test
  async 'add additional config options'() {

    let cfg = Bootstrap.addConfigOptions({
      workdir: __dirname
    });

    expect(cfg.workdir).to.eq(__dirname);

    cfg = Bootstrap.addConfigOptions({
      configs: [{type: 'file', file: './config/super.json'}]
    });

    expect(cfg.configs).to.deep.include({
      type: 'file',
      file: './config/super.json'
    });

    Bootstrap.configure();

    let data = Config.jar().get('');
    expect(data).to.deep.eq({
      app: {name: 'boottest'},
      appdata: {loaded: true},
      super: 'yes'
    });
  }


}

