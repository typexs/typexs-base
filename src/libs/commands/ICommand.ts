export interface ICommand {

  readonly command: string;

  readonly aliases?: string;

  readonly describe?: string;

  beforeStorage?(): void;

  beforeStartup?(): void;

  afterStartup?(): void;


  builder?(yargs: any): any;

  handler(argv: any): any;

}
