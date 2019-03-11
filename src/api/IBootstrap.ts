export interface IBootstrap {

  /**
   * Booting after Activation
   */
  bootstrap():void;

  /**
   * Is called after everything is activated and bootstrapped
   */
  ready?():void;

}
