import * as _ from 'lodash';
import {AbstractSqlConditionsBuilder} from '../AbstractSqlConditionsBuilder';
import {NotYetImplementedError} from 'commons-base/browser';
import {RelationMetadataArgs} from 'typeorm/browser/metadata-args/RelationMetadataArgs';
import {IConditionJoin} from '../IConditionJoin';
import {TypeOrmPropertyRef} from './schema/TypeOrmPropertyRef';
import {IClassRef} from 'commons-schema-api/browser';


export class TypeOrmSqlConditionsBuilder extends AbstractSqlConditionsBuilder {

  lookupKeys(key: string): string {
    const joins = key.split('.');
    let tmp: IClassRef = this.entityDef.getClassRef();
    let names: string[] = [this.alias];
    let rootAlias = this.alias;
    for (const _join of joins) {
      const prop = tmp.getPropertyRef(_join);
      if (prop.isReference()) {
        const from = tmp;
        tmp = prop.getTargetRef() ? prop.getTargetRef() : null;

        const relation: RelationMetadataArgs = (<TypeOrmPropertyRef>prop).relation;
        const join: IConditionJoin = {
          alias: this.createAlias(tmp),
          table: tmp.storingName,
          condition: null
        };

        const conditions: string[] = [];
        if (relation.relationType === 'one-to-many') {
          const sourceIdKeyProps = from.getPropertyRefs().filter(f => f.isIdentifier());
          if (sourceIdKeyProps.length === 1) {
            const sourceIdKey = sourceIdKeyProps[0].name;
            const targetIdKey = from.storingName + '' + _.capitalize(sourceIdKey);
            conditions.push([join.alias + '.' + targetIdKey, rootAlias + '.' + sourceIdKey].join(' = '));
          } else {
            throw new NotYetImplementedError();
          }
        } else if (relation.relationType === 'many-to-one') {
          const targetIdKeyProps = tmp.getPropertyRefs().filter(f => f.isIdentifier());
          if (targetIdKeyProps.length === 1) {
            const targetIdKey = targetIdKeyProps[0].name;
            const sourceIdKey = tmp.storingName + '' + _.capitalize(targetIdKey);
            conditions.push([join.alias + '.' + targetIdKey, rootAlias + '.' + sourceIdKey].join(' = '));
          } else {
            throw new NotYetImplementedError();
          }

        } else {
          throw new NotYetImplementedError();
        }

        join.condition = conditions.join(' AND ');
        this.joins.push(join);

        rootAlias = join.alias;
        names = [rootAlias];

      } else {
        names.push(prop.name);
      }
    }
    return names.join('.');
  }

}
