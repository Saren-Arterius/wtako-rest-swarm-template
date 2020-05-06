# Introduction
A high-availability, load-balanced express.js + postgresql + redis + db admin panels template, powered by docker swarm. 

# Juice
- express.js: node 13, eslint, knex, @hapi/boom, bull, multer, firebase-admin (half-functional user system included)
- postgresql: postgres 12, patroni as replication controller, haproxy as ha+lb, pgroonga, pg-spgist
- redis: sentinel, socat, sentinel-proxy to hack get-master-addr-by-name
- pgadmin: postgresql administration
- phpredmin: redis administration

# Deploy environment
1. Initialize a swarm if needed: `$ docker swarm init`
2. Add a db1 label to your node for database servers to be sticky: `$ docker node update --label-add id=db1 $(hostname)`
3. For single node machine, `$ python3 scale-patroni.py 1` and `$ python3 scale-redis.py 1` to scale down. Otherwise you may scale up (`$ python3 scale-patroni.py [n]` and `$ python3 scale-redis.py [n]`), and add `db2`, `db3`, ..., `db[n]` labels to other nodes.
4. Add a local and volatile docker image registry for images to work: `$ docker service create --name registry --constraint node.id==db1 --publish=3333:5000 -e REGISTRY_HTTP_ADDR=0.0.0.0:5000 registry:latest`. If db1 is offline, new nodes could not get images from the registry.
5. `$ ./deploy.sh` and wait.
6. After the command finished, wait for 2 minutes more for postgres to initialize.

# Access web + health check
(Requires stack up)
1. Open http://127.0.0.1:31380/health or `$ curl http://127.0.0.1:31380/health`
2. In the JSON output, `sequence` indicates redis health/consistency, and `log_count` indicates postgres health/consistency.

# Web dev
(Requires stack up, assume you are on db1 and redis1 is master)
1. `$ cd app`
2. `$ npm install`
3. `$ npm run dev`
4. Open http://127.0.0.1:3000/health or `$ curl http://127.0.0.1:3000/health`
5. Nodemon will restart web for you if any code changed.
6. To update and deploy to production: `$ ./deploy.sh`
7. Use `$ REDISCLI_AUTH=password_redis redis-cli -p 6379 info replication` to check if redis1 is master, and force switchover to redis1 using `$ redis-cli -p 36379 sentinel failover mn`.

# Access pgAdmin
(Requires stack up, assume you are on db1)
1. Open http://127.0.0.1:31300/browser/
2. Login (email: admin@example.com, password: password_pgadmin)
3. Create new server (host: haproxy, port: 5000, username: postgres, password: password_postgres)

# Access phpredmin
(Requires stack up)
3. Open http://127.0.0.1:31301
4. Login (username: admin, password: password_phpredmin)

# Change postgres schema without adding migration file & keep existing data
(Requires stack up, assume you are on db1)
1. `$ ./revolute-db.sh`
2. For production (dangerous!): `$ PROD=1 ./revolute-db.sh`

# Backup redis and postgres
(Requires stack up and sudo, assume you are on db1)
1. `$ ./backup.sh`
2. For production: `$ PROD=1 ./backup.sh`
3. Destination: `backup/[dev OR prod]/[datetime]/redis.rdb`, `backup/[dev OR prod]/[datetime]/pgdump.out`

# Restore backup
For postgres, copy the dump back to pgadmin if needed. Refer to `revolute-db.sh` to restore the dump.
```
docker exec -it $pgadmin_id sh -c "PGPASSWORD='${password}' /usr/local/pgsql-12/pg_restore --host 'haproxy' --port '5000' --username 'postgres' --dbname '${dbname}' --data-only --single-transaction --verbose --schema 'public' '${file}'"
```

For redis, you need to remove the stack (see below, but dont prune volumes). Go to each redis node (or just current master) and replace the `redis.rdb` with the backup, by ssh in.

# Remove everything and start over
1. ``$ docker stack remove $(basename `pwd`)``
2. Wait for a minute, then run `$ yes | docker volume prune` for every swarm node

# Password to find and replace
- password_pgadmin
- password_postgres
- password_phpredmin
- password_admin_panel
- password_redis

# Caveats
Patroni scaling is messy. 

Apart from the fact that it's hard to scale etcd here, pgroonga is not really compatible with pg_basebackup:
```
WARNING:  could not verify checksum in file "./base/16386/pgrn", block 0: read buffer size 4096 and page size 8192 differ
pg_basebackup: error: COPY stream ended before last file was finished
```
For scaling up from 2(+) nodes, perform manual switchover may workaround such a problem. However, for scaling up from 1 node, the best way should be: backup, start over, and restore.