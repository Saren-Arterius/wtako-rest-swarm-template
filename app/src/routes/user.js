import express from 'express';
import Boom from '@hapi/boom';
import {publicUserFields, knexRead} from '../common';

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  const [row] = await knexRead('user')
    .select(publicUserFields)
    .where('id', req.params.id);
  if (!row) return next(Boom.notFound());
  return res.send(row);
});

module.exports = router;
