


export class ObjectsNotValidError extends Error {

  isArray:boolean = false;

  objects:any[];

  constructor(objects:any[], isArray:boolean = false){
    super('Object(s) are not valid');
    Object.setPrototypeOf(this, ObjectsNotValidError.prototype);
    this.objects = objects;
    this.isArray = isArray;
  }

}
