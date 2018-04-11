export interface ISchematicsOptions {
  basedir: string;
  workdir: string;
  collectionName: string;
  schematicName: string;
  force?: boolean
  allowPrivate?:boolean;
  debug?:boolean;
  dryRun?:boolean;

  argv?: {
    [k: string]: any;
  }
}
