export interface IActivator {
  /**
   * Initialisation
   */
  startup():void;

  /**
   * Booting
   */
  bootstrap():void;
}
