export class CryptUtils {

  static bitwise(str: string): number {
    let hash = 0;
    if (str.length == 0) return hash;
    for (let i = 0; i < str.length; i++) {
      let ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  private static binaryTransfer(integer: number, binary: any) {
    binary = binary || 62;
    let stack = [];
    let num;
    let result = '';
    let sign = integer < 0 ? '-' : '';

    function table(num: any) {
      let t = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return t[num];
    }

    integer = Math.abs(integer);

    while (integer >= binary) {
      num = integer % binary;
      integer = Math.floor(integer / binary);
      stack.push(table(num));
    }

    if (integer > 0) {
      stack.push(table(integer));
    }

    for (let i = stack.length - 1; i >= 0; i--) {
      result += stack[i];
    }

    return sign + result;
  }


  /**
   * why choose 61 binary, because we need the last element char to replace the minus sign
   * eg: -aGtzd will be ZaGtzd
   */

  static shorthash(text: string): string {
    let id = this.binaryTransfer(this.bitwise(text), 61);
    return id.replace('-', 'Z');
  }


  static random(_len: number = 8): string {

    let chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    let rs = '';
    let len = _len || 8;
    for (let i = 0; i < len; i++) {
      let pos = Math.floor(Math.random() * chars.length);
      rs += chars.substring(pos, pos + 1);
    }
    return rs;
  }
}
