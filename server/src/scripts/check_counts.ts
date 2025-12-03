
import { getDb, closeDb } from '../db/client';

async function checkCounts() {
    console.log('Starting checkCounts...');
    const db = getDb();

    try {
        const incidentsCount = await db('incidents').count('id as count').first();
        const stationsCount = await db('stations').count('station_code as count').first();
        const activeStationsCount = await db('stations').where('is_active', true).count('station_code as count').first();

        const fs = require('fs');
        fs.writeFileSync('counts.txt', `Incidents: ${incidentsCount?.count}\nStations: ${stationsCount?.count}\nActive Stations: ${activeStationsCount?.count}`);
        console.log('Written to counts.txt');
    } catch (error) {
        console.error('Error checking counts:', error);
    } finally {
        await closeDb();
    }
}

checkCounts();
