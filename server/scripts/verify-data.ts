
import path from 'path';
import dotenv from 'dotenv';

const DAY_MS = 24 * 60 * 60 * 1000;

async function verify() {
    // 1. Load Environment Variables
    // Try loading from infra/docker/.env.backend
    const backendEnvPath = path.resolve(__dirname, '../../infra/docker/.env.backend');
    dotenv.config({ path: backendEnvPath });

    // Also try root .env
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });

    // 2. Adjust DATABASE_URL for localhost access
    if (process.env.DATABASE_URL) {
        console.log(`Original DATABASE_URL found (masked): ${process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')}`);

        // Replace container hostnames with localhost
        // Assuming standard port 5432 is mapped to 5432 on localhost
        process.env.DATABASE_URL = process.env.DATABASE_URL
            .replace('@db:', '@localhost:')
            .replace('@gip-postgis:', '@localhost:')
            .replace('@postgres:', '@localhost:');

        console.log(`Adjusted DATABASE_URL for host (masked): ${process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')}`);
    } else {
        console.log('DATABASE_URL not found in env, defaulting to localhost postgres');
        process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/postgres';
    }

    // 3. Dynamic Import of Service and Client
    // We do this AFTER setting the env var so knexfile picks up the change
    const { getDb } = await import('../src/db/client');
    const { dashboardService } = await import('../src/services/dashboardService');

    const db = getDb();
    const now = new Date();

    console.log('--- Verification Start ---');
    console.log(`Reference Time (Now): ${now.toISOString()}`);

    try {
        // 1. Last 24 Hours
        console.log('\n[1] Verifying Last 24 Hours KPI');
        const start24h = new Date(now.getTime() - DAY_MS).toISOString();
        const end24h = now.toISOString();

        const sql24h = await db('incidents')
            .whereBetween('reported_at', [start24h, end24h])
            .count<{ count: string }>('id as count')
            .first();
        const count24hSql = Number(sql24h?.count ?? 0);
        console.log(`SQL (reported_at between ${start24h} and ${end24h}): ${count24hSql}`);

        const kpi24h = await dashboardService.getLast24HoursKpi(
            { startDate: start24h, endDate: end24h },
            true,
            now
        );
        console.log(`Service (getLast24HoursKpi): ${kpi24h.currentCount}`);
        console.log(`Match: ${count24hSql === kpi24h.currentCount ? '✅' : '❌'}`);


        // 2. Last 7 Days (Type Distribution)
        console.log('\n[2] Verifying Last 7 Days (Type Distribution Total)');
        const start7d = new Date(now.getTime() - 7 * DAY_MS).toISOString();
        const end7d = now.toISOString();

        const sql7d = await db('incidents')
            .whereBetween('reported_at', [start7d, end7d])
            .count<{ count: string }>('id as count')
            .first();
        const count7dSql = Number(sql7d?.count ?? 0);
        console.log(`SQL (reported_at between ${start7d} and ${end7d}): ${count7dSql}`);

        const typeDist = await dashboardService.getIncidentsByType(
            { startDate: start7d, endDate: end7d },
            true,
            now
        );
        console.log(`Service (getIncidentsByType Total): ${typeDist.total}`);
        console.log(`Match: ${count7dSql === typeDist.total ? '✅' : '❌'}`);


        // 3. Last 30 Days (Daily Trend Total)
        console.log('\n[3] Verifying Last 30 Days (Daily Trend Total)');
        const start30d = new Date(now.getTime() - 30 * DAY_MS).toISOString();
        const end30d = now.toISOString();

        const sql30d = await db('incidents')
            .whereBetween('reported_at', [start30d, end30d])
            .count<{ count: string }>('id as count')
            .first();
        const count30dSql = Number(sql30d?.count ?? 0);
        console.log(`SQL (reported_at between ${start30d} and ${end30d}): ${count30dSql}`);

        const dailyTrend = await dashboardService.getDailyTrend(
            { startDate: start30d, endDate: end30d },
            true,
            now
        );
        const serviceTotal30d = dailyTrend.points.reduce((sum, p) => sum + p.count, 0);
        console.log(`Service (getDailyTrend Sum of Points): ${serviceTotal30d}`);
        console.log(`Match: ${count30dSql === serviceTotal30d ? '✅' : '❌'}`);

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        console.log('\n--- Verification End ---');
        await db.destroy();
        process.exit(0);
    }
}

verify().catch((err) => {
    console.error(err);
    process.exit(1);
});
