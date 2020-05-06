import Redis from 'ioredis';
import pg from 'pg';
import fbAdmin from 'firebase-admin';
import multer from 'multer';

import {configProd} from './config/prod';
import {configDev} from './config/dev';
import {secretsDev} from './config/secrets-dev';
import {secretsProd} from './config/secrets-prod';

// process.env.PROD = 1;
export const SECRETS = process.env.PROD ? secretsProd : secretsDev;
export const CONFIG = process.env.PROD ? configProd : configDev;

pg.types.setTypeParser(20, 'text', parseInt);
const knexConfig = Object.assign({}, CONFIG.knex);
const knexReadConfig = JSON.parse(JSON.stringify(knexConfig));
knexConfig.pool = {
  afterCreate (connection, callback) {
    connection.query(`SET TIME ZONE "${CONFIG.timezone.postgres}"`, (err) => {
      callback(err, connection);
    });
  }
};
knexReadConfig.pool = knexConfig.pool;
knexReadConfig.connection.port = CONFIG.knexReadPort;

const monitorKnex = (k, conf) => {
  setInterval(async () => {
    try {
      await k.raw('SELECT 1');
    } catch (e) {
      console.error(e);
      const k2 = require('knex')(conf);
      console.log('[monitorKnex] Rebuilding knex');
      k.client = k2.client;
    }
  }, 10000);
};

export const knex = require('knex')(knexConfig);

monitorKnex(knex, knexConfig);
export const knexRead = require('knex')(knexReadConfig);

monitorKnex(knexRead, knexReadConfig);

export const redis = new Redis(CONFIG.redis);

/*
fbAdmin.initializeApp({
  credential: fbAdmin.credential.cert(require(CONFIG.firebase.serviceAccountPath)),
  databaseURL: CONFIG.firebase.databaseURL
});
*/

export const firebase = fbAdmin;

const storage = multer.memoryStorage();
export const userUpload = multer({
  storage,
  limits: {
    fileSize: CONFIG.upload.fileSizeLimit
  }
});

export const publicUserFields = ['id', 'name', 'photo_url'];
