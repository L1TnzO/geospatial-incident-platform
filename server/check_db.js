
const knex = require('knex');
const config = require('./knexfile');

const db = knex(config.development);

async function check() {
    console.log('Checking DB...');
    try {
        const incidents = await db('incidents').count('id as count').first();
        console.log('Incidents:', incidents.count);
        const stations = await db('stations').count('station_code as count').first();
        console.log('Stations:', stations.count);
        const activeStations = await db('stations').where('is_active', true).count('station_code as count').first();
        console.log('Active Stations:', activeStations.count);
        const fs = require('fs');
        fs.writeFileSync('db_counts.txt', `Incidents: ${incidents.count}\nStations: ${stations.count}\nActive Stations: ${activeStations.count}`);
        console.log('Written to db_counts.txt');
    } catch (err) {
        console.error(err);
        const fs = require('fs');
        fs.writeFileSync('db_error.txt', `Error: ${err.message}\n${err.stack}`);
    } finally {
        await db.destroy();
    }
}

check();
