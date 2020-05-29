#!/usr/bin/env bash

# https://tinyapps.org/blog/nix/201701240700_convert_asciidoc_to_markdown.html

BASEDIR=$(dirname "$0")
# MD=markdown_github
MD=gfm

asciidoc -b docbook -o $BASEDIR/../README.xml $BASEDIR/../README.adoc

iconv -t utf-8 $BASEDIR/../README.xml | pandoc -f docbook -t $MD --wrap=none | iconv -f utf-8 > $BASEDIR/../README.md
