#!/usr/bin/env node
/**
 * Validate every JSON config in downloads/configs/ against resilient-badger
 * by calling MultiDatePickConfigDeployer.scanImportedConfig() — the same
 * Apex method the wizard's Import tab uses. Reports any missing
 * objects/fields in the target org.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT, 'downloads', 'configs');
const TMP_DIR = path.join(ROOT, 'tmp', 'json-validate');
fs.mkdirSync(TMP_DIR, { recursive: true });

const configFiles = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${configFiles.length} JSON configs. Running scanImportedConfig per file...`);

const results = { pass: [], fail: [] };

for (const cf of configFiles) {
    const configName = cf.replace('.json', '');
    const cfgPath = path.join(CONFIG_DIR, cf);
    let rawJson;
    try {
        rawJson = fs.readFileSync(cfgPath, 'utf-8');
        JSON.parse(rawJson); // sanity-parse
    } catch (e) {
        results.fail.push({ name: configName, stage: 'parse-json', error: e.message });
        process.stdout.write('P');
        continue;
    }

    // Escape JSON for embedding in Apex single-quoted string
    const escaped = rawJson
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, '\\n');

    const apexCode = `String j = '${escaped}';
MultiDatePickConfigDeployer.ScanResult r = MultiDatePickConfigDeployer.scanImportedConfig(j);
System.debug('SCAN_RESULT_JSON: ' + JSON.serialize(r));`;

    const tmpFile = path.join(TMP_DIR, configName + '.apex');
    fs.writeFileSync(tmpFile, apexCode);

    try {
        const cmd = `sf apex run --file "${tmpFile}" --target-org resilient-badger --json`;
        const raw = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
        const parsed = JSON.parse(raw);
        if (!parsed.result || !parsed.result.success) {
            const compileProb = parsed.result && parsed.result.compileProblem;
            const excMsg = parsed.result && parsed.result.exceptionMessage;
            results.fail.push({
                name: configName,
                stage: 'apex-exec',
                error: (compileProb ? 'COMPILE: ' + compileProb : '') + (excMsg ? ' EXCEPTION: ' + excMsg : '') || 'unknown',
            });
            process.stdout.write('F');
            continue;
        }
        const log = parsed.result.logs || '';
        const match = log.match(/SCAN_RESULT_JSON:\s*(\{.*?\})\s*(?:\n|$)/);
        if (!match) {
            results.fail.push({ name: configName, stage: 'no-debug-output', error: 'SCAN_RESULT_JSON marker not found in debug log' });
            process.stdout.write('?');
            continue;
        }
        let scan;
        try {
            scan = JSON.parse(match[1]);
        } catch (e) {
            results.fail.push({ name: configName, stage: 'scan-parse', error: e.message });
            process.stdout.write('?');
            continue;
        }
        if (scan.parseError) {
            results.fail.push({ name: configName, stage: 'apex-parse', error: scan.parseErrorMessage || 'unknown parse error' });
            process.stdout.write('F');
            continue;
        }
        if ((scan.unresolvedCount || 0) > 0) {
            const unresolved = (scan.items || []).filter(it => !it.resolved);
            results.fail.push({
                name: configName,
                stage: 'unresolved-refs',
                error: unresolved.slice(0, 5).map(u => `${u.field}=${u.value} (${u.reason || 'missing'})`).join(' | '),
                unresolvedCount: scan.unresolvedCount,
            });
            process.stdout.write('U');
        } else {
            results.pass.push(configName);
            process.stdout.write('.');
        }
    } catch (e) {
        let detail = e.message;
        if (e.stdout) {
            try {
                const p = JSON.parse(e.stdout.toString());
                if (p.message) detail = p.message;
            } catch (_) {}
        }
        results.fail.push({ name: configName, stage: 'sf-exec', error: detail.slice(0, 300) });
        process.stdout.write('E');
    }
}

console.log('\n');
console.log('═══════════════════════════════════════════════');
console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}  / ${configFiles.length}`);
console.log('Legend: . = pass, U = unresolved refs, F = apex/parse fail, E = exec error, ? = log parse error, P = JSON parse');
console.log('═══════════════════════════════════════════════');
if (results.fail.length) {
    console.log('\nFailures:');
    for (const f of results.fail) {
        console.log(`  ✗ ${f.name} [${f.stage}]${f.unresolvedCount ? ' x' + f.unresolvedCount : ''}`);
        console.log(`      ${f.error}`);
    }
    process.exit(1);
}
console.log('\nAll JSON configs scan clean against resilient-badger.');
