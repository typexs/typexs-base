import {IMessageOptions} from '../../../libs/messaging/IMessageOptions';

export interface IFileOptions extends IFileSelectOptions {

  /**
   * if path operation which should be performed on given path
   *
   * - link to file is given - reads the content of an existing file
   * - link to directory is given - list content of the directory
   */
  path: string;

}


export interface IFileSelectOptions extends IMessageOptions {

  /**
   * mark if path is an glob pattern
   */
  glob?: boolean;

  /**
   * limit size
   */
  unit?: 'byte' | 'line';

  /**
   * limit size
   */
  limit?: number;

  /**
   * offset
   */
  offset?: number;

  /**
   * number of lines to tail
   */
  tail?: number;


  /**
   * send stats
   */
  stats?: boolean;
}
