import {CONFIG} from '../common';

exports.up = async (knex, Promise) => {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "bktree"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgroonga"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "cube"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "earthdistance"');

  const currentUnixMSRaw = knex.raw("ROUND(EXTRACT(EPOCH FROM NOW() AT TIME ZONE 'UTC') * 1000)");
  const uuidRaw = knex.raw('uuid_generate_v4()');

  await knex.schema.createTable('user', (table) => {
    table.string('id').primary().defaultTo(uuidRaw);
    table.string('name', 30).unique().notNullable();
    table.string('email').unique().notNullable();
    table.boolean('verified').notNullable().defaultTo(false);
    table.text('introduction', 2000);
    table.string('photo_url');
    table.jsonb('ban_reason');
    table.jsonb('details');
    table.bigInteger('created_at').notNullable().defaultTo(currentUnixMSRaw);
    table.index('created_at');
  });

  await knex.schema.createTable('article', (table) => {
    table.string('id', 11).primary().defaultTo(uuidRaw);
    table.string('user_id').notNullable().references('id').inTable('user').onUpdate('CASCADE').onDelete('CASCADE');
    table.text('title').notNullable();
    table.text('tags').notNullable();
    table.text('body').notNullable();
    table.enu('status', ['PENDING', 'ACTIVE', 'INACTIVE', 'REMOVED']).notNullable();
    table.integer('view_count');
    table.integer('upvote_count');
    table.integer('downvote_count');
    table.bigInteger('active_at');
    table.bigInteger('last_viewed_at');
    table.bigInteger('created_at').notNullable().defaultTo(currentUnixMSRaw);
    table.jsonb('details');
    table.index('created_at');
    table.index('active_at');
    table.index('last_viewed_at');
    table.index('view_count');
    table.index('upvote_count');
    table.index(['status', 'active_at']);
    table.index(['status', 'user_id', 'active_at']);
  });
  await knex.raw('CREATE INDEX article_pgroonga_idx ON article USING PGroonga((ARRAY[article.title, article.tags, article.body]))');
  await knex.raw(`CREATE INDEX article_hotness ON article (${CONFIG.hotnessWeight})`);

  await knex.schema.createTable('audit_log', (table) => {
    table.string('id').primary().defaultTo(uuidRaw);
    table.string('user_id').references('id').inTable('user').onUpdate('CASCADE').onDelete('CASCADE');
    table.text('type').notNullable();
    table.text('ip').notNullable();
    table.jsonb('details');
    table.bigInteger('created_at').notNullable().defaultTo(currentUnixMSRaw);
    table.index('created_at');
    table.index('type');
  });
};

exports.down = async (knex, Promise) => {
};
