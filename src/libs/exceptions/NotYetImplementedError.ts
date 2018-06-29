export class NotYetImplementedError extends Error {
  constructor(msg:string = "please make an issue ...") {
    super('Not yet implemented. Planned or forgotten ;) '+msg);
  }
}
