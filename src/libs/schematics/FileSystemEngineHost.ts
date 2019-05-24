// TODO REDESIGN for new schematics version!
//
// import * as core from '@angular-devkit/core/node';
// import {RuleFactory} from '@angular-devkit/schematics';
// import {
//   CollectionCannotBeResolvedException,
//   CollectionMissingSchematicsMapException,
//   SchematicMissingFieldsException,
// } from '@angular-devkit/schematics/tools';
// import {dirname, join, resolve as resolvePath} from 'path';
// import {FileSystemCollectionDesc, FileSystemSchematicDesc,} from '@angular-devkit/schematics/tools/description';
// import {ExportStringRef} from '@angular-devkit/schematics/tools/export-ref';
// import {FileSystemEngineHostBase} from '@angular-devkit/schematics/tools/file-system-engine-host-base';
// import {readJsonFile} from '@angular-devkit/schematics/tools/file-system-utility';
// import {IFileSystemEngineHost} from "./IFileSystemEngineHost";
// import {PlatformUtils} from "commons-base";
// import {Log} from "../../";
//
//
// /**
//  * A simple EngineHost that uses NodeModules to resolve collections.
//  */
// export class FileSystemEngineHost extends FileSystemEngineHostBase {
//
//   private options: IFileSystemEngineHost;
//
//   constructor(opts: IFileSystemEngineHost = {
//     basedir: process.cwd(),
//     lookupPaths: []
//   }) {
//     super();
//     this.options = opts;
//   }
//
//   get basedir() {
//     return this.options.basedir
//   }
//
//   protected _resolvePackageJson(name: string) {
//     let content = null;
//
//     if (PlatformUtils.isAbsolute(name)) {
//       return name;
//     }
//
//     if (!content) {
//       content = core.resolve(name, {
//         basedir: this.basedir,
//         checkLocal: true,
//         checkGlobal: true,
//         resolvePackageJson: true,
//       });
//     }
//
//     return content;
//   }
//
//   protected _resolvePath(name: string, basedir: string = process.cwd()) {
//     // Allow relative / absolute paths.
//     if (name.startsWith('.') || name.startsWith('/')) {
//       return resolvePath(basedir, name);
//     } else {
//       return core.resolve(name, {
//         basedir: basedir,
//         checkLocal: true,
//         checkGlobal: true,
//       });
//     }
//   }
//
//   protected _resolveCollectionPath(name: string): string {
//     let packageJsonPath = this._resolvePackageJson(name);
//     // If it's a file, use it as is. Otherwise append package.json to it.
//     if (!core.fs.isFile(packageJsonPath)) {
//       packageJsonPath = join(packageJsonPath, 'package.json');
//     }
//
//     try {
//       const pkgJsonSchematics = require(packageJsonPath)['schematics'];
//       if (pkgJsonSchematics) {
//         const resolvedPath = this._resolvePath(pkgJsonSchematics, dirname(packageJsonPath));
//         readJsonFile(resolvedPath);
//
//         return resolvedPath;
//       }
//     } catch (e) {
//       Log.error(e);
//     }
//     throw new CollectionCannotBeResolvedException(name);
//   }
//
//   protected _resolveReferenceString(refString: string, parentPath: string) {
//     const ref = new ExportStringRef<RuleFactory<{}>>(refString, parentPath);
//     if (!ref.ref) {
//       return null;
//     }
//
//     return {ref: ref.ref, path: ref.module};
//   }
//
//   protected _transformCollectionDescription(name: string,
//                                             desc: Partial<FileSystemCollectionDesc>,): FileSystemCollectionDesc {
//     if (!desc.schematics || typeof desc.schematics != 'object') {
//       throw new CollectionMissingSchematicsMapException(name);
//     }
//
//     return {
//       ...desc,
//       name,
//     } as FileSystemCollectionDesc;
//   }
//
//   protected _transformSchematicDescription(name: string,
//                                            _collection: FileSystemCollectionDesc,
//                                            desc: Partial<FileSystemSchematicDesc>,): FileSystemSchematicDesc {
//     if (!desc.factoryFn || !desc.path || !desc.description) {
//       throw new SchematicMissingFieldsException(name);
//     }
//
//     return desc as FileSystemSchematicDesc;
//   }
// }
