import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tests = [
    'phase3_test.js',
    'determinism.js'
];

let failed = false;

console.log('--- RUNNING ALL TESTS ---');

tests.forEach(testFile => {
    const testPath = path.join(__dirname, testFile);
    console.log(`\nRunning ${testFile}...`);
    try {
        execSync(`node ${testPath}`, { stdio: 'inherit' });
        console.log(`SUCCESS: ${testFile} passed.`);
    } catch (error) {
        console.error(`FAILURE: ${testFile} failed.`);
        failed = true;
    }
});

console.log('\n-------------------------');
if (failed) {
    console.log('OVERALL STATUS: FAILED');
    process.exit(1);
} else {
    console.log('OVERALL STATUS: PASSED');
}
