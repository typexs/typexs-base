// TODO

export interface IDeleteOptions {
  limit?: number;
  offset?: number;

  /**
   * Disable the usage of transactions
   */
  noTransaction?: boolean;
}
