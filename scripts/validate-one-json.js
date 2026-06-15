#!/usr/bin/env node
/**
 * One-off: validate ONE downloaded JSON config against a target org
 * via mdpick.MultiDatePickConfigDeployer.scanImportedConfig().
 * Usage: node scripts/validate-one-json.js <configName> [orgAlias]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const configName = process.argv[2] || 'Appointment_Booking';
const org = process.argv[3] || 'curious-badger';
const cfgPath = path.resolve(__dirname, '..', 'downloads', 'configs', configName + '.json');

const rawJson = fs.readFileSync(cfgPath, 'utf-8');
JSON.parse(rawJson);

const escaped = rawJson
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n');

const apexCode =
    `String j = '${escaped}';\n` +
    `mdpick.MultiDatePickConfigDeployer.ScanResult r = mdpick.MultiDatePickConfigDeployer.scanImportedConfig(j);\n` +
    `System.debug('SCAN_RESULT_JSON: ' + JSON.serialize(r));`;

const tmpFile = path.join(os.tmpdir(), `scan-${configName}.apex`);
fs.writeFileSync(tmpFile, apexCode);

console.log(`Calling mdpick.MultiDatePickConfigDeployer.scanImportedConfig on ${org} for ${configName}...`);
try {
    const raw = execSync(`sf apex run --file "${tmpFile}" --target-org ${org} --json`, {
        encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000
    });
    const parsed = JSON.parse(raw);
    if (!parsed.result || !parsed.result.success) {
        console.log('FAIL apex-exec:');
        console.log('  compile:', parsed.result?.compileProblem);
        console.log('  exception:', parsed.result?.exceptionMessage);
        process.exit(1);
    }
    const log = parsed.result.logs || '';
    const m = log.match(/SCAN_RESULT_JSON:\s*(\{.*?\})\s*(?:\n|$)/);
    if (!m) {
        console.log('No SCAN_RESULT_JSON marker. Logs tail:');
        console.log(log.slice(-2000));
        process.exit(1);
    }
    const scan = JSON.parse(m[1]);
    console.log('');
    console.log('=== SCAN RESULT ===');
    console.log('  parseError:', scan.parseError);
    console.log('  parseErrorMessage:', scan.parseErrorMessage);
    console.log('  unresolvedCount:', scan.unresolvedCount);
    console.log('  items.length:', (scan.items || []).length);
    if (scan.unresolvedCount > 0) {
        console.log('  UNRESOLVED:');
        (scan.items || []).filter(i => !i.resolved).forEach(u =>
            console.log(`    - ${u.field}=${u.value} (${u.reason || 'missing'})`));
        process.exit(1);
    } else {
        console.log('  ✅ PASS — all refs resolved');
    }
} catch (e) {
    console.log('EXEC ERR:');
    console.log('  ' + (e.stdout ? e.stdout.toString().slice(0, 1500) : e.message));
    process.exit(1);
}
