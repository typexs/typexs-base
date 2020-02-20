import * as _ from 'lodash';
import * as fs from 'fs';
import {join} from 'path';
import {FileUtils} from 'commons-base';
import {AbstractExchange} from '../../../libs/messaging/AbstractExchange';
import {FileSystemRequest} from './FileSystemRequest';
import {FileSystemResponse} from './FileSystemResponse';
import {IFileOptions} from './IFileOptions';
import {FileReadUtils} from '../../../libs/filesystem/FileReadUtils';


export class FileSystemExchange extends AbstractExchange<FileSystemRequest, FileSystemResponse> {


  constructor() {
    super(FileSystemRequest, FileSystemResponse);
  }


  async file(opts: IFileOptions): Promise<any[]> {
    const r = new FileSystemRequest(opts);
    const msg = this.create(opts);
    return await msg.run(r);
  }


  async handleRequestRead(request: FileSystemRequest, res: FileSystemResponse) {
    const opts = request.options;
    const path = opts.path;

    let unit: 'byte' | 'line' = 'byte';
    if (!_.isUndefined(opts.unit)) {
      unit = opts.unit;
    }

    if (_.isUndefined(opts.limit) && _.isUndefined(opts.offset) && _.isUndefined(opts.tail)) {
      res.data = await FileUtils.readFile(path);
    } else if (!_.isUndefined(opts.tail)) {
      res.data = await FileReadUtils.tail(path, opts.tail ? opts.tail : 50);
    } else if (!_.isUndefined(opts.limit) || !_.isUndefined(opts.offset)) {
      if (unit === 'line') {
        res.data = await FileReadUtils.less(path, opts.offset ? opts.offset : 0, opts.limit ? opts.limit : 0);
      } else {
        res.data = await FileReadUtils.readByByte(path, opts.offset ? opts.offset : 0, opts.limit ? opts.limit : 0);
      }
    } else {
      throw new Error(`combination of options is ambivalent`);
    }
  }


  async handleRequestList(request: FileSystemRequest, res: FileSystemResponse) {
    const opts = request.options;
    const path = opts.path;

    if (!_.isUndefined(opts.glob) && opts.glob) {
      res.data = await FileUtils.glob(path);
    } else {
      res.data = await new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
          if (err) {
            reject(err);
          } else {
            resolve(files);
          }
        });
      });
    }

    if (!_.isUndefined(opts.stats) && opts.stats) {
      res.data = await Promise.all(res.data.map(async (x: string) => {
        return {
          path: x,
          stats: await FileReadUtils.statInfo(join(path, x))
        };
      }));
    }

  }


  async handleRequest(request: FileSystemRequest, res: FileSystemResponse) {
    res.options = request.options;
    if (_.isEmpty(request) || _.isEmpty(_.get(request, 'options.path', null))) {
      res.error = new Error('no path in request');
      return;
    }

    const opts = request.options;
    if (!fs.existsSync(opts.path)) {
      res.error = new Error('file not found');
      return;
    }

    const stats = await FileReadUtils.statInfo(opts.path);
    if (!_.isUndefined(opts.stats) && opts.stats) {
      res.stats = stats;
    }

    try {
      if (stats.isDirectory) {
        return this.handleRequestList(request, res);
      } else {
        return this.handleRequestRead(request, res);
      }
    } catch (e) {
      res.error = e;
    }
  }


  handleResponse(responses: FileSystemResponse): any {
    let res: any = responses.data;
    if (responses.data) {
      if (responses.data.type && responses.data.type === 'Buffer') {
        res = Buffer.from(responses.data.data);
      } else {
        res = responses.data;
      }

      if (!_.isUndefined(responses.options.stats) && responses.options.stats && responses.stats.isFile) {
        res = {
          data: res,
          stats: responses.stats
        };
      }
    }
    return res;
  }
}


