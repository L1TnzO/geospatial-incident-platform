const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://gis_dev:gis_dev_password@localhost:5432/gis',
});

async function check() {
    await client.connect();

    console.log('Checking sync status stability...');

    const query = `
    SELECT 
      MAX(updated_at) as "lastModified", 
      COUNT(*) as count 
    FROM incidents 
    WHERE deleted_at IS NULL
  `;

    const res1 = await client.query(query);
    const first = {
        lastModified: res1.rows[0].lastModified.toISOString(),
        count: Number(res1.rows[0].count)
    };
    console.log('1:', first);

    await new Promise(r => setTimeout(r, 1000));

    const res2 = await client.query(query);
    const second = {
        lastModified: res2.rows[0].lastModified.toISOString(),
        count: Number(res2.rows[0].count)
    };
    console.log('2:', second);

    if (first.lastModified !== second.lastModified) {
        console.error('MISMATCH: lastModified changed!');
    } else {
        console.log('MATCH: lastModified is stable.');
    }

    if (first.count !== second.count) {
        console.error('MISMATCH: count changed!');
    } else {
        console.log('MATCH: count is stable.');
    }

    await client.end();
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
