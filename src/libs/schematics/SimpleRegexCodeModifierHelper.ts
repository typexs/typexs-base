const tsMethodEnvelopeRegex = /(((\/\*(.|\s)*?(\*\/))|\/\/.*)\s*)*(@\w+\([^\)]*\)\s*)*((async|static)\s+)?(\w+)\s*\([^\)]*\)\s*{[^}]*}/g;
const tsImportRegex = /import\s+((\{([^\}]+)\})|(.*))\s+from\s+((\"|\')([^\s]*)(\"|\'));?/g;


export class SimpleRegexCodeModifierHelper {

  static copyImports(target: string, additional: string): string {
    let match: RegExpExecArray = null;
    let importNames = {};
    let last = null;
    while ((match = tsImportRegex.exec(target)) != null) {
      if (match[4]) {
        importNames[match[4]] = match[7];
      } else {
        match[3].split(',').map(x => {
          x = x.trim()
          importNames[x] = match[7];
        });
      }
      last = match;
    }

    if (last) {
      let startIndex = last.index + last[0].length;
      let append = ''

      let importNamesKeys = Object.keys(importNames);
      while ((match = tsImportRegex.exec(additional)) != null) {
        if (match[4]) {
          if (importNamesKeys.indexOf(match[4]) === -1) {
            append += match[0] + '\n';
          }
        } else if (match[3]) {
          match[3].split(',').map(x => {
            x = x.trim()
            if (importNamesKeys.indexOf(x) === -1) {
              append += 'import {' + x + '} from \"' + match[7] + '\";\n';
            }
          })
        }
      }

      if (append.length === 0) {
        return target;
      }

      let parts = [];
      parts.push(target.substr(0, startIndex + 1));
      parts.push(append);
      parts.push(target.substr(startIndex));
      return parts.join('');
    } else {
      return target;
    }


  }


  static copyMethods(target: string, additional: string): string {
    let match: RegExpExecArray = null;
    let methodNames = []
    let last = null;
    while ((match = tsMethodEnvelopeRegex.exec(target)) != null) {
      methodNames.push(match[4]);
      last = match;
    }

    let prepand:boolean = true;

    let startIndex = -1;
    if(last){
      startIndex = last.index + last[0].length;
    }else{
      match = /\}\s*$/g.exec(target);
      if(match){
        prepand = false
        startIndex = match.index - 1;
      }
    }


    if (startIndex > -1) {

      let append = ''

      while ((match = tsMethodEnvelopeRegex.exec(additional)) != null) {
        if (methodNames.indexOf(match[4]) === -1) {
          append += match[0] + '\n';
        }
      }

      if (append.length === 0) {
        return target;
      }

      let parts = []
      parts.push(target.substr(0, startIndex + 1))
      parts.push((prepand ? '\n\n':'')+'  ' + append);
      parts.push(target.substr(startIndex));

      return parts.join('');
    } else {
      return target;
    }


  }
}
