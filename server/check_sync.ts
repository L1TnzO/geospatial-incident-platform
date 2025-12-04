import 'dotenv/config';
import { incidentRepository } from '../src/db';

async function check() {
    console.log('Checking sync status stability...');
    const first = await incidentRepository.getSyncStatus();
    console.log('1:', first);

    await new Promise(r => setTimeout(r, 1000));

    const second = await incidentRepository.getSyncStatus();
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
    process.exit(0);
}

check().catch(console.error);
