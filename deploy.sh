#!/bin/bash
SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")
cd $SCRIPTPATH

export SERVICE_NAME=$(basename `pwd`)
export PROD=1

docker-compose build && 
docker-compose push &&
docker stack deploy --compose-file docker-compose.yml --prune ${SERVICE_NAME}
