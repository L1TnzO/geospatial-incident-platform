
exports.up = async function up(knex) {
    await knex.schema.createTable('obsolete_infrastructure', (table) => {
        table.bigIncrements('id').primary();
        table.string('infra_code').notNullable().unique();
        table.text('description');
        table.string('status').notNullable().defaultTo('ACTIVE'); // ACTIVE, BURNED, DEMOLISHED
        table.specificType('location', 'geometry(Point, 4326)').notNullable();
        table.bigInteger('incident_id').references('id').inTable('incidents').onDelete('SET NULL');
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.raw(
        'CREATE INDEX IF NOT EXISTS idx_obsolete_infrastructure_location ON obsolete_infrastructure USING GIST (location)'
    );

    await knex.raw(`
    CREATE TRIGGER set_obsolete_infrastructure_updated_at
      BEFORE UPDATE ON obsolete_infrastructure
      FOR EACH ROW
      EXECUTE FUNCTION touch_updated_at();
  `);
};

exports.down = async function down(knex) {
    await knex.raw('DROP TRIGGER IF EXISTS set_obsolete_infrastructure_updated_at ON obsolete_infrastructure');
    await knex.schema.dropTableIfExists('obsolete_infrastructure');
};
