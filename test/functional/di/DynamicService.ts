import {Inject} from 'typedi';
import {StaticService} from './StaticService';

export class DynamicService {

  @Inject(() => StaticService)
  service: StaticService;


  value = 'Startup!';

}
