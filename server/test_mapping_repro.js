require('dotenv').config();
const { incidentRepository } = require('./dist/db');

// Mimic frontend types and logic
const extractCoordinates = (incident) => {
    // incident.location is expected to be a Feature<Point>
    // So incident.location.geometry should be the Point
    const coordinates = incident.location?.geometry?.coordinates;

    if (!coordinates) {
        console.log('No coordinates found:', JSON.stringify(incident.location));
        return undefined;
    }
    if (coordinates.length < 2) {
        console.log('Coordinates length < 2:', coordinates);
        return undefined;
    }

    const [lng, lat] = coordinates;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.log('Invalid coordinate types:', typeof lat, typeof lng);
        return undefined;
    }

    return { lat, lng };
};

const mapIncidentToUi = (incident) => {
    const coordinates = extractCoordinates(incident);
    if (!coordinates) {
        return null;
    }
    return { id: incident.incidentNumber };
};

async function test() {
    console.log('--- Testing Mapping Logic ---');

    // Fetch the recently added incidents
    // We'll fetch changes since yesterday to be sure
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`Fetching changes since ${yesterday}...`);

    const delta = await incidentRepository.getChangesSince(yesterday);
    console.log(`Fetched ${delta.length} items.`);

    // Filter for our test incidents
    const testItems = delta.filter(i => i.incidentNumber.startsWith('DELTA-TEST'));
    console.log(`Found ${testItems.length} DELTA-TEST items.`);

    if (testItems.length === 0) {
        console.error('No test items found! Did you insert them?');
        process.exit(1);
    }

    for (const item of testItems) {
        console.log(`Testing mapping for ${item.incidentNumber}...`);
        const mapped = mapIncidentToUi(item);
        if (mapped) {
            console.log(`PASS: Mapped successfully.`);
        } else {
            console.error(`FAIL: Failed to map!`);
            console.log('Item structure:', JSON.stringify(item, null, 2));
        }
    }

    process.exit(0);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
