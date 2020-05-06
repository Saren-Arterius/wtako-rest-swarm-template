#!/bin/sh
SOCAT_REDIS_BASE=11379
SOCAT_SENTINEL_BASE=22379

sentinel_conf="/data/sentinel.conf"
redis_conf="/data/redis.conf"
redis_extra_conf="/data/redis-extra.conf"
state="new"

if [[ -f "$redis_conf" ]]; then
  state="exist"
fi

if [[ "$state" == "new" ]]; then
  echo "[redis-entrypoint] I am a new redis instance"
  echo "include /redis.conf.base" >> $redis_conf
  echo "include $redis_extra_conf" >> $redis_conf
  echo "slave-announce-ip 127.0.0.1" >> $redis_conf
  echo "slave-announce-port $((${SOCAT_REDIS_BASE} + ${NODE_SEQ}))" >> $redis_conf
fi

echo > $redis_extra_conf
if [ -n "$SLAVE_PRIORITY" ]; then
  echo "slave-priority $SLAVE_PRIORITY" >> $redis_extra_conf
fi
if [ -n "$REDIS_PASSWORD" ]; then
  echo "requirepass $REDIS_PASSWORD" >> $redis_extra_conf
  echo "masterauth $REDIS_PASSWORD" >> $redis_extra_conf
fi

# Initialize socat
(while true; do python3 /sentinel-proxy.py; echo "[redis-entrypoint] Restarting sentinel-proxy"; sleep 10; done)&
for n in $(seq 1 ${TOTAL_NODES}); do
  socat TCP4-LISTEN:$((${SOCAT_REDIS_BASE} + ${n})),bind=127.0.0.1,reuseaddr,fork TCP4:redis${n}:6379 &
  socat TCP4-LISTEN:$((${SOCAT_SENTINEL_BASE} + ${n})),bind=127.0.0.1,reuseaddr,fork TCP4:redis${n}:26379 &
done

(while true; do redis-server $redis_conf; echo "[redis-entrypoint] Restarting redis-server"; sleep 10; done)&

wait_redis() {
  while true; do
    loading=`REDISCLI_AUTH=${REDIS_PASSWORD} redis-cli info persistence | grep loading | cut -d':' -f2 | tr -d '\r'`
    if [[ "$loading" != "0" ]]; then
      echo "[redis-entrypoint] Instance is still loading"
      sleep 1
      continue
    fi
    break
  done
}

echo "[redis-entrypoint] Starting redis"
sleep 5
wait_redis

if [[ "$state" == "new" ]]; then
  # Is there an existing master with online connected_slaves >= 1?
  master_node=""
  for n in $(seq 1 ${TOTAL_NODES}); do
    slaves=`REDISCLI_AUTH=${REDIS_PASSWORD} redis-cli -h 127.0.0.1 -p $((${SOCAT_REDIS_BASE} + ${n})) info replication | grep state=online | wc -l`
    if [[ "$slaves" -ge "1" ]]; then
      master_node="$n" 
      break
    fi
  done
  
  if [[ -z "$master_node" && -n "$INIT_SLAVE_OF" ]]; then
    master_node="$INIT_SLAVE_OF"
    echo "[redis-entrypoint] Existing master not found, using redis${master_node}"
  fi

  if [[ -n "$master_node" && "$master_node" != "${NODE_SEQ}" ]]; then
    echo "[redis-entrypoint] Making myself a slave of redis${master_node}"
    REDISCLI_AUTH=${REDIS_PASSWORD} redis-cli slaveof 127.0.0.1 $((${SOCAT_REDIS_BASE} + ${master_node}))
  else
    echo "[redis-entrypoint] I am the master (redis${master_node})"
    REDISCLI_AUTH=${REDIS_PASSWORD} redis-cli slaveof no one
    master_node=${NODE_SEQ}
  fi

  REDISCLI_AUTH=${REDIS_PASSWORD} redis-cli save
  echo "[redis-entrypoint] Saved"

  echo "
requirepass ${REDIS_SENTINEL_PASSWORD}
port 36379
dir /data
sentinel monitor mn 127.0.0.1 $((${SOCAT_REDIS_BASE} + ${master_node})) $(((${TOTAL_NODES} / 2) + 1))
sentinel down-after-milliseconds mn 5000
sentinel parallel-syncs mn 1
sentinel failover-timeout mn 5000
sentinel auth-pass mn ${REDIS_PASSWORD}
sentinel announce-ip 127.0.0.1
sentinel announce-port $((${SOCAT_SENTINEL_BASE} + ${NODE_SEQ}))" > $sentinel_conf
fi

(while true; do redis-sentinel $sentinel_conf; echo "[redis-entrypoint] Restarting redis-sentinel"; sleep 10; done)&

trap 'echo "[redis-entrypoint] Caught SIGTERM, exiting"' SIGTERM
sleep infinity &
wait $!
REDISCLI_AUTH=${REDIS_PASSWORD} redis-cli shutdown
echo "[redis-entrypoint] Exiting other processes"
PGID=$(ps -o pgid= $$ | grep -o [0-9]*)
setsid kill -- -$PGID
exit 0
