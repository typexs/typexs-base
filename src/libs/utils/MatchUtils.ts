export class MatchUtils {

  static MATCHER: any;

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


