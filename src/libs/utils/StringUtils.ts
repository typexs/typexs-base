import {MatchUtils} from './MatchUtils';
import {PlatformUtils} from '@allgemein/base';

const URL_PATTERN = new RegExp('^(https?:\\/\\/)?' + // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
  '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

export class StringUtils {

  static checkIfPathLocation(str: string): 'url' | 'absolute' | 'relative' | 'glob' | 'unknown' {
    if (URL_PATTERN.test(str)) {
      return 'url';
    } else {
      let isAbsolute = false;
      try {
        isAbsolute = PlatformUtils.isAbsolute(str);
        if (isAbsolute && PlatformUtils.fileExist(str)) {
          return 'absolute';
        }
      } catch (e) {
      }

      try {
        const path = PlatformUtils.pathResolveAndNormalize(str);
        if (PlatformUtils.fileExist(path)) {
          return 'relative';
        }
      } catch (e) {
      }

      if (MatchUtils.isGlobPattern(str)) {
        return 'glob';
      }
    }
    return 'unknown';

  }
}
