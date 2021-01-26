import {IValidationMessage} from './IValidationMessage';

export interface IValidationResult {
  key: string;
  valid: boolean;
  checked: boolean;
  messages: IValidationMessage[];
}
