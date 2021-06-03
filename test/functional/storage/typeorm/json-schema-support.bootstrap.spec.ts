import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {join} from 'path';
import {Bootstrap} from '../../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {PlatformUtils} from '@allgemein/base';
import {REGISTRY_TYPEORM, TypeOrmConnectionWrapper} from '../../../../src';
import {RegistryFactory} from '@allgemein/schema-api';


let bootstrap: Bootstrap = null;
let backupWorkdir: string = null;

@suite('functional/storage/typeorm/json-schema-support - bootstrap')
class JsonSchemaSupportSpec {

  static before() {
    process.setMaxListeners(1000);
  }

  before() {
    Bootstrap.reset();
    Config.clear();
    RegistryFactory.remove(REGISTRY_TYPEORM);
    backupWorkdir = PlatformUtils.workdir;
  }


  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
    PlatformUtils.workdir = backupWorkdir;
  }

  async boot(appdir: string, entities: any[]) {
    PlatformUtils.workdir = appdir;
    bootstrap = await Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure({
        app: {
          path: appdir
        },
        modules: {
          paths: [__dirname + '/../../../..'],
          include: [
            '**/@typexs{,**/}*',
            '**/apps/json-schema/**'
          ]
        },
        logging: {
          enable: false
        },
        storage: {
          default: <any>{
            synchronize: true,
            type: 'sqlite',
            database: ':memory:',
            entities: entities
          }
        }
      })
      .prepareRuntime();
    bootstrap = await bootstrap.activateStorage();

    const storageManager = bootstrap.getStorage();
    const storage = storageManager.get('default');
    return storage;

  }

  @test
  async 'integrate simple json schema - for single object'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/simple.json'
    ]);

    expect(storage.getOptions().entities).to.be.length(3);
    expect(storage.getEntityRefs()).to.be.length(3);

    const c = await storage.connect() as TypeOrmConnectionWrapper;
    const q = await c.manager.query('SELECT * FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite%\';');
    expect(q).to.have.length(3);
    expect(q.map((x: any) => x.name)).to.deep.eq([
      'system_node_info',
      'task_log',
      'osoba'
    ]);
    expect(q.find((x: any) => x.name === 'osoba')).to.deep.eq({
      'name': 'osoba',
      'rootpage': 18,
      'sql': 'CREATE TABLE "osoba" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "first_name" varchar NOT NULL, "last_name" varchar NOT NULL)',
      'tbl_name': 'osoba',
      'type': 'table'
    });

    const entry = storage.getRegistry().getEntityRefFor('Osoba');
    const instance = entry.build({firstName: 'hallo', lastName: 'welt'}, {skipClassNamespaceInfo: true});
    const savedInstance = await storage.getController().save(instance);

    expect(savedInstance).to.deep.eq({
      firstName: 'hallo',
      lastName: 'welt',
      '$state': {isValidated: true, isSuccessValidated: true},
      id: 1
    });

  }

  @test
  async 'integrate simple json schema - for multiple objects'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/simple.json'
    ]);

    expect(storage.getOptions().entities).to.be.length(3);
    expect(storage.getEntityRefs()).to.be.length(3);
    const entry = storage.getRegistry().getEntityRefFor('Osoba');
    const c = await storage.connect() as TypeOrmConnectionWrapper;

    const instanceList = [
      entry.build({firstName: 'ballo', lastName: 'dalo'}, {skipClassNamespaceInfo: true}),
      entry.build({firstName: 'palo', lastName: 'karlo'}, {skipClassNamespaceInfo: true}),
    ];
    const savedInstances = await storage.getController().save(instanceList);
    expect(savedInstances).to.deep.eq([
      {
        firstName: 'ballo',
        lastName: 'dalo',
        '$state': {isValidated: true, isSuccessValidated: true},
        id: 1
      },
      {
        firstName: 'palo',
        lastName: 'karlo',
        '$state': {isValidated: true, isSuccessValidated: true},
        id: 2
      }]);
    const foundInstance = await storage.getController().find(entry.getClass());
    expect(foundInstance).to.deep.eq([
      {
        'firstName': 'ballo',
        'id': 1,
        'lastName': 'dalo'
      },
      {
        'firstName': 'palo',
        'id': 2,
        'lastName': 'karlo'
      }
    ]);
  }

  @test
  async 'integrate json schema with references one-to-one - table schema'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-one-relation.json'
    ]);

    expect(storage.getOptions().entities).to.be.length(4);
    expect(storage.getEntityRefs()).to.be.length(4);

    const c = await storage.connect() as TypeOrmConnectionWrapper;
    const q = await c.manager.query('SELECT * FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite%\';');
    expect(q).to.have.length(4);
    expect(q.map((x: any) => x.name)).to.deep.eq([
      'system_node_info',
      'task_log',
      'author',
      'book'
    ]);
    expect(q.filter((x: any) => ['book', 'author'].includes(x.name))).to.deep.eq([
      {
        'name': 'author',
        'rootpage': 20,
        'sql': 'CREATE TABLE "author" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "first_name" varchar NOT NULL, "last_name" varchar NOT NULL)',
        'tbl_name': 'author',
        'type': 'table'
      },
      {
        'name': 'book',
        'rootpage': 21,
        'sql': 'CREATE TABLE "book" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "label" varchar NOT NULL, "autor_id" integer, CONSTRAINT "REL_0719a0dd93f5115499d07da224" UNIQUE ("autor_id"), CONSTRAINT "FK_0719a0dd93f5115499d07da224f" FOREIGN KEY ("autor_id") REFERENCES "author" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)',
        'tbl_name': 'book',
        'type': 'table'
      }
    ]);

  }


  @test
  async 'integrate json schema with references one-to-one - for single object'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-one-relation.json'
    ]);

    const c = await storage.connect() as TypeOrmConnectionWrapper;

    const bookType = storage.getRegistry().getEntityRefFor('Book');
    const authorType = storage.getRegistry().getEntityRefFor('Author');
    const author = authorType.build({firstName: 'Rob', lastName: 'Elt'}, {skipClassNamespaceInfo: true}) as any;
    const book = bookType.build({label: 'Hallo'}, {skipClassNamespaceInfo: true}) as any;

    const savedInstance = await storage.getController().save(author);
    expect(savedInstance).to.be.deep.eq({
      firstName: 'Rob',
      lastName: 'Elt',
      '$state': {isValidated: true, isSuccessValidated: true},
      id: 1
    });

    book.autor = author;
    const savedBookInstance = await storage.getController().save(book);

    const rawbooks = await c.manager.query('select * from book');
    const rawauthor = await c.manager.query('select * from author');
    expect(rawbooks).to.be.deep.eq([{id: 1, label: 'Hallo', autor_id: 1}]);
    expect(rawauthor).to.be.deep.eq([{id: 1, first_name: 'Rob', last_name: 'Elt'}]);

    const foundBooks = await storage.getController().find(bookType.getClass(), null, {eager: true});
    expect(foundBooks).to.be.deep.eq(
      [
        {
          id: 1,
          label: 'Hallo',
          autor: {id: 1, firstName: 'Rob', lastName: 'Elt'}
        }
      ]
    );

  }


  @test
  async 'integrate json schema with references one-to-one - for multiple objects'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-one-relation.json'
    ]);


    const c = await storage.connect() as TypeOrmConnectionWrapper;

    const bookType = storage.getRegistry().getEntityRefFor('Book');
    const authorType = storage.getRegistry().getEntityRefFor('Author');
    const author1 = authorType.build({
      firstName: 'Fjodor',
      lastName: 'Dostojewski'
    }, {skipClassNamespaceInfo: true}) as any;
    const author2 = authorType.build({firstName: 'Lew', lastName: 'Tolstoi'}, {skipClassNamespaceInfo: true}) as any;
    const books = [
      bookType.build({label: 'Krieg und Frieden'}, {skipClassNamespaceInfo: true}) as any,
      bookType.build({label: 'Schuld und Sühne'}, {skipClassNamespaceInfo: true}) as any,
    ];

    const savedInstance = await storage.getController().save([author1, author2]);
    expect(savedInstance).to.be.deep.eq([
      {
        '$state': {
          'isSuccessValidated': true,
          'isValidated': true
        },
        'firstName': 'Fjodor',
        'id': 1,
        'lastName': 'Dostojewski'
      },
      {
        '$state': {
          'isSuccessValidated': true,
          'isValidated': true
        },
        'firstName': 'Lew',
        'id': 2,
        'lastName': 'Tolstoi'
      }
    ]);

    books[0].autor = author2;
    books[1].autor = author1;
    const savedBookInstance = await storage.getController().save(books);

    const rawbooks = await c.manager.query('select * from book');
    const rawauthor = await c.manager.query('select * from author');
    expect(rawbooks).to.be.deep.eq([
      {
        'autor_id': 2,
        'id': 1,
        'label': 'Krieg und Frieden'
      },
      {
        'autor_id': 1,
        'id': 2,
        'label': 'Schuld und Sühne'
      }
    ]);
    expect(rawauthor).to.be.deep.eq([
      {
        'first_name': 'Fjodor',
        'id': 1,
        'last_name': 'Dostojewski'
      },
      {
        'first_name': 'Lew',
        'id': 2,
        'last_name': 'Tolstoi'
      }
    ]);

    const foundBooks = await storage.getController().find(bookType.getClass(), null, {eager: true});
    expect(foundBooks).to.be.deep.eq([
      {
        'autor': {
          'firstName': 'Lew',
          'id': 2,
          'lastName': 'Tolstoi'
        },
        'id': 1,
        'label': 'Krieg und Frieden'
      },
      {
        'autor': {
          'firstName': 'Fjodor',
          'id': 1,
          'lastName': 'Dostojewski'
        },
        'id': 2,
        'label': 'Schuld und Sühne'
      }
    ]);

  }


  @test
  async 'integrate json schema with references many-to-many - table schema'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-many-relation.json'
    ]);

    expect(storage.getOptions().entities).to.be.length(4);
    expect(storage.getEntityRefs()).to.be.length(4);

    const c = await storage.connect() as TypeOrmConnectionWrapper;
    const q = await c.manager.query('SELECT * FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite%\';');
    expect(q).to.have.length(5);
    expect(q.map((x: any) => x.name)).to.include.members([
      'dealer',
      'product',
      'product_dealers'
    ]);
    expect(q.filter((x: any) => ['dealer', 'product', 'product_dealers'].includes(x.name))).to.deep.eq(
      [
        {
          'name': 'product',
          'rootpage': 18,
          'sql': 'CREATE TABLE "product" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL)',
          'tbl_name': 'product',
          'type': 'table'
        },
        {
          'name': 'dealer',
          'rootpage': 19,
          'sql': 'CREATE TABLE "dealer" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "label" varchar NOT NULL)',
          'tbl_name': 'dealer',
          'type': 'table'
        },
        {
          'name': 'product_dealers',
          'rootpage': 23,
          'sql': 'CREATE TABLE "product_dealers" ("productId" integer NOT NULL, "dealerId" integer NOT NULL, CONSTRAINT "FK_386ad987e614cd494739e814ff9" FOREIGN KEY ("productId") REFERENCES "product" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_994714d513d1082f4636b4b9205" FOREIGN KEY ("dealerId") REFERENCES "dealer" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "dealerId"))',
          'tbl_name': 'product_dealers',
          'type': 'table'
        }
      ]);

  }

  @test
  async 'integrate json schema with references many-to-many - for single object - empty ref'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-many-relation.json'
    ]);

    const productType = storage.getRegistry().getEntityRefFor('Product');

    // Empty reference
    const productEmpty = productType.build({name: 'Webcam'}, {skipClassNamespaceInfo: true}) as any;
    const savedProductEmpty = await storage.getController().save(productEmpty, {validate: false});
    expect(savedProductEmpty).to.be.deep.eq({
      'id': 1,
      'name': 'Webcam'
    });
    const foundBooks = await storage.getController().find(productType.getClass(), {id: savedProductEmpty.id}, {eager: true});
    expect(foundBooks).to.be.deep.eq([
      {
        'dealers': [],
        'id': 1,
        'name': 'Webcam'
      }
    ]);
  }


  @test
  async 'integrate json schema with references many-to-many - for single object - single ref'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-many-relation.json'
    ]);

    const productType = storage.getRegistry().getEntityRefFor('Product');
    const dealerType = storage.getRegistry().getEntityRefFor('Dealer');


    const productSingle = productType.build({name: 'Car'}, {skipClassNamespaceInfo: true}) as any;
    const dealerOne = dealerType.build({label: 'MediaShop'}, {skipClassNamespaceInfo: true}) as any;
    productSingle.dealers = [dealerOne];
    const savedProductSingle = await storage.getController().save(productSingle);
    expect(savedProductSingle).to.be.deep.eq({
      '$state': {
        'isSuccessValidated': true,
        'isValidated': true,
      },
      'dealers': [
        {
          'id': 1,
          'label': 'MediaShop'
        }
      ],
      'id': 1,
      'name': 'Car'
    });

    const foundBooks = await storage.getController().find(productType.getClass(), {id: savedProductSingle.id}, {eager: true});
    expect(foundBooks).to.be.deep.eq([
      {
        'id': 1,
        'name': 'Car',
        'dealers': [
          {
            'id': 1,
            'label': 'MediaShop'
          }
        ],
      }
    ]);

  }

  @test
  async 'integrate json schema with references many-to-many - for single object - multi ref'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-many-relation.json'
    ]);

    const productType = storage.getRegistry().getEntityRefFor('Product');
    const dealerType = storage.getRegistry().getEntityRefFor('Dealer');


    const productMulti = productType.build({name: 'Event'}, {skipClassNamespaceInfo: true}) as any;
    productMulti.dealers = [
      dealerType.build({label: 'TicketPower'}, {skipClassNamespaceInfo: true}) as any,
      dealerType.build({label: 'TicketShop'}, {skipClassNamespaceInfo: true}) as any
    ];
    const savedProductMulti = await storage.getController().save(productMulti);
    expect(savedProductMulti).to.be.deep.eq({
      '$state': {
        'isSuccessValidated': true,
        'isValidated': true,
      },
      'dealers': [
        {
          'id': 1,
          'label': 'TicketPower'
        },
        {
          'id': 2,
          'label': 'TicketShop'
        }
      ],
      'id': 1,
      'name': 'Event'
    });

    const foundBooks = await storage.getController().find(productType.getClass(), {id: savedProductMulti.id}, {eager: true});
    expect(foundBooks).to.be.deep.eq([
      {
        'dealers': [
          {
            'id': 1,
            'label': 'TicketPower'
          },
          {
            'id': 2,
            'label': 'TicketShop'
          }
        ],
        'id': 1,
        'name': 'Event'
      }
    ]);
  }


  @test
  async 'integrate json schema with references many-to-many - for multiple objects - empty ref'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-many-relation.json'
    ]);

    const productType = storage.getRegistry().getEntityRefFor('Product');

    // Empty reference
    const productArray = [
      productType.build({name: 'Webcam'}, {skipClassNamespaceInfo: true}) as any,
      productType.build({name: 'Handy'}, {skipClassNamespaceInfo: true}) as any
    ];
    const savedProductArray = await storage.getController().save(productArray, {validate: false});
    expect(savedProductArray).to.be.deep.eq([
      {
        'id': 1,
        'name': 'Webcam',
      },
      {
        'id': 2,
        'name': 'Handy',
      }
    ]);
    const foundProducts = await storage.getController().find(productType.getClass(), null, {eager: true});
    expect(foundProducts).to.be.deep.eq([
      {
        'id': 1,
        'name': 'Webcam',
        dealers: []
      },
      {
        'id': 2,
        'name': 'Handy',
        dealers: []
      }
    ]);
  }


  @test
  async 'integrate json schema with references many-to-many - for multiple objects - single ref'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-many-relation.json'
    ]);

    const productType = storage.getRegistry().getEntityRefFor('Product');
    const dealerType = storage.getRegistry().getEntityRefFor('Dealer');

    const dealer = dealerType.build({label: 'WalShop'}, {skipClassNamespaceInfo: true});
    // Empty reference
    const productArray = [
      productType.build({name: 'Webcam'}, {skipClassNamespaceInfo: true}) as any,
      productType.build({name: 'Handy'}, {skipClassNamespaceInfo: true}) as any
    ];
    const savedDealer = await storage.getController().save(dealer, {validate: false});
    productArray[0].dealers = [savedDealer];
    productArray[1].dealers = [savedDealer];


    const savedProductArray = await storage.getController().save(productArray, {validate: false});
    expect(savedProductArray).to.be.deep.eq([
      {
        'dealers': [
          {
            'id': 1,
            'label': 'WalShop'
          }
        ],
        'id': 1,
        'name': 'Webcam'
      },
      {
        'dealers': [
          {
            'id': 1,
            'label': 'WalShop'
          }
        ],
        'id': 2,
        'name': 'Handy'
      }
    ]);

    const c = await storage.connect() as TypeOrmConnectionWrapper;

    const foundProducts = await storage.getController().find(productType.getClass(), null, {eager: true});
    expect(foundProducts).to.be.deep.eq([
      {
        'id': 1,
        'name': 'Webcam',
        'dealers': [
          {
            'id': 1,
            'label': 'WalShop'
          }
        ],
      },
      {
        'id': 2,
        'name': 'Handy',
        'dealers': [
          {
            'id': 1,
            'label': 'WalShop'
          }
        ],
      }
    ]);
  }


  @test
  async 'integrate json schema with references many-to-many - for multiple objects - multi ref'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-files/one-to-many-relation.json'
    ]);

    const productType = storage.getRegistry().getEntityRefFor('Product');
    const dealerType = storage.getRegistry().getEntityRefFor('Dealer');

    const dealer1 = dealerType.build({label: 'WalShop'}, {skipClassNamespaceInfo: true});
    const dealer2 = dealerType.build({label: 'Thehop'}, {skipClassNamespaceInfo: true});
    // Empty reference
    const productArray = [
      productType.build({name: 'Webcam'}, {skipClassNamespaceInfo: true}) as any,
      productType.build({name: 'Handy'}, {skipClassNamespaceInfo: true}) as any,
      productType.build({name: 'Bike'}, {skipClassNamespaceInfo: true}) as any
    ];
    const savedDealer = await storage.getController().save([dealer1, dealer2], {validate: false});
    productArray[0].dealers = [];
    productArray[1].dealers = [savedDealer[0]];
    productArray[2].dealers = savedDealer;


    const savedProductArray = await storage.getController().save(productArray, {validate: false});
    const res =
      [
        {
          'dealers': [],
          'id': 1,
          'name': 'Webcam'
        },
        {
          'dealers': [
            {
              'id': 1,
              'label': 'WalShop'
            }
          ],
          'id': 2,
          'name': 'Handy'
        },
        {
          'dealers': [
            {
              'id': 1,
              'label': 'WalShop'
            },
            {
              'id': 2,
              'label': 'Thehop'
            }
          ],
          'id': 3,
          'name': 'Bike'
        }
      ];
    expect(savedProductArray).to.be.deep.eq(res);
    const c = await storage.connect() as TypeOrmConnectionWrapper;

    const foundProducts = await storage.getController().find(productType.getClass(), null, {eager: true});
    expect(foundProducts).to.be.deep.eq(res);

  }

  @test
  async 'integrate json schema by glob'() {
    const appdir = join(__dirname, 'apps', 'json-schema');
    const storage = await this.boot(appdir, [
      './schema-glob/*.json'
    ]);

    const processType = storage.getRegistry().getEntityRefFor('Process');
    const lawyerType = storage.getRegistry().getEntityRefFor('Lawyer');

    expect(storage.getRegistry().getEntityRefs()).to.have.length(4);
    expect(processType.getPropertyRef('autor').getTargetRef().getClass()).to.be.eq(lawyerType.getClassRef().getClass());

  }

  @test.skip
  async 'integrate json schema with references to already existing entities'() {
  }

}

