#!/bin/bash
SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")
cd $SCRIPTPATH

export SERVICE_NAME=$(basename `pwd`)

set -x

pgadmin_id=`docker ps | grep ${SERVICE_NAME}_pgadmin | awk '{print $1}'`
if [[ -z "$pgadmin_id" ]]; then
  echo 'pgadmin not found in this node'
  exit 1
fi

app_id=`docker ps | grep ${SERVICE_NAME}_app | awk '{print $1}'`
if [[ -z "$app_id" ]]; then
  echo 'app not found in this node'
  exit 1
fi

if [[ -z "${PROD}" ]]; then
  filename=dev_$(date '+%Y-%m-%d_%H-%M-%S')
  dbname=`cat app/src/config/dev.js | grep database: | cut -d"'" -f2`
else
  filename=prod_$(date '+%Y-%m-%d_%H-%M-%S')
  dbname=`cat app/src/config/prod.js | grep database: | cut -d"'" -f2`
fi

email=`cat docker-compose.yml | grep PGADMIN_DEFAULT_EMAIL | awk '{print $2}' | sed 's/@/_/g'`
dir="/var/lib/pgadmin/storage/${email}"
file="${dir}/${filename}"
password=`cat patroni/docker/patroni.env | grep PATRONI_SUPERUSER_PASSWORD | cut -d'=' -f2`

# dump
docker exec -it $pgadmin_id sh -c "mkdir -p ${dir}; PGPASSWORD='${password}' /usr/local/pgsql-12/pg_dump --file '${file}' --host 'haproxy' --port '5000' --username 'postgres' --verbose --format=c --blobs --data-only --schema 'public' --dbname '${dbname}' --data-only" &&

(if [[ -z "${PROD}" ]]; then
  cd app/dist &&
  node bin/revolute-db.js
else
  docker exec -it $app_id sh -c 'cd dist; node bin/revolute-db.js'
fi) &&

# restore dump
docker exec -it $pgadmin_id sh -c "PGPASSWORD='${password}' /usr/local/pgsql-12/pg_restore --host 'haproxy' --port '5000' --username 'postgres' --dbname '${dbname}' --data-only --single-transaction --verbose --schema 'public' '${file}'"