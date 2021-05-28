export class Console {

  static enable = true;


  static println(type: 'error' | 'log', ...msg: any[]) {
    if (this.enable) {
      if (type === 'error') {
        console.error(...msg);
      } else {
        console.log(...msg);
      }
    }
  }


  static log(...msg: any[]) {
    this.println('log', ...msg);
  }


  static error(...msg: any[]) {
    this.println('error', ...msg);
  }
}
