export interface IConnection {

  /**
   * Open a connection
   */
  connect(): Promise<IConnection>;

  close(): Promise<IConnection>;
}
