#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
const fs = require("fs");
const path = require("path");
const current = process.cwd();
var tsMode = false;

if (fs.existsSync(path.join(current, 'tsconfig.json'))) {
  tsMode = true;
  require('ts-node').register({
    project: path.join(current, 'tsconfig.json')
  });
}

require("reflect-metadata");
if (fs.existsSync(path.join(current, 'package.json'))) {
  var json = require(path.join(current, 'package.json'));
  if (json.name === '@typexs/base') {
    const cli_1 = require(tsMode ? path.join(current, 'src', 'base', 'cli') : path.join(current, 'base', 'cli'));
    cli_1.cli();
  } else {
    const cli_1 = require("@typexs/base");
    cli_1.cli();
  }
} else {
  console.log('no package.json present, create project first');
}
