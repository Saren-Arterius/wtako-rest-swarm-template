import express from 'express';
import {exec} from 'mz/child_process';
import {AuthedRequest, KYCRequest} from '../types/auth';
import {knex, redis, knexRead} from '../common';
import {requireLogin} from '../utils/misc';

const router = express.Router();

['user'].forEach((p) => {
  router.use(`/${p}`, require(`./${p}`));
});

router.get('/health', async (req: KYCRequest, res, next) => {
  const sequence = await redis.incr('health-check');
  const [log] = await knex('audit_log').insert({
    type: 'health_check',
    ip: req.userIP
  }).returning('*');
  const [row] = await knexRead('audit_log')
    .select(knex.raw('count(1) as cnt'));
  let [hostname] = await exec('hostname');
  hostname = hostname.trim();
  res.send({
    hostname, sequence, log, log_count: row.cnt
  });
});

router.get('/profile', requireLogin, async (req: AuthedRequest, res, next) => {
  res.send(req.user);
});

router.post('/profile', requireLogin, async (req: AuthedRequest, res, next) => {
  const {introduction} = req.body;
  const [row] = await knex('user')
    .update({introduction})
    .where('id', req.user.id)
    .returning('*');
  res.send(row);
});

module.exports = router;
