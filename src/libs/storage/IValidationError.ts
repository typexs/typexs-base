export interface IValidationError {
  property: string;
  value: string;
  constraints: { [k: string]: string };
  type?: 'error' | 'validate';
}
