/**
 * Initial schema migration aligned with docs/sql/initial_schema.sql
 */

exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('incident_types', (table) => {
    table.increments('id').primary();
    table.string('type_code').notNullable().unique();
    table.string('name').notNullable();
    table.text('description');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('incident_severities', (table) => {
    table.increments('id').primary();
    table.string('severity_code').notNullable().unique();
    table.string('name').notNullable();
    table.smallint('priority').notNullable();
    table.string('color_hex', 7).notNullable().defaultTo('#000000');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(
    'ALTER TABLE incident_severities ADD CONSTRAINT incident_severities_priority_check CHECK (priority BETWEEN 1 AND 5)'
  );

  await knex.schema.createTable('incident_statuses', (table) => {
    table.increments('id').primary();
    table.string('status_code').notNullable().unique();
    table.string('name').notNullable();
    table.text('description');
    table.boolean('is_terminal').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('incident_sources', (table) => {
    table.increments('id').primary();
    table.string('source_code').notNullable().unique();
    table.string('name').notNullable();
    table.text('description');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('weather_conditions', (table) => {
    table.increments('id').primary();
    table.string('condition_code').notNullable().unique();
    table.string('name').notNullable();
    table.text('description');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('response_zones', (table) => {
    table.increments('id').primary();
    table.string('zone_code').notNullable().unique();
    table.string('name').notNullable();
    table.specificType('boundary', 'geometry(MultiPolygon, 4326)').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('stations', (table) => {
    table.bigIncrements('id').primary();
    table.string('station_code').notNullable().unique();
    table.string('name').notNullable();
    table.string('battalion');
    table.string('address_line_1');
    table.string('address_line_2');
    table.string('city');
    table.string('region');
    table.string('postal_code');
    table.string('phone');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.date('commissioned_on');
    table.date('decommissioned_on');
    table
      .integer('response_zone_id')
      .references('id')
      .inTable('response_zones')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
    table.specificType('location', 'geometry(Point, 4326)').notNullable();
    table.integer('coverage_radius_meters');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.check('coverage_radius_meters IS NULL OR coverage_radius_meters > 0');
  });

  await knex.schema.createTable('incidents', (table) => {
    table.bigIncrements('id').primary();
    table.string('incident_number').notNullable().unique();
    table.string('external_reference');
    table.string('title').notNullable();
    table.text('narrative');
    table
      .integer('type_id')
      .notNullable()
      .references('id')
      .inTable('incident_types')
      .onUpdate('CASCADE');
    table
      .integer('severity_id')
      .notNullable()
      .references('id')
      .inTable('incident_severities')
      .onUpdate('CASCADE');
    table
      .integer('status_id')
      .notNullable()
      .references('id')
      .inTable('incident_statuses')
      .onUpdate('CASCADE');
    table.integer('source_id').references('id').inTable('incident_sources').onUpdate('CASCADE');
    table
      .integer('weather_condition_id')
      .references('id')
      .inTable('weather_conditions')
      .onUpdate('CASCADE');
    table
      .bigInteger('primary_station_id')
      .references('id')
      .inTable('stations')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
    table.timestamp('occurrence_at', { useTz: true }).notNullable();
    table.timestamp('reported_at', { useTz: true }).notNullable();
    table.timestamp('dispatch_at', { useTz: true });
    table.timestamp('arrival_at', { useTz: true });
    table.timestamp('resolved_at', { useTz: true });
    table.specificType('location', 'geometry(Point, 4326)').notNullable();
    table.string('location_geohash');
    table.string('address_line_1');
    table.string('address_line_2');
    table.string('city');
    table.string('region');
    table.string('postal_code');
    table.smallint('casualty_count').notNullable().defaultTo(0);
    table.smallint('responder_injuries').notNullable().defaultTo(0);
    table.decimal('estimated_damage_amount', 14, 2);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.jsonb('metadata').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(
    'ALTER TABLE incidents ADD CONSTRAINT incidents_casualty_non_negative CHECK (casualty_count >= 0 AND responder_injuries >= 0)'
  );

  await knex.raw(
    'ALTER TABLE incidents ADD CONSTRAINT incidents_damage_non_negative CHECK (estimated_damage_amount IS NULL OR estimated_damage_amount >= 0)'
  );

  await knex.raw(`
    ALTER TABLE incidents ADD CONSTRAINT chk_incident_temporal CHECK (
      occurrence_at <= reported_at
      AND (dispatch_at IS NULL OR reported_at <= dispatch_at)
      AND (
        arrival_at IS NULL
        OR dispatch_at IS NULL
        OR dispatch_at <= arrival_at
      )
      AND (
        resolved_at IS NULL
        OR arrival_at IS NULL
        OR arrival_at <= resolved_at
      )
    )
  `);

  await knex.schema.createTable('incident_units', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('incident_id')
      .notNullable()
      .references('id')
      .inTable('incidents')
      .onDelete('CASCADE');
    table
      .bigInteger('station_id')
      .notNullable()
      .references('id')
      .inTable('stations')
      .onDelete('CASCADE');
    table.string('assignment_role');
    table.timestamp('dispatched_at', { useTz: true });
    table.timestamp('cleared_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['incident_id', 'station_id', 'assignment_role']);
  });

  await knex.schema.createTable('incident_assets', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('incident_id')
      .notNullable()
      .references('id')
      .inTable('incidents')
      .onDelete('CASCADE');
    table.string('asset_identifier').notNullable();
    table.string('asset_type').notNullable();
    table.string('status');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['incident_id', 'asset_identifier']);
  });

  await knex.schema.createTable('incident_notes', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('incident_id')
      .notNullable()
      .references('id')
      .inTable('incidents')
      .onDelete('CASCADE');
    table.string('author').notNullable();
    table.text('note').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('incident_daily_metrics', (table) => {
    table.bigIncrements('id').primary();
    table.date('metric_date').notNullable();
    table.integer('type_id').references('id').inTable('incident_types').onDelete('SET NULL');
    table
      .integer('severity_id')
      .references('id')
      .inTable('incident_severities')
      .onDelete('SET NULL');
    table.bigInteger('station_id').references('id').inTable('stations').onDelete('SET NULL');
    table.integer('incident_count').notNullable();
    table.decimal('average_response_minutes', 8, 2);
    table.decimal('average_resolution_minutes', 8, 2);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['metric_date', 'type_id', 'severity_id', 'station_id']);
    table.check('incident_count >= 0');
  });

  await knex.schema.createTable('incident_geohash_tiles', (table) => {
    table.string('geohash').primary();
    table.smallint('resolution').notNullable();
    table.specificType('centroid', 'geometry(Point, 4326)').notNullable();
    table.specificType('boundary', 'geometry(Polygon, 4326)').notNullable();
    table.integer('incident_count').notNullable().defaultTo(0);
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.check('resolution BETWEEN 1 AND 12');
    table.check('incident_count >= 0');
  });

  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_stations_location ON stations USING GIST (location)'
  );
  await knex.schema.alterTable('stations', (table) => {
    table.index(['response_zone_id'], 'idx_stations_zone');
  });
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location)'
  );
  await knex.schema.alterTable('incidents', (table) => {
    table.index(['occurrence_at'], 'idx_incidents_occurrence_at');
    table.index(['type_id'], 'idx_incidents_type');
    table.index(['severity_id'], 'idx_incidents_severity');
    table.index(['status_id'], 'idx_incidents_status');
    table.index(['primary_station_id'], 'idx_incidents_station');
    table.index(['location_geohash'], 'idx_incidents_geohash');
  });
  await knex.schema.alterTable('incident_units', (table) => {
    table.index(['station_id'], 'idx_incident_units_station');
    table.index(['incident_id'], 'idx_incident_units_incident');
  });
  await knex.schema.alterTable('incident_daily_metrics', (table) => {
    table.index(['metric_date'], 'idx_incident_daily_metrics_date');
  });
  await knex.schema.alterTable('incident_geohash_tiles', (table) => {
    table.index(['resolution'], 'idx_incident_geohash_tiles_resolution');
  });

  await knex.raw(`
    CREATE OR REPLACE FUNCTION touch_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER set_stations_updated_at
      BEFORE UPDATE ON stations
      FOR EACH ROW
      EXECUTE FUNCTION touch_updated_at();
  `);

  await knex.raw(`
    CREATE TRIGGER set_incidents_updated_at
      BEFORE UPDATE ON incidents
      FOR EACH ROW
      EXECUTE FUNCTION touch_updated_at();
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP TRIGGER IF EXISTS set_incidents_updated_at ON incidents');
  await knex.raw('DROP TRIGGER IF EXISTS set_stations_updated_at ON stations');
  await knex.raw('DROP FUNCTION IF EXISTS touch_updated_at()');

  await knex.schema.alterTable('incident_geohash_tiles', (table) => {
    table.dropIndex(['resolution'], 'idx_incident_geohash_tiles_resolution');
  });
  await knex.schema.alterTable('incident_daily_metrics', (table) => {
    table.dropIndex(['metric_date'], 'idx_incident_daily_metrics_date');
  });
  await knex.schema.alterTable('incident_units', (table) => {
    table.dropIndex(['station_id'], 'idx_incident_units_station');
    table.dropIndex(['incident_id'], 'idx_incident_units_incident');
  });
  await knex.schema.alterTable('incidents', (table) => {
    table.dropIndex(['occurrence_at'], 'idx_incidents_occurrence_at');
    table.dropIndex(['type_id'], 'idx_incidents_type');
    table.dropIndex(['severity_id'], 'idx_incidents_severity');
    table.dropIndex(['status_id'], 'idx_incidents_status');
    table.dropIndex(['primary_station_id'], 'idx_incidents_station');
    table.dropIndex(['location_geohash'], 'idx_incidents_geohash');
  });
  await knex.schema.alterTable('stations', (table) => {
    table.dropIndex(['response_zone_id'], 'idx_stations_zone');
  });
  await knex.raw('DROP INDEX IF EXISTS idx_stations_location');
  await knex.raw('DROP INDEX IF EXISTS idx_incidents_location');

  await knex.schema.dropTableIfExists('incident_geohash_tiles');
  await knex.schema.dropTableIfExists('incident_daily_metrics');
  await knex.schema.dropTableIfExists('incident_notes');
  await knex.schema.dropTableIfExists('incident_assets');
  await knex.schema.dropTableIfExists('incident_units');
  await knex.schema.dropTableIfExists('incidents');
  await knex.schema.dropTableIfExists('stations');
  await knex.schema.dropTableIfExists('response_zones');
  await knex.schema.dropTableIfExists('weather_conditions');
  await knex.schema.dropTableIfExists('incident_sources');
  await knex.schema.dropTableIfExists('incident_statuses');
  await knex.schema.dropTableIfExists('incident_severities');
  await knex.schema.dropTableIfExists('incident_types');

  await knex.raw('DROP EXTENSION IF EXISTS pgcrypto');
  await knex.raw('DROP EXTENSION IF EXISTS postgis');
};
