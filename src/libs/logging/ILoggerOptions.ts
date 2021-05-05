export const K_LOGGING = 'logging';


export interface ILoggerTransport {

}

export interface ILoggerOptions {

  enable?: boolean;

  /**
   * Log info prefix
   */
  prefix?: string;

  /**
   * name for the logger or minimatch pattern for logger group
   */
  name?: string;


  /**
   * generate minimatch
   */
  match?: any;

  /**
   * define if necessary log extension are needed
   * like adding extra transport. It should be enough to add definitions to Activator.
   */
  // requires?: string[];

  level?: string;

  format?: any;

  transports?: { [k: string]: ILoggerTransport }[];

  loggers?: ILoggerOptions[];

  /**
   * Log also if Log.enabled = false
   */
  force?: boolean;

  parameters?: any;
}
