const os = require('os');
const path = require('path');
const {
    DEFAULT_PRODUCT_FIELD_PATCH_POLICY_ID,
    getProductFieldPatchPolicy
} = require('./lib/product-field-patch-policies');
const { runProductFieldPatch } = require('./lib/product-field-safe-patch-engine');

const root = path.resolve(__dirname, '..');
const homeDir = process.env.USERPROFILE || os.homedir();
const stageDir = path.join(homeDir || root, 'Desktop', 'new', 'stage');
const defaultDbPath = process.env.DB_PATH
    ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(root, process.env.DB_PATH))
    : path.join(root, 'data', 'longxiang.db');
const defaultReportPath = path.join(stageDir, 'products-field-safe-patch-report.md');

function parseArgs(argv) {
    const args = {
        dryRun: false,
        apply: false,
        input: '',
        db: defaultDbPath,
        report: defaultReportPath,
        backup: '',
        policy: DEFAULT_PRODUCT_FIELD_PATCH_POLICY_ID,
        policyExplicit: false
    };
    const valueOptions = new Set(['input', 'db', 'report', 'backup', 'policy']);
    for (let index = 2; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--dry-run') {
            args.dryRun = true;
        } else if (arg === '--apply') {
            args.apply = true;
        } else if (arg.startsWith('--')) {
            const eqIndex = arg.indexOf('=');
            const name = arg.slice(2, eqIndex === -1 ? undefined : eqIndex);
            if (!valueOptions.has(name)) throw new Error('Unknown option: ' + arg);
            let value = '';
            if (eqIndex !== -1) {
                value = arg.slice(eqIndex + 1);
            } else {
                value = argv[index + 1];
                if (!value || value.startsWith('--')) throw new Error('Missing value for --' + name);
                index += 1;
            }
            args[name] = value;
            if (name === 'policy') args.policyExplicit = true;
        } else {
            throw new Error('Unexpected argument: ' + arg);
        }
    }
    if (!args.dryRun && !args.apply) throw new Error('Use either --dry-run or --apply.');
    if (args.dryRun && args.apply) throw new Error('--dry-run and --apply cannot be used together.');
    if (!args.input) throw new Error('--input <path> is required.');
    args.input = path.resolve(args.input);
    args.db = path.resolve(args.db);
    args.report = path.resolve(args.report);
    args.backup = args.backup ? path.resolve(args.backup) : '';
    return args;
}

async function main(argv) {
    const args = parseArgs(argv || process.argv);
    const policy = getProductFieldPatchPolicy(args.policy);
    const report = await runProductFieldPatch({
        mode: args.apply ? 'apply' : 'dry-run',
        inputPath: args.input,
        dbPath: args.db,
        reportPath: args.report,
        backupPath: args.backup,
        policy,
        policyExplicit: args.policyExplicit
    });
    if (report.errors.length || report.blockers.length) {
        console.error('products field safe patch ' + report.mode + ' failed. Report: ' + report.reportPath);
        report.errors.slice(0, 5).forEach((error) => console.error('Error: ' + error));
        report.blockers.slice(0, 5).forEach((blocker) => console.error('Apply blocker: ' + blocker));
        process.exitCode = 1;
        return report;
    }
    console.log('products field safe patch ' + report.mode + ' passed.');
    return report;
}

if (require.main === module) {
    main(process.argv).catch((err) => {
        console.error(err && err.stack ? err.stack : err);
        process.exitCode = 1;
    });
}

module.exports = {
    main,
    parseArgs
};
