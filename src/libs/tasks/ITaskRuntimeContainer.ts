export interface ITaskRuntimeContainer {
  //id: number;

  //name: string;

  progress?(progress: number): void;

  total?(total: number): void;
}
