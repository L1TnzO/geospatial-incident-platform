
import { strategicService } from '../services/strategicService';
import { closeDb } from '../db/client';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_FILE = path.join(__dirname, '../../verification_output.txt');

function log(message: string, ...args: any[]) {
    const msg = message + (args.length > 0 ? ' ' + args.map((a: any) => JSON.stringify(a)).join(' ') : '');
    console.log(msg);
    fs.appendFileSync(OUTPUT_FILE, msg + '\n');
}

async function verifyCounts() {
    try {
        fs.writeFileSync(OUTPUT_FILE, 'Starting verification...\n');
        log('Starting verification...');

        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1); // Last 12 months

        const trendFilters = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        };

        log('Fetching Daily Trend with filters:', trendFilters);
        const dailyTrend = await strategicService.getDailyTrend(trendFilters);
        const trendTotal = dailyTrend.trend.currentTotal;
        log('Trend Analysis Total:', trendTotal);

        log('Fetching Priority Zones (Grid) with filters:', trendFilters);
        const priorityZones = await strategicService.getPriorityScores({
            ...trendFilters,
            groupBy: 'grid',
            resolution: '4' // Default resolution
        });

        const gridTotal = priorityZones.groups.reduce((sum, group) => sum + group.totalIncidents, 0);
        log('Priority Zones (Grid) Total:', gridTotal);
        log('Number of Grid Cells:', priorityZones.groups.length);

        const diff = trendTotal - gridTotal;
        log('Difference (Trend - Grid):', diff);

        if (diff === 0) {
            log('SUCCESS: Counts match exactly.');
        } else {
            log('WARNING: Counts do not match.');
            const percent = trendTotal > 0 ? (diff / trendTotal) * 100 : 0;
            log(`Difference is ${percent.toFixed(2)}% of total.`);
        }

    } catch (error) {
        log('Verification failed:', error);
    } finally {
        await closeDb();
    }
}

verifyCounts();
