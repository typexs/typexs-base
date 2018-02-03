export interface ISchematicsOptions {
  basedir: string;
  workdir: string;
  collectionName: string;
  schematicName: string;
  force?: boolean

  argv?: {
    [k: string]: any;
  }
}
