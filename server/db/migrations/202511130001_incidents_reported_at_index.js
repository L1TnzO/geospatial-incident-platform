exports.up = async function up(knex) {
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_incidents_reported_at_id_desc ON incidents (reported_at DESC, id DESC)'
  );
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_incidents_reported_at_id_desc');
};
