import rp from 'request-promise';
import cjkCount from 'cjk-count';
import Boom from '@hapi/boom';
import objectAssignDeep from 'object-assign-deep';

import {knex, CONFIG, redis, SECRETS} from '../common';
import {AuthedRequest} from '../types/auth';

export const sleep = ms => new Promise(rs => setTimeout(rs, ms));

export const updateDB = async (wait = true) => {
  const cloned = JSON.parse(JSON.stringify(CONFIG.knex));
  cloned.connection.database = 'postgres';
  const createKnex = require('knex')(cloned);
  const rows = await createKnex('pg_catalog.pg_database').select().where('datname', CONFIG.knex.connection.database);
  if (!rows.length) {
    if (wait) {
      console.log('[DB] Creating database, but waiting 60 seconds for replication to initialize');
      await sleep(60000);
    }
    await createKnex.raw(`CREATE DATABASE ${CONFIG.knex.connection.database}`);
  }
  await createKnex.destroy();
  console.log('[DB] knex migrate:latest');
  try {
    await knex.migrate.latest({directory: './migrations'});
  } catch (e) {
    console.error(e);
  }
  console.log('[DB] Done');
};

export const revoluteDB = async () => {
  const cloned = JSON.parse(JSON.stringify(CONFIG.knex));
  cloned.connection.database = 'postgres';
  const createKnex = require('knex')(cloned);
  await createKnex('pg_stat_activity')
    .select(knex.raw('pg_terminate_backend(pid)'))
    .where('datname', CONFIG.knex.connection.database);
  await createKnex.raw(`DROP DATABASE IF EXISTS ${CONFIG.knex.connection.database}`);
  await updateDB(false);
};

export const tryPurgeCFCache = async (files: [String]) => {
  const body = files ?
    {files: files.map(f => `${CONFIG.cfPurgeCache.prependPath}${f}`)} :
    {purge_everything: true};
  try {
    console.log('tryPurgeCFCache', body);
    const res = await rp(Object.assign({}, CONFIG.cfPurgeCache.defaultOptions, {body}));
    console.log(res);
    return true;
  } catch (e) {
    console.error(e);
  }
  return false;
};

export const sqlJSONTables = tables => tables.map(t => knex.raw(`to_json("${t}".*) as "${t}"`));

export const paging = (req, res, next) => {
  let page = parseInt(req.params.page, 10) || 0;
  if (page < 0) page = 0;
  req.page = page;
  return next();
};

export const whitelist = (array, defValue, input) => {
  if (array.includes(input)) return input;
  return defValue;
};

export const clamp = (min, max, input) => {
  const value = parseInt(input, 10);
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const noCache = (res) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
};

export const requireLogin = (req: AuthedRequest, res, next) => {
  if (!req.user) {
    return next(Boom.unauthorized('Not logged in'));
  }
  return next();
};

export const rejectBanned = (req: AuthedRequest, res, next) => {
  if (req.user.ban_reason) {
    return next(Boom.unauthorized('Banned'));
  }
  return next();
};

export const getNameLength = (name) => {
  const result = cjkCount(name);
  const cjkLength = !result ? 0 : result.length;
  return (cjkLength * 2) + (name.length - cjkLength);
};

export const nameAllowed = name => getNameLength(name) >= 2 && getNameLength(name) <= 30;

export const limiter = (key, ttl = 60) => {
  const k = `limit:${key}`;
  return {
    check: async () => {
      if (!process.env.PROD) return true;
      const e = await redis.exists(k);
      return !e;
    },
    pass: async () => {
      await redis.setex(k, ttl, 1);
    }
  };
};

export const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * ((max - min) + 1)) + min;
};

export const generateID = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

export const findUniqueID = async (table, idField = 'id') => {
  for (let l = 4; l < 10; l++) {
    const id = generateID(l);
    const [row] = await knex(table).select().where(idField, id);
    if (row) continue;
    return id;
  }
  throw new Error('Impossible lol wtf!');
};

type ClientConfig = typeof CONFIG.clientConfig;
export const getClientConfig = async (): Promise<ClientConfig> => {
  const conf = await redis.get('override:client-config');
  if (!conf) return Object.assign({}, CONFIG.clientConfig);
  const confObj = JSON.parse(conf);
  const cc = objectAssignDeep({}, CONFIG.clientConfig, confObj);
  return cc;
};

export const requireAdminAuth = async (req: AuthedRequest, res, next) => {
  const cc = await getClientConfig();
  if (req.user && cc.admin[req.user.id]) return next();
  if (req.headers.authorization === SECRETS.panel_auth) return next();
  return next(Boom.forbidden());
};

export const auditRequest = async (req: AuthedRequest, type = 'POST') => {
  const details = {
    path: req.path,
    query: req.query,
    body: req.body
  };
  await knex('audit_log').insert({
    user_id: req.user.id,
    type,
    ip: req.userIP,
    details
  });
};

export const retainFields = (object, fields) => {
  const fieldSet = new Set(fields);
  Object.keys(object).forEach((f) => {
    if (!fieldSet.has(f)) delete object[f];
  });
};
