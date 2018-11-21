export interface IPermissions {

  permissions(): Promise<string[]> | string[];

}
