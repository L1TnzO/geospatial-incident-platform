
import * as fs from 'fs';
import * as path from 'path';
const OUTPUT_FILE = path.join(__dirname, '../../test_output.txt');
fs.writeFileSync(OUTPUT_FILE, 'Hello from ts-node file write\n');
console.log('Hello from console');
