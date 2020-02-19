import * as _ from 'lodash';
import * as fs from 'fs';
import {FileUtils} from 'commons-base';
import {AbstractExchange} from '../../../libs/messaging/AbstractExchange';
import {IMessageOptions} from '../../../libs/messaging/Message';
import {FileResponse} from './FileResponse';
import {FileRequest} from './FileRequest';


export class FileExchange extends AbstractExchange<FileRequest, FileResponse> {

  constructor() {
    super(FileRequest, FileResponse);
  }


  async file(path: string, opts: IMessageOptions = {}) {
    const r = new FileRequest();
    r.path = path;
    const msg = this.create(opts);
    return await msg.run(r);
  }


  async handleRequest(request: FileRequest, res: FileResponse) {
    if (_.isEmpty(request) || _.isEmpty(request.path)) {
      res.error = new Error('no path in request');
      return;
    }

    if (!fs.existsSync(request.path)) {
      res.error = new Error('file not found');
      return;
    }
    res.data = await FileUtils.readFile(request.path);
  }


  handleResponse(responses: FileResponse): any {
    let res: Buffer = null;
    if (responses.data) {
      if (responses.data.type && responses.data.type === 'Buffer') {
        res = Buffer.from(responses.data.data);
      } else {
        res = responses.data;
      }
    }
    return res;
  }
}


