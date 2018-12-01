import {UseAPI} from "../../../../../../src/decorators/UseAPI";
import {IAwesomeApi} from "../api/IAwesomeApi";
import {AwesomeApi} from "../api/Awesome.api";


@UseAPI(AwesomeApi)
export class OnAwesomeApi implements IAwesomeApi {
  doSomethingGreat(data: any): string {
    return 'work done with ' + data;
  }

}
