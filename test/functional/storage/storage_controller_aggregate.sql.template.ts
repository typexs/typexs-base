// process.env.SQL_LOG = '1';
import * as _ from 'lodash';
import * as path from 'path';
import {test} from '@testdeck/mocha';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {ClassType} from '@allgemein/schema-api';
import {XS_P_$COUNT, XS_P_$LIMIT} from '../../../src/libs/Constants';
import {TypeOrmEntityController} from '../../../src/libs/storage/framework/typeorm/TypeOrmEntityController';
import {TypeOrmStorageRef} from '../../../src/libs/storage/framework/typeorm/TypeOrmStorageRef';

let bootstrap: Bootstrap;
let storageRef: TypeOrmStorageRef;

let CarSql: ClassType<any> = null;
let DriverSql: ClassType<any> = null;
let CarParam: ClassType<any> = null;
let controller: TypeOrmEntityController = null;

export class StorageAcontrollerAggregateSqlTemplate {


  static async initBefore(klass: any, config: any = {}) {
    // TestHelper.typeOrmReset();
    Bootstrap.reset();
    Config.clear();

    CarSql = require('./fake_app_sql/entities/CarSql').CarSql;
    DriverSql = require('./fake_app_sql/entities/DriverSql').DriverSql;
    CarParam = require('./fake_app_sql/entities/CarParam').CarParam;
    const appdir = path.join(__dirname, 'fake_app_sql');

    const _cfg = _.merge({
      app: {
        path: appdir
      },
      modules: {
        paths: [__dirname + '/../../..']
      }
    }, config);

    bootstrap = await Bootstrap
      .configure(_cfg)
      .prepareRuntime();

    bootstrap = await bootstrap.activateStorage();

    const storageManager = bootstrap.getStorage();
    storageRef = storageManager.get();
    storageRef.addEntityType(CarSql);
    storageRef.addEntityType(DriverSql);
    storageRef.addEntityType(CarParam);
    controller = storageRef.getController();

    if (klass['cleanup']) {
      await klass['cleanup'](controller.getStorageRef());
    }

    const param: any[] = [new CarParam(), new CarParam(), new CarParam(), new CarParam(), new CarParam()];
    param[0].doors = 4;
    param[0].maxSpeed = 100;
    param[0].ps = 140;
    param[0].year = 1979;
    param[0].production = new Date(1979, 11, 5);

    param[1].doors = 2;
    param[1].maxSpeed = 120;
    param[1].ps = 180;
    param[1].year = 1979;
    param[1].production = new Date(1989, 3, 10);

    param[2].doors = 2;
    param[2].maxSpeed = 200;
    param[2].ps = 280;
    param[2].year = 1980;
    param[2].production = new Date(1981, 1, 2);

    param[3].doors = 3;
    param[3].maxSpeed = 140;
    param[3].ps = 130;
    param[3].year = 1985;
    param[3].production = new Date(1980, 2, 2);

    param[4].doors = 3;
    param[4].maxSpeed = 170;
    param[4].ps = 130;
    param[4].year = 1989;
    param[4].production = new Date(1983, 8, 22);
    await controller.save(param);

  }


  static async initAfter() {
    if (bootstrap) {
      await bootstrap.shutdown();
      await bootstrap.getStorage().shutdown();
    }
  }


  @test
  async 'aggregate - pipeline - $match'() {
    const aggr = await controller.aggregate(CarParam, [{$match: {doors: {$le: 2}}}]);
    // console.log(aggr);
    expect(aggr).to.have.length(2);
    expect(aggr[XS_P_$COUNT]).to.be.eq(2);
    expect(aggr.map(x => x.id)).to.be.deep.eq([2, 3]);
  }


  @test
  async 'aggregate - pipeline - $project (field => 1)'() {
    const aggr = await controller.aggregate(CarParam, [{$project: {doors: 1}}]);
    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {doors: 4},
      {doors: 2},
      {doors: 2},
      {doors: 3},
      {doors: 3}
    ]);
  }


  @test
  async 'aggregate - pipeline - $project (single field)'() {
    const aggr = await controller.aggregate(CarParam, [{$project: '$doors'}]);
    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {doors: 4},
      {doors: 2},
      {doors: 2},
      {doors: 3},
      {doors: 3}
    ]);
  }


  @test
  async 'aggregate - pipeline - $project (field with alias)'() {
    const aggr = await controller.aggregate(CarParam, [{$project: {doorAlias: '$doors'}}]);
    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {doorAlias: 4},
      {doorAlias: 2},
      {doorAlias: 2},
      {doorAlias: 3},
      {doorAlias: 3}
    ]);
  }

  @test
  async 'aggregate - pipeline - $project (field list)'() {
    const aggr = await controller.aggregate(CarParam, [{$project: ['$doors', '$ps']}]);
    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {doors: 4, ps: 140},
      {doors: 2, ps: 180},
      {doors: 2, ps: 280},
      {doors: 3, ps: 130},
      {doors: 3, ps: 130}
    ]);
  }


  @test
  async 'aggregate - pipeline - $project (with $year operator)'() {
    const aggr = await controller.aggregate(CarParam, [{$project: {year: {$year: '$production'}}}], {autoParseNumbers: true});
    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {
        'year': 1979
      },
      {
        'year': 1989
      },
      {
        'year': 1981
      },
      {
        'year': 1980
      },
      {
        'year': 1983
      }
    ]);
  }

  @test
  async 'aggregate - pipeline - $project (with $month operator)'() {
    const aggr = await controller.aggregate(CarParam, [{$project: {month: {$month: '$production'}}}], {autoParseNumbers: true});
    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {
        'month': 12
      },
      {
        'month': 4
      },
      {
        'month': 2
      },
      {
        'month': 3
      },
      {
        'month': 9
      }
    ]);
  }


  @test
  async 'aggregate - pipeline - $project (with $day operator)'() {
    const aggr = await controller.aggregate(CarParam, [{$project: {day: {$day: '$production'}}}], {autoParseNumbers: true});
    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {
        'day': 5
      },
      {
        'day': 10
      },
      {
        'day': 2
      },
      {
        'day': 2
      },
      {
        'day': 22
      }
    ]);
  }


  @test
  async 'aggregate - pipeline - $project + $match'() {
    const aggr = await controller.aggregate(CarParam, [{$project: {speedy: '$maxSpeed'}}, {$match: {year: 1979}}]);
    expect(aggr).to.have.length(2);
    expect(aggr[XS_P_$COUNT]).to.be.eq(2);
    expect(aggr).to.be.deep.eq([
      {speedy: 100},
      {speedy: 120}
    ]);
  }


  @test
  async 'aggregate - pipeline - $group'() {
    const aggr = await controller.aggregate(CarParam, [{$group: {_id: '$year', count: {$sum: 1}}}], {
      sort: {
        year: 'asc',
        count: 'asc'
      }
    });
    // console.log(aggr);
    expect(aggr).to.have.length(4);

    aggr.map(x => {
      x.count = parseInt(x.count, 0);
    });

    expect(aggr).to.be.deep.eq([
      {year: 1979, count: 2},
      {year: 1980, count: 1},
      {year: 1985, count: 1},
      {year: 1989, count: 1}
    ]);
    expect(aggr[XS_P_$COUNT]).to.be.eq(4);
  }


  @test
  async 'aggregate - pipeline - $group (as list) with $sum'() {
    const aggr = await controller.aggregate(CarParam, [{
      $group: {
        _id: ['$year', '$ps'],
        count: {$sum: 1}
      }
    }], {sort: {year: 'asc', ps: 'asc'}});
    // console.log(aggr);
    expect(aggr).to.have.length(5);
    aggr.map(x => {
      x.count = parseInt(x.count, 0);
    });

    expect(aggr).to.be.deep.eq([
      {year: 1979, ps: 140, count: 1},
      {year: 1979, ps: 180, count: 1},
      {year: 1980, ps: 280, count: 1},
      {year: 1985, ps: 130, count: 1},
      {year: 1989, ps: 130, count: 1},
    ]);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
  }


  @test
  async 'aggregate - pipeline - $group (as object) with $sum'() {
    const aggr = await controller.aggregate(CarParam, [{
      $group: {
        _id: {yearAlias: '$year', doorsAlias: '$doors'},
        count: {$sum: 1}
      }
    }], {sort: {year: 'asc', doors: 'asc'}});
    // console.log(aggr);
    expect(aggr).to.have.length(5);

    aggr.map(x => {
      x.count = parseInt(x.count, 0);
    });


    expect(aggr).to.be.deep.eq([
      {yearAlias: 1979, doorsAlias: 2, count: 1},
      {yearAlias: 1979, doorsAlias: 4, count: 1},
      {yearAlias: 1980, doorsAlias: 2, count: 1},
      {yearAlias: 1985, doorsAlias: 3, count: 1},
      {yearAlias: 1989, doorsAlias: 3, count: 1},
    ]);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
  }

  @test
  async 'aggregate - pipeline - $group (as object) with _id = null'() {
    const aggr = await controller.aggregate(CarParam, [{
      $group: {
        _id: null,
        count: {$count: '*'}
      }
    }]);
    aggr.map(x => {
      x.count = parseInt(x.count, 0);
    });


    // console.log(aggr);
    expect(aggr).to.have.length(1);
    expect(aggr).to.be.deep.eq([{count: 5}]);
    expect(aggr[XS_P_$COUNT]).to.be.eq(1);
  }


  @test
  async 'aggregate - pipeline - $project with $max, $min, $sum, $avg, $count'() {
    const aggr = await controller.aggregate(CarParam, [{
      $project: {
        min: {$min: '$year'},
        max: {$max: '$year'},
        sum: {$sum: '$year'},
        count: {$count: '$year'},
        avg: {$avg: '$year'},
      }
    }], {autoParseNumbers: true});
    // console.log(aggr);
    expect(aggr).to.have.length(1);
    expect(aggr).to.be.deep.eq([{min: 1979, max: 1989, sum: 9912, count: 5, avg: 1982.4}]);
    // expect(aggr[XS_P_$COUNT]).to.be.eq(1);
  }


  @test
  async 'aggregate - pipeline - $group with $max, $min, $sum, $avg, $count'() {
    let aggr = await controller.aggregate(CarParam, [{
      $group: {
        _id: {doors: '$doors'},
        countPS: {$count: '$ps'},
        sumPS: {$sum: '$ps'},
        avgPS: {$avg: '$ps'},
        minSpeed: {$min: '$maxSpeed'},
        maxSpeed: {$max: '$maxSpeed'}
      }
    }], {autoParseNumbers: true});
    // console.log(aggr);
    aggr = _.orderBy(aggr, ['avgPS']);
    expect(aggr).to.have.length(3);
    expect(aggr).to.be.deep.eq([
      {
        doors: 3,
        countPS: 2,
        sumPS: 260,
        avgPS: 130,
        minSpeed: 140,
        maxSpeed: 170
      },
      {
        doors: 4,
        countPS: 1,
        sumPS: 140,
        avgPS: 140,
        minSpeed: 100,
        maxSpeed: 100
      },
      {
        doors: 2,
        countPS: 2,
        sumPS: 460,
        avgPS: 230,
        minSpeed: 120,
        maxSpeed: 200
      },
    ]);
  }


  @test
  async 'aggregate - pipeline - $group with $sort (desc)'() {
    const aggr = await controller.aggregate(CarParam, [
      {$group: {_id: {year: '$year'}}},
      {$sort: {year: -1}}
    ]);
    expect(aggr).to.have.length(4);
    expect(aggr).to.be.deep.eq([
      {year: 1989},
      {year: 1985},
      {year: 1980},
      {year: 1979}]);
  }


  @test
  async 'aggregate - pipeline - $group with $sort (asc)'() {
    const aggr = await controller.aggregate(CarParam, [
      {$group: {_id: {year: '$year'}}},
      {$sort: {year: 1}}
    ]);
    // console.log(aggr);
    expect(aggr).to.have.length(4);
    expect(aggr).to.be.deep.eq([
      {year: 1979},
      {year: 1980},
      {year: 1985},
      {year: 1989}
    ]);

  }


  @test
  async 'aggregate - pipeline - $group with $sort by 2 keys (asc)'() {
    const aggr = await controller.aggregate(CarParam, [
      {
        $group: {
          _id: {doors: '$doors', year: '$year'}
        }
      },
      {
        $sort: {
          doors: 1,
          year: -1
        }
      }
    ]);
    // console.log(aggr);
    expect(aggr).to.have.length(5);
    expect(aggr).to.be.deep.eq([
      {year: 1980, doors: 2},
      {year: 1979, doors: 2},
      {year: 1989, doors: 3},
      {year: 1985, doors: 3},
      {year: 1979, doors: 4}
    ]);

  }


  @test
  async 'aggregate - pipeline - $group + $count'() {
    const aggr = await controller.aggregate(CarParam, [
      {$group: {_id: {doors: '$doors', year: '$year'}}},
      {$count: 'cnt'}
    ]);
    expect(aggr).to.be.deep.eq({cnt: 5});
  }


  @test
  async 'aggregate - pipeline - $group + $limit'() {
    const aggr = await controller.aggregate(CarParam, [
      {$group: {_id: {doors: '$doors', year: '$year'}}},
      {$limit: 2}
    ], {sort: {year: 'asc', doors: 'asc'}});
    // console.log(aggr);
    expect(aggr).to.have.length(2);
    expect(aggr[XS_P_$LIMIT]).to.be.eq(2);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {year: 1979, doors: 2},
      {year: 1979, doors: 4}
    ]);
  }


  @test
  async 'aggregate - pipeline - $group + $skip'() {
    const aggr = await controller.aggregate(CarParam, [
      {$group: {_id: {doors: '$doors', year: '$year'}}},
      {$limit: 10}, // needed for mysql
      {$skip: 2}
    ], {sort: {year: 'asc'}});
    expect(aggr).to.have.length(3);
    expect(aggr[XS_P_$LIMIT]).to.be.eq(10);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {
        doors: 2,
        year: 1980
      },
      {year: 1985, doors: 3},
      {year: 1989, doors: 3}
    ]);
  }

  @test
  async 'aggregate - pipeline - $group + $skip and $limit'() {
    const aggr = await controller.aggregate(CarParam, [
      {$group: {_id: {doors: '$doors', year: '$year'}}},
      {$skip: 2},
      {$limit: 2}
    ], {sort: {year: 'asc'}});
    expect(aggr).to.have.length(2);
    expect(aggr[XS_P_$LIMIT]).to.be.eq(2);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    expect(aggr).to.be.deep.eq([
      {
        doors: 2,
        year: 1980
      },
      {year: 1985, doors: 3},
    ]);
  }


  @test
  async 'aggregate - pipeline - $group by $date'() {
    let aggr = await controller.aggregate(CarParam, [
      {$group: {_id: {date: {$date: '$production'}}}}
    ]);

    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$LIMIT]).to.be.eq(0);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    aggr = _.orderBy(aggr, ['date']);
    expect(aggr).to.be.deep.eq([
      {date: '1979-12-05'},
      {date: '1980-03-02'},
      {date: '1981-02-02'},
      {date: '1983-09-22'},
      {date: '1989-04-10'},
    ]);
  }


  @test
  async 'aggregate - pipeline - $group by $month'() {
    let aggr = await controller.aggregate(CarParam, [
      {$group: {_id: {month: {$month: '$production'}}}}
    ], {autoParseNumbers: true});
    expect(aggr).to.have.length(5);
    expect(aggr[XS_P_$LIMIT]).to.be.eq(0);
    expect(aggr[XS_P_$COUNT]).to.be.eq(5);
    aggr = _.orderBy(aggr, ['month']);
    expect(aggr).to.be.deep.eq([
      {month: 2},
      {month: 3},
      {month: 4},
      {month: 9},
      {month: 12}
    ]);
  }


  @test
  async 'aggregate - pipeline - $group between $dates'() {
    let aggr = await controller.aggregate(CarParam, [
      {
        $match: {
          $and: [
            {production: {$lt: new Date(1983, 12, 1)}},
            {production: {$gt: new Date(1980, 1, 1)}}
          ]
        }
      },
      {$group: {_id: {month: {$month: '$production'}}}}
    ], {autoParseNumbers: true});
    expect(aggr).to.have.length(3);
    expect(aggr[XS_P_$LIMIT]).to.be.eq(0);
    expect(aggr[XS_P_$COUNT]).to.be.eq(3);
    aggr = _.orderBy(aggr, ['month']);
    expect(aggr).to.be.deep.eq([
      {month: 2},
      {month: 3},
      {month: 9},
    ]);
  }


  @test
  async 'aggregate - pipeline - $group + $match'() {
    // not suported in postres
    if (controller.getStorageRef().dbType === 'postgres') {
      return;
    }

    const aggr = await controller.aggregate(CarParam, [
      {
        $group: {
          _id: {byYear: '$year'},
          count: {$sum: 1}
        }
      },
      {
        $match: {
          count: {$ge: 2}
        }
      }
    ], {autoParseNumbers: true});
    // console.log(aggr);
    expect(aggr).to.have.length(1);
    expect(aggr).to.be.deep.eq([{byYear: 1979, count: 2}]);
    expect(aggr[XS_P_$COUNT]).to.be.eq(1);
  }


  @test
  async 'aggregate - pipeline - $project chain operator'() {
    const aggr = await controller.aggregate(CarParam, [
      {
        $project: {
          nr: {$sum: {$multiply: ['$doors', '$ps']}}
        }
      }
    ], {autoParseNumbers: true});
    // console.log(aggr);
    expect(aggr).to.have.length(1);
    expect(aggr).to.be.deep.eq([{nr: 2260}]);
    expect(aggr[XS_P_$COUNT]).to.be.eq(1);
  }


  @test.skip
  async 'exception handling - aggregate'() {

  }

}

