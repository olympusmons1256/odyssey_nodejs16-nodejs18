#!/bin/sh
tmpfile=$(mktemp /tmp/odysseymonitor.XXXXXXXXXX)
namespace=coreweave-tenant-newgame-prod
[ -z "${SLEEP_TIME+x}" ] && SLEEP_TIME=30
[ -z "${NOTIFY_SLACK+x}" ] && NOTIFY_SLACK=true
[ -z "${NODE_LIVESTATS+x}" ] && NODE_LIVESTATS=true
while true ; do
    kubectl "--context=$namespace" get pods | tail -n +2 > "$tmpfile"

    echo "_ Odyssey Monitoring | $(date --utc)_" | tee livestats.txt
    #- kubectl
    # Number of client pods
    echo "*Client Pods*" | tee -a livestats.txt
    echo "Total: $(cat $tmpfile | grep 'odyssey-client' | wc -l)" | tee -a livestats.txt
    # Number of client pods Running
    echo "Running: $(cat $tmpfile | grep 'odyssey-client' | awk '$3~/Running/' | wc -l)" | tee -a livestats.txt
    echo "Error: $(cat $tmpfile | grep 'odyssey-client' | awk '$3~/(Error|CrashBackOff)/' | wc -l)" | tee -a livestats.txt
    echo "Pending 1+ minutes: $(cat $tmpfile | grep 'odyssey-client' | awk '$3~/Pending/' | awk '$5~/([6-9][0-9]s|[1-9][0-9][0-9]+s|[1-9][0-9]*m)/' | wc -l)" | tee -a livestats.txt
    echo "ContainerCreating 2+ minutes: $(cat $tmpfile | grep 'odyssey-client' | awk '$3~/ContainerCreating/' | awk '$5~/([1-9][2-9][0-9]*s|[2-9][0-9]*m)/' | wc -l)" | tee -a livestats.txt
    echo "3+ Restarts: $(cat $tmpfile | grep 'odyssey-client' | awk '$4~/[3-9]+$/' | wc -l)" | tee -a livestats.txt
    echo "4+ Hours: $(cat $tmpfile | grep 'odyssey-client' | awk '$5~/[2-9][0-9]*h/' | wc -l)" | tee -a livestats.txt
    echo "*Server Pods*" | tee -a livestats.txt
    echo "Total: $(cat $tmpfile | grep 'odyssey-server' | wc -l)" | tee -a livestats.txt
    echo "Running: $(cat $tmpfile | grep 'odyssey-server' | awk '$3~/Running/' | wc -l)" | tee -a livestats.txt
    echo "Pending 1+ minutes: $(cat $tmpfile | grep 'odyssey-server' | awk '$3~/Pending/' | awk '$5~/([6-9][0-9]s|[1-9][0-9][0-9]+s|[1-9][0-9]*m)/' | wc -l)" | tee -a livestats.txt
    echo "Error: $(cat $tmpfile | grep 'odyssey-server' | awk '$3~/(Error|CrashBackOff)/' | wc -l)" | tee -a livestats.txt
    echo "72+ Hours: $(cat $tmpfile | grep 'odyssey-server' | awk '$5~/([7-9][2-9]*h|[2-9][0-9]*d)/' | wc -l)" | tee -a livestats.txt
    echo "3+ Restarts: $(cat $tmpfile | grep 'odyssey-server' | awk '$4~/[3-9]+$/' | wc -l)" | tee -a livestats.txt
    #- Error cases
    # Any kubectl commands fail to reach API
    if [ "${NODE_LIVESTATS}" = "true" ] ; then
        echo "*Firestore Data*" | tee -a livestats.txt
        node lib/scripts/liveStats.js > /dev/null
        cat livestats.json | yq e -P | tee -a livestats.txt
    fi
    [ "${NOTIFY_SLACK}" = "true" ] && curl -sq -o /dev/null -X POST -H 'Content-type: application/json' --data "{\"text\":\"$(cat livestats.txt)\"}" https://hooks.slack.com/services/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
    sleep $SLEEP_TIME
done

# user bA2ZPYKkaeb4xntARy3yx4T0Dbl1
