exports.up = async function up(knex) {
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_incidents_active_occurrence ON incidents (occurrence_at DESC) WHERE is_active = TRUE'
  );

  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_incidents_occurrence_at_brin ON incidents USING BRIN (occurrence_at) WITH (pages_per_range = 32)'
  );

  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_incident_notes_incident_id ON incident_notes (incident_id)'
  );
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_incident_notes_incident_id');
  await knex.raw('DROP INDEX IF EXISTS idx_incidents_occurrence_at_brin');
  await knex.raw('DROP INDEX IF EXISTS idx_incidents_active_occurrence');
};
