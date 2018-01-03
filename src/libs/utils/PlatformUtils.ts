/**
 *
 * @see https://github.com/typeorm/typeorm/blob/master/src/platform/PlatformTools.ts
 *
 */

import * as path from "path";
import * as fs from "fs";


const FILEPATH = path.sep === '/' ? /^(\.|\.\/|\/)?([\w.\/])*$/ : /^(?:[a-zA-Z]\:|\\\\[\w\.]+\\[\w.$]+)\\(?:[\w]+\\)*\w([\w.])+$/;

/**
 * Platform-specific tools.
 */
export class PlatformUtils {

  /**
   * Type of the currently running platform.
   */
  static type: "browser" | "node" = "node";

  /**
   * Gets global variable where global stuff can be stored.
   */
  static getGlobalVariable(): any {
    return global;
  }

  /**
   * Loads ("require"-s) given file or package.
   * This operation only supports on node platform
   */
  static load(name: string): any {

    // if name is not absolute or relative, then try to load package from the node_modules of the directory we are currenly in
    // this is useful when we are using typeorm package globally installed and it accesses drivers
    // that are not installed globally

    try {
      return require(name);

    } catch (err) {
      if (!path.isAbsolute(name) && name.substr(0, 2) !== "./" && name.substr(0, 3) !== "../") {
        return require(path.resolve(process.cwd() + "/node_modules/" + name));
      }

      throw err;
    }
  }


  static testForFilePath(path: string) {
    return FILEPATH.test(path);
  }

  /**
   * Normalizes given path. Does "path.normalize".
   */
  static pathNormalize(pathStr: string): string {
    return path.normalize(pathStr);
  }

  /**
   * Normalizes given path. Does "path.normalize".
   */
  static pathResolveAndNormalize(pathStr: string): string {
    return this.pathNormalize(this.pathResolve(pathStr));
  }

  /**
   * Gets file extension. Does "path.extname".
   */
  static pathExtname(pathStr: string): string {
    return path.extname(pathStr);
  }

  /**
   * Resolved given path. Does "path.resolve".
   */
  static pathResolve(pathStr: string): string {
    return path.resolve(pathStr);
  }

  /**
   * Test if path is absolute.
   */
  static isAbsolute(pathStr: string): boolean {
    return path.isAbsolute(pathStr);
  }

  static directory(file: string): string {
    return path.dirname(file);
  }

  /**
   * Synchronously checks if file exist. Does "fs.existsSync".
   */
  static fileExist(pathStr: string): boolean {
    return fs.existsSync(pathStr);
  }

  /**
   * Gets environment variable.
   */
  static getEnvVariable(name: string): any {
    return process.env[name];
  }


  static getHostPath(): string {
    if (process.platform === 'win32') {
      return path.join(process.env.SYSTEMROOT, '/System32/drivers/etc/hosts');
    }
    return '/etc/hosts';
  }

  static getHostFileContent(): string {
    return fs.readFileSync(this.getHostPath(), {encoding: 'utf-8'})
  }

  static mkdir(targetDir: string, sep: string = path.sep): boolean {
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    targetDir.split(sep).reduce((parentDir, childDir) => {
      const curDir = path.resolve(parentDir, childDir);
      if (!fs.existsSync(curDir)) {
        fs.mkdirSync(curDir);
      }
      return curDir;
    }, initDir);
    return true;
  }

  static readFile(filename: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(filename, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      })
    });
  }

  static deleteFile(dir: string, file: string): Promise<{}> {
    return new Promise(function (resolve, reject) {
      let filePath = path.join(dir, file);
      fs.lstat(filePath, function (err, stats) {
        if (err) {
          return reject(err);
        }
        if (stats.isDirectory()) {
          resolve(PlatformUtils.deleteDirectory(filePath));
        } else {
          fs.unlink(filePath, function (err) {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        }
      });
    });
  };

  static deleteDirectory(dir: string): Promise<{}> {
    return new Promise(function (resolve, reject) {
      fs.access(dir, function (err) {
        if (err) {
          return reject(err);
        }
        fs.readdir(dir, function (err, files) {
          if (err) {
            return reject(err);
          }
          Promise.all(files.map(function (file) {
            return PlatformUtils.deleteFile(dir, file);
          })).then(function () {
            fs.rmdir(dir, function (err) {
              if (err) {
                return reject(err);
              }
              resolve();
            });
          }).catch(reject);
        });
      });
    });
  };
}
