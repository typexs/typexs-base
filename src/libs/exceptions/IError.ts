export interface IError {
  context?: string;
  message: string;
  /**
   * Name of error class
   */
  className?: string;

  data?: any;

  /**
   * Stack of last 5 entries
   */
  stack?: string[];
}
