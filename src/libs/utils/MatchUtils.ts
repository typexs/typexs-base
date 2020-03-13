export class MatchUtils {

  static MATCHER: any;

  /**
   * Checks if x is an glob pattern
   *
   * @param x
   */
  static isGlobPattern(x: string) {
    return /\+|\.|\(|\||\)|\*/.test(x);
  }

  /**
   * Check glob pattern against a string
   *
   * @param pattern
   * @param string
   */
  static miniMatch(pattern: string, string: string) {
    try {
      if (!MatchUtils.MATCHER) {
        MatchUtils.MATCHER = require('@cezaryrk/minimatch');
      }
      return new MatchUtils.MATCHER.Minimatch(pattern).match(string);
    } catch (e) {
      throw e;
    }
  }
}


