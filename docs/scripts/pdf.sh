#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

asciidoctor-pdf -r asciidoctor-diagram  -o $BASEDIR/../documantation.pdf $BASEDIR/../home.adoc
