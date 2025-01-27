#!/bin/bash
#set -x
for i in $(kubectl get pods | grep -E -e 'Restarting|CrashLoopBackOff|Error' | awk '{ print $1 }') ; do
    #echo $i
    node=$(kubectl get pod $i -o yaml | grep nodeName | sed -r -e 's/.*nodeName: ([a-z0-9]+)$/\1/g')
    #echo $node
    gpu=$(kubectl get node $node -o yaml | grep -E -e '^\s*cloud\.google\.com\/gke-accelerator\:' | sed -r -e 's/^\s*cloud\.google\.com\/gke-accelerator\: (.*)$/\1/g')
    #echo $gpu
    echo "$i : $node : $gpu"
done
