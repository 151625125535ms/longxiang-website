'use strict';

const path = require('path');

const OPT_IN_FLAG = '--allow-archived-legacy-writer';

function assertArchivedLegacyWriterAllowed(filename, argv) {
    const args = Array.isArray(argv) ? argv : process.argv.slice(2);
    if (args.includes(OPT_IN_FLAG)) {
        if (!Array.isArray(argv)) {
            const processIndex = process.argv.indexOf(OPT_IN_FLAG);
            if (processIndex >= 0) process.argv.splice(processIndex, 1);
        }
        return;
    }
    const error = new Error(
        'Archived legacy writer is disabled by default: '
        + path.basename(filename || 'unknown')
        + '. Use the revision-aware writer, or explicitly add '
        + OPT_IN_FLAG
        + ' after reviewing the target database and rollback plan.'
    );
    error.code = 'ARCHIVED_LEGACY_WRITER_DISABLED';
    throw error;
}

module.exports = {
    OPT_IN_FLAG,
    assertArchivedLegacyWriterAllowed
};
