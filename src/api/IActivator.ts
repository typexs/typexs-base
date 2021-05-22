export interface IActivator {

  /**
   * Return config schema as json.
   */
  configSchema?(): any;

  /**
   * Initialisation
   */
  startup(): void;


}
