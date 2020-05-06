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

redis_id=`docker ps | grep ${SERVICE_NAME}_redis | awk '{print $1}'`
if [[ -z "$redis_id" ]]; then
  echo 'redis not found in this node'
  exit 1
fi

d=$(date '+%Y-%m-%d_%H-%M-%S')
if [[ -z "${PROD}" ]]; then
  BACKUP_DEST="$SCRIPTPATH/backup/dev/$d"
  pgdump_filename=dev_$d
  dbname=`cat app/src/config/dev.js | grep database: | cut -d"'" -f2`
else
  BACKUP_DEST="$SCRIPTPATH/backup/prod/$d"
  pgdump_filename=prod_$d
  dbname=`cat app/src/config/prod.js | grep database: | cut -d"'" -f2`
fi

mkdir -p $BACKUP_DEST
chmod -R 700 $BACKUP_DEST

# postgres backup
email=`cat docker-compose.yml | grep PGADMIN_DEFAULT_EMAIL | awk '{print $2}' | sed 's/@/_/g'`
dir="/var/lib/pgadmin/storage/${email}"
file="${dir}/${pgdump_filename}"
password=`cat patroni/docker/patroni.env | grep PATRONI_SUPERUSER_PASSWORD | cut -d'=' -f2`
pgadmin_mp=`docker volume inspect ${SERVICE_NAME}_pgadmin-data | grep Mountpoint | cut -d'"' -f4`

docker exec -it $pgadmin_id sh -c "mkdir -p ${dir}; PGPASSWORD='${password}' /usr/local/pgsql-12/pg_dump --file '${file}' --host 'haproxy' --port '5000' --username 'postgres' --verbose --format=c --blobs --data-only --schema 'public' --dbname '${dbname}' --data-only" &&
sudo cp $pgadmin_mp/storage/${email}/${pgdump_filename} $BACKUP_DEST/pgdump.out

# redis backup
redis_password=`cat redis/redis.env | grep REDIS_PASSWORD | cut -d'=' -f2`
redis_mp=`docker volume inspect ${SERVICE_NAME}_redis-data-1 | grep Mountpoint | cut -d'"' -f4`
docker exec -it $redis_id sh -c "REDISCLI_AUTH=${redis_password} redis-cli save" &&
sudo cp $redis_mp/dump.rdb $BACKUP_DEST/redis.rdb

sudo chown -R $(whoami) $BACKUP_DEST