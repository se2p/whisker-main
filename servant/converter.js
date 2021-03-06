const fs = require('fs');
const path = require('path');

const Parser = require('tap-parser');
const csvStringify = require('csv-stringify/lib/sync');
const yaml = require('js-yaml');

const testNames = new Map();
const useNames = true; // use the names of tests instead of their id in the CSV header

const convertToCsv = function (str) {
    return new Promise((resolve, reject) => {
        const parser = new Parser();
        const result = {
            passed: 0,
            failed: 0,
            error: 0,
            testResults: new Map()
        };

        parser.on('assert', test => {
            const status = test.ok ? 'pass' : test.diag.severity;

            if (!testNames.has(test.id)) {
                testNames.set(test.id, test.name);
            } else if (testNames.get(test.id) !== test.name) {
                console.error('Error: Inconsistent test names or test order between projects.');
                process.exit(1);
            }

            result.testResults.set(test.id, status);
            switch (status) {
            case 'pass':
                result.passed++;
                break;
            case 'fail':
                result.failed++;
                break;
            case 'error':
                result.error++;
                break;
            case 'error':
                // nothing
                break;
            }
        });

        parser.on('complete', () => {
            resolve(result);
        });

        parser.on('bailout', reason => {
            reject(reason);
        });

        parser.end(str);
        parser.push(null);
    });
}

const getCoverage = function (str) {
    let coverageString = str.split('# coverage:\n')[1];
    if (typeof coverageString === 'undefined') {
        return null;
    }

    coverageString = coverageString.replace(/^# /gm, '');
    const coverage = yaml.safeLoad(coverageString);
    return coverage.combined.match(/(.*)\s\((\d+)\/(\d+)\)/)[1];
}

const getName = function (str) {
    return str.match(/# project: (.*)\./)[1];
}

const tapToCsvRow = async function (str) {
    const row = await convertToCsv(str);

    const name = getName(str);
    const coverage = getCoverage(str);

    row.projectname = name;
    row.coverage = coverage;

    return row;
}

const rowsToCsv = function (rows) {
    let numTests = testNames.size;

    const csvHeader = [];
    csvHeader.push('projectname');

    const sortedTests = Array.from(testNames.entries())
        .sort(x => x[0]);
    // array of map entries with [testId, testName], sorted by id

    for (const test of sortedTests) {
        if (useNames) {
            csvHeader.push(test[1]);
        } else {
            csvHeader.push(`test${test[0]}`);
        }
    }
    csvHeader.push('passed');
    csvHeader.push('failed');
    csvHeader.push('error');
    csvHeader.push('coverage');

    const csvBody = [csvHeader];
    for (row of rows) {
        const csvLine = [];

        csvLine.push(row.projectname);
        for (const test of sortedTests) {
            if (row.testResults.has(test[0])) {
                csvLine.push(row.testResults.get(test[0]));
            } else {
                csvLine.push(null);
                console.error('Warning: Inconsistent test ids between projects.');
            }
        }

        csvLine.push(row.passed);
        csvLine.push(row.failed);
        csvLine.push(row.error);
        csvLine.push(row.coverage);

        csvBody.push(csvLine);
    }

    return csvStringify(csvBody);
}

module.exports = {convertToCsv, tapToCsvRow, rowsToCsv};
