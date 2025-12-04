require('dotenv').config();
const { incidentRepository } = require('./dist/db');

async function test() {
    console.log('--- Starting Delta Sync Backend Test (JS) ---');

    // 1. Get initial status
    const startStatus = await incidentRepository.getSyncStatus();
    console.log('Initial Status:', startStatus);

    // 2. Insert new incident
    const newId = `DELTA-TEST-${Date.now()}`;
    console.log(`Inserting incident ${newId}...`);

    await incidentRepository.createIncident({
        incidentNumber: newId,
        title: 'Backend Delta Test',
        typeCode: 'FIRE_STRUCTURE',
        severityCode: 'HIGH',
        statusCode: 'REPORTED',
        occurrenceAt: new Date().toISOString(),
        reportedAt: new Date().toISOString(),
        isActive: true,
        casualtyCount: 0,
        responderInjuries: 0,
        metadata: {},
        location: { latitude: -33.45, longitude: -70.66 }
    });

    // 3. Get new status
    const endStatus = await incidentRepository.getSyncStatus();
    console.log('New Status:', endStatus);

    if (endStatus.count <= startStatus.count) {
        console.error('FAIL: Count did not increase!');
    } else {
        console.log('PASS: Count increased.');
    }

    if (endStatus.lastModified === startStatus.lastModified) {
        console.error('FAIL: lastModified did not change!');
    } else {
        console.log('PASS: lastModified changed.');
    }

    // 4. Get Delta
    console.log(`Fetching delta since ${startStatus.lastModified}...`);
    const delta = await incidentRepository.getChangesSince(startStatus.lastModified);
    console.log(`Delta count: ${delta.length}`);

    const found = delta.find(i => i.incidentNumber === newId);
    if (found) {
        console.log('PASS: New incident found in delta.');
        console.log('Incident details:', JSON.stringify(found, null, 2));
    } else {
        console.error('FAIL: New incident NOT found in delta!');
        console.log('Delta items:', delta.map(i => i.incidentNumber));
    }

    process.exit(0);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
