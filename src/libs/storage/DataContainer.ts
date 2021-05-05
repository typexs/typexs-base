// import {DataContainer as OrgDatAcontainer} from '@allgemein/schema-api';
//
// export class DataContainer<T> extends DataContainer<any>{
//
//   static keys: string[] = ['isValidated', 'isSuccess', 'isSuccessValidated', 'errors'];
//
//   isValidated: boolean;
//
//   isSuccess: boolean;
//
//   isSuccessValidated: boolean;
//
//   errors: IValidationError[] = [];
//
//   validation: { [k: string]: IValidationResult } = {};
//
//   instance: T;
//
//
//   constructor(instance: T, registry: ILookupRegistry | IEntityRef) {
//     this.instance = instance;
//     const entityDef: IEntityRef = _.isFunction((<ILookupRegistry>registry).getEntityRefFor) ?
//       (<ILookupRegistry>registry).getEntityRefFor(instance) : registry as IEntityRef;
//     if (!entityDef) {
//       throw new Error('none definition found for instance ' + JSON.stringify(instance));
//     }
//     entityDef.getPropertyRefs().forEach(propDef => {
//       this.validation[propDef.name] = {
//         key: propDef.name,
//         valid: false,
//         checked: false,
//         messages: []
//       };
//     });
//   }
//
//
//   addError(e: IValidationError) {
//     if (!_.has(e, 'type')) {
//       e.type = 'error';
//     }
//     this.errors.push(e);
//   }
//
//
//   hasErrors() {
//     return this.errors.length > 0;
//   }
//
//
//   checked(str: string) {
//     if (this.validation[str]) {
//       return this.validation[str].checked;
//     }
//     return false;
//   }
//
//
//   value(str: string) {
//     const wrap = {};
//     Object.defineProperty(wrap, str, {
//       get: () => {
//         return this.instance[str];
//       },
//       set: (y: any) => {
//         this.instance[str] = y;
//       }
//     });
//     return wrap[str];
//   }
//
//
//   valid(str: string) {
//     if (this.validation[str]) {
//       return this.validation[str].valid;
//     }
//     return false;
//   }
//
//
//   messages(str: string): IValidationMessage[] {
//     if (this.validation[str] && this.validation[str].messages) {
//       return this.validation[str].messages;
//     }
//     return [];
//
//   }
//
//
//   async validate(): Promise<boolean> {
//     this.isValidated = true;
//     _.remove(this.errors, error => error.type === 'validate');
//     let results: IValidationError[] = [];
//     try {
// //      const validator = await import('class-validator');
//
//       results = <IValidationError[]>await validate(this.instance as any, {validationError: {target: false}});
//     } catch (e) {
//       // TODO log no validator
//     }
//
//     results.map(r => this.errors.push({
//       property: r.property,
//       value: r.value,
//       constraints: r.constraints,
//       type: 'validate'
//     }));
//     this.isSuccessValidated = true;
//     _.keys(this.validation).forEach(key => {
//       if (this.validation[key]) {
//         const valid = this.validation[key];
//         const found = _.find(this.errors, {property: key});
//         valid.messages = [];
//         if (found) {
//           valid.valid = false;
//           Object.keys(found.constraints).forEach(c => {
//             valid.messages.push({type: c, content: found.constraints[c]});
//           });
//
//         } else {
//           valid.valid = true;
//         }
//         this.isSuccessValidated = this.isSuccessValidated && valid.valid;
//         valid.checked = true;
//       }
//     });
//
//     return this.isSuccessValidated;
//   }
//
//
//   applyState() {
//     const $state: any = {};
//     DataContainer.keys.forEach(k => {
//       const value = _.get(this, k, null);
//
//       if (_.isBoolean(value) || !_.isEmpty(value)) {
//         _.set($state, k, value);
//       }
//     });
//
//     _.set(<any>this.instance, STATE_KEY, $state);
//   }
//
//
//   resetErrors() {
//     this.errors = [];
//   }
// }
