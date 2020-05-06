import {revoluteDB} from '../utils/misc';
import {CONFIG} from '../common';

(async () => {
  console.log('Revoluting DB');
  await revoluteDB();
  console.log('Truncate tables');
  const cloned = JSON.parse(JSON.stringify(CONFIG.knex));
  const tk = require('knex')(cloned);
  await tk.raw('TRUNCATE TABLE knex_migrations, knex_migrations_lock CASCADE');
  console.log('Done');
  process.exit(0);
})();
