#!/bin/sh
FAILED="0"
[ ! -r "functions.list" ] && { echo "ERROR: List of functions must be in file 'functions.list'"; exit 1; }
while read -r i ; do
    [ "$FAILED" = "1" ] && continue
    if [ "$FAILED" = "0" ] ; then
        firebase deploy --debug -f --only functions:"$i" || FAILED=1
        [ "$FAILED" = "1" ] && echo "Failed on: $i"
    fi
done < functions.list
