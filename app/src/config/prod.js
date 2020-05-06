import {secretsProd} from './secrets-prod';

const secrets = secretsProd;
export const configProd = {
  clientConfig: {
    environment: 'prod'
  },
  upload: {
    fileSizeLimit: 1 * 1024 * 1024 // 10MB
  },
  timezone: {
    postgres: 'Asia/Hong_Kong',
    tzoffset: 8 * 60 * 60 * 1000
  },
  redis: {
    sentinels: [
      {host: 'redis1', port: 26379},
      {host: 'redis2', port: 26379},
      {host: 'redis3', port: 26379}
    ],
    name: 'mn',
    sentinelPassword: secrets.redis_password,
    password: secrets.redis_password,
    db: 0
  },
  knexReadPort: '5001',
  knex: {
    client: 'pg',
    connection: {
      host: 'haproxy',
      port: '5000',
      user: 'postgres',
      password: secrets.pg_password,
      database: 'app_backend_prod'
    }
  },
  firebase: {
    serviceAccountPath: './credentials/xxx.json',
    databaseURL: 'https://xxx.firebaseio.com'
  },
  cfPurgeCache: {
    prependPath: null,
    defaultOptions: {
      method: 'POST',
      uri: 'https://api.cloudflare.com/client/v4/zones/xxx/purge_cache',
      headers: secrets.cf_auth_headers,
      json: true
    }
  },
  trustedHosts: {
    localhost: true,
    'local.host': true
  },
  hotnessWeight: '(LOG(view_count * COALESCE(0.1 + (upvote_count / (upvote_count + downvote_count)), 1)) * SIGN(upvote_count) + (active_at / 259200))'
};
