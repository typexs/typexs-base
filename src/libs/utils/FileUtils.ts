import {PlatformUtils} from "commons-base";


export class FileUtils {


  static async getJson(filepath: string): Promise<any> {
    try {
      let data = await PlatformUtils.readFile(filepath);
      return JSON.parse(data.toString('utf-8'));
    } catch (e) {
    }
    return null;
  }
}
