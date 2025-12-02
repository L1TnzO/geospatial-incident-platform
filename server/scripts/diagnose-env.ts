
const path = require('path');
const knexConfig = require('../knexfile');

console.log('--- Environment Diagnosis ---');
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
    // Mask password
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`DATABASE_URL: ${maskedUrl}`);
} else {
    console.log('DATABASE_URL is NOT set.');
}

console.log('Other Env Vars:');
console.log(`DB_HOST: ${process.env.DB_HOST}`);
console.log(`POSTGRES_HOST: ${process.env.POSTGRES_HOST}`);
console.log(`PGHOST: ${process.env.PGHOST}`);

console.log('--- End Diagnosis ---');
