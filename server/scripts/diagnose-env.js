
const path = require('path');
const knexConfig = require('../knexfile');

console.log('--- Environment Diagnosis ---');
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`DATABASE_URL: ${maskedUrl}`);
} else {
    console.log('DATABASE_URL is NOT set.');
}
console.log('--- End Diagnosis ---');
