interface ITaskDesc {
  type: 'incoming' | 'outgoing' | 'runtime';
  target: Function;
  propertyName: string;
  options: any;
}
