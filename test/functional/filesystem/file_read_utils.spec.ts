import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {FileReadUtils} from '../../../src/libs/filesystem/FileReadUtils';
import {FileUtils} from '@allgemein/base';


@suite('functional/filesystem/file_read_utils')
class FileReadUtilsSpec {


  @test
  async 'tail file content'() {
    const filename = __dirname + '/data/data_01.txt';

    let tailed: any = await FileReadUtils.tail(filename, 5);
    expect(tailed.split('\n')).to.have.length(6);
    expect(tailed).to.contain('delenit augue duis dolore te feugait nulla facilisi.\n');

    tailed = <string>await FileReadUtils.tail(filename, 2);
    expect(tailed.split('\n')).to.have.length(3);
    expect(tailed).to.contain('delenit augue duis dolore te feugait nulla facilisi.\n');

    const path = __dirname + '/data/tail_oneline_test.log';
    await FileUtils.writeFileSync(path, 'delenit augue duis dolore te feugait nulla facilisi.');
    tailed = <string>await FileReadUtils.tail(path, 1);
    expect(tailed).to.be.eq('delenit augue duis dolore te feugait nulla facilisi.');
  }


  @test
  async 'select file content'() {
    const filename = __dirname + '/data/data_01.txt';

    const firstLine: string = <string>await FileReadUtils.less(filename, 0, 1);
    expect(firstLine.split('\n')).to.have.length(1);
    expect(firstLine).to.contain('Lorem ipsum dolor sit amet, consetetur sadipscing elitr,');

    const secondLine: string = <string>await FileReadUtils.less(filename, 1, 1);
    expect(secondLine.split('\n')).to.have.length(1);
    expect(secondLine).to.contain('sed diam nonumy eirmod tempor invidunt ut labore et dolore');

    const paragraph: string = <string>await FileReadUtils.less(filename, 14, 5);
    expect(paragraph.split('\n')).to.have.length(5);
    expect(paragraph).to.contain(
      'Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit\n' +
      'amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy\n' +
      'eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.\n' +
      'At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd\n' +
      'gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem');

    const end: string = <string>await FileReadUtils.less(filename, 35, 10);
    expect(end.split('\n')).to.have.length(2);
    expect(end).to.contain(
      'accumsan et iusto odio dignissim qui blandit praesent luptatum zzril\n' +
      'delenit augue duis dolore te feugait nulla facilisi.');


    const end2: string = <string>await FileReadUtils.less(filename, 35, 2);
    expect(end2.split('\n')).to.have.length(2);
    expect(end2).to.contain(
      'accumsan et iusto odio dignissim qui blandit praesent luptatum zzril\n' +
      'delenit augue duis dolore te feugait nulla facilisi.');


    const all: string = <string>await FileReadUtils.less(filename, 0, 0);
    expect(all.split('\n')).to.have.length(37);

    const allFrom: string = <string>await FileReadUtils.less(filename, 10, 0);
    expect(allFrom.split('\n')).to.have.length(27);

  }


}
