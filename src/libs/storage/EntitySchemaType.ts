import * as _ from 'lodash';
import {EntitySchema} from "typeorm/entity-schema/EntitySchema";
import {TableType} from "typeorm/metadata/types/TableTypes";
import {OrderByCondition} from "typeorm/find-options/OrderByCondition";
import {DEFAULT_COLUMN_OPTIONS, EntitySchemaColumnOptions} from "./EntitySchemaColumnOptions";
import {EntitySchemaRelationOptions} from "./EntitySchemaRelationOptions";

export class EntitySchemaType implements EntitySchema {
    /**
     * Entity name.
     */
    name: string;

    /**
     * Target.
     */
    target?: Function;

    /**
     * Extends schema.
     */
    extends?: string;

    /**
     * Entity table's options.
     */
    table?: {

        name: string;

        type?: TableType;

        orderBy?: OrderByCondition;
    };

    columns: {[columnName:string]:EntitySchemaColumnOptions} = {};

    relations:{[relationName:string]:EntitySchemaRelationOptions} = {};

    addColumn(name: string, options: any = {}) {
        this.columns[name] = _.defaults(options, DEFAULT_COLUMN_OPTIONS)
    }

    setTarget(fn : Function){
        this.target = fn;
    }


}
