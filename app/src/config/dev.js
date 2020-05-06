import {secretsDev} from './secrets-dev';

const secrets = secretsDev;
export const configDev = {
  clientConfig: {
    environment: 'dev'
  },
  upload: {
    fileSizeLimit: 1 * 1024 * 1024 // 10MB
  },
  timezone: {
    postgres: 'Asia/Hong_Kong',
    tzoffset: 8 * 60 * 60 * 1000
  },
  redis: {
    port: 6379, // Redis port
    host: '127.0.0.1', // Redis host
    password: secrets.redis_password,
    family: 4, // 4 (IPv4) or 6 (IPv6)
    db: 10
  },
  knexReadPort: '5001',
  knex: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: '5000',
      user: 'postgres',
      password: secrets.pg_password,
      database: 'app_backend_dev',
      keepAlive: true
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
