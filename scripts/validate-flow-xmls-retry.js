#!/usr/bin/env node
// Retry the 4 configs that ETIMEDOUT in the main validator with a longer timeout.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RETRY = ['Interview_Scheduling', 'Maintenance_Windows', 'Meeting_Room_Booking', 'Tutoring_Sessions'];
const TMP_DIR = path.resolve(__dirname, '..', 'tmp', 'flow-validate');

const results = { pass: [], fail: [] };
for (const name of RETRY) {
    const flowFile = path.join('force-app', 'main', 'default', 'flows', name + '.flow-meta.xml');
    try {
        const raw = execSync(`sf project deploy validate --source-dir "${flowFile}" --target-org resilient-badger --json`, {
            cwd: TMP_DIR,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 300000, // 5 min
        });
        const p = JSON.parse(raw);
        const success = p.status === 0 && p.result && p.result.status !== 'Failed';
        if (success) {
            results.pass.push(name);
            console.log(`  ✓ ${name}`);
        } else {
            const errs = (p.result && p.result.details && p.result.details.componentFailures) || [];
            results.fail.push({ name, error: errs.slice(0, 2).map(e => `${e.problemType}: ${e.problem}`).join(' | ') || 'unknown' });
            console.log(`  ✗ ${name}: ${errs[0]?.problem || 'unknown'}`);
        }
    } catch (e) {
        let detail = e.message;
        if (e.stdout) {
            try {
                const p = JSON.parse(e.stdout.toString());
                const errs = (p.result && p.result.details && p.result.details.componentFailures) || [];
                if (errs.length) detail = errs.slice(0, 2).map(e => `${e.problemType}: ${e.problem}`).join(' | ');
                else if (p.message) detail = p.message;
            } catch (_) {}
        }
        results.fail.push({ name, error: detail.slice(0, 300) });
        console.log(`  ✗ ${name}: ${detail.slice(0, 100)}`);
    }
}
console.log(`\nRetry results: PASS ${results.pass.length}/${RETRY.length}`);
process.exit(results.fail.length > 0 ? 1 : 0);
