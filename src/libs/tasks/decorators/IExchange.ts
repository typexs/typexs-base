export interface IExchange {
  name?: string;
  optional?: boolean;
  handle?: (x: any) => any;
}
