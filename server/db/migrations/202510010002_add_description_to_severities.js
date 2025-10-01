exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('incident_severities', 'description');
  if (!hasColumn) {
    await knex.schema.alterTable('incident_severities', (table) => {
      table.text('description');
    });
  }
};

exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('incident_severities', 'description');
  if (hasColumn) {
    await knex.schema.alterTable('incident_severities', (table) => {
      table.dropColumn('description');
    });
  }
};
