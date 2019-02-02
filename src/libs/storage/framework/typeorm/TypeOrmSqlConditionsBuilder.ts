import * as _ from 'lodash';
import {AbstractSqlConditionsBuilder} from "../AbstractSqlConditionsBuilder";
import {NotYetImplementedError} from "commons-base";
import {RelationMetadataArgs} from "typeorm/browser/metadata-args/RelationMetadataArgs";
import {IConditionJoin} from "../IConditionJoin";
import {TypeOrmPropertyRef} from "./schema/TypeOrmPropertyRef";
import {IClassRef} from "commons-schema-api/browser";


export class TypeOrmSqlConditionsBuilder extends AbstractSqlConditionsBuilder {

  lookupKeys(key: string): string {
    let joins = key.split('.');
    let tmp: IClassRef = this.entityDef.getClassRef();
    let names: string[] = [this.alias];
    let rootAlias = this.alias;
    for (let _join of joins) {
      let prop = tmp.getPropertyRef(_join);
      if (prop.isReference()) {
        let from = tmp;
        tmp = prop.getTargetRef() ? prop.getTargetRef() : null;

        let relation: RelationMetadataArgs = (<TypeOrmPropertyRef>prop).relation;
        let join: IConditionJoin = {
          alias: this.createAlias(tmp),
          table: tmp.storingName,
          condition: null
        };

        let conditions: string[] = [];
        if (relation.relationType == 'one-to-many') {
          let sourceIdKeyProps = from.getPropertyRefs().filter(f => f.isIdentifier());
          if (sourceIdKeyProps.length == 1) {
            let sourceIdKey = sourceIdKeyProps[0].name;
            let targetIdKey = from.storingName + '' + _.capitalize(sourceIdKey);
            conditions.push([join.alias + '.' + targetIdKey, rootAlias + '.' + sourceIdKey].join(' = '))
          } else {
            throw new NotYetImplementedError();
          }
        } else if (relation.relationType == 'many-to-one') {
          let targetIdKeyProps = tmp.getPropertyRefs().filter(f => f.isIdentifier());
          if (targetIdKeyProps.length == 1) {
            let targetIdKey = targetIdKeyProps[0].name;
            let sourceIdKey = tmp.storingName + '' + _.capitalize(targetIdKey);
            conditions.push([join.alias + '.' + targetIdKey, rootAlias + '.' + sourceIdKey].join(' = '))
          } else {
            throw new NotYetImplementedError();
          }

        } else {
          throw new NotYetImplementedError()
        }

        join.condition = conditions.join(' AND ');
        this.joins.push(join);

        rootAlias = join.alias;
        names = [rootAlias];

      } else {
        names.push(prop.storingName);
      }
    }
    return names.join('.')
  }

}
