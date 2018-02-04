#!/bin/sh

_script="$(readlink -f $0)"

## my base location
BASEDIR=$(dirname "$_script")

## my work location
WORKDIR=`pwd`

if [ -f "$WORKDIR/node_modules/typexs-base/package.json" ]; then
  node $WORKDIR/node_modules/typexs-base/bin/cli.js $*
elseif [ -f "$WORKDIR/bin/cli.js" ]
  node $WORKDIR/bin/cli.js $*
else
  node $BASEDIR/cli.js $*
fi
