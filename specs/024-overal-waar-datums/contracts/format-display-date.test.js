/**
 * Contract Tests: formatDisplayDate()
 *
 * Feature: DD/MM/YYYY date format standardization
 * Purpose: TDD contract tests voor centrale datum formatting functie
 * Status: SHOULD FAIL (no implementation yet - TDD red phase)
 *
 * Run: node specs/024-overal-waar-datums/contracts/format-display-date.test.js
 * Or integrate with existing test runner
 */

// Mock Taakbeheer class voor testing (with implementation from public/app.js)
class Taakbeheer {
    /**
     * Formats a date for display in DD/MM/YYYY format
     * @param {Date|string} dateInput - Date object or ISO string (YYYY-MM-DD)
     * @param {Object} options - Optional formatting options
     * @returns {string} Formatted date string "DD/MM/YYYY"
     * @throws {Error} If dateInput is invalid or results in NaN
     */
    formatDisplayDate(dateInput, options = {}) {
        // Check for null/undefined first
        if (dateInput === null || dateInput === undefined) {
            throw new Error(`Invalid date: ${dateInput}`);
        }

        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${dateInput}`);
        }

        const formatter = new Intl.DateTimeFormat('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        return formatter.format(date).replace(/-/g, '/');
    }
}

// Simple test framework (kan vervangen worden door Jest/Mocha)
class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(description, testFn) {
        this.tests.push({ description, testFn });
    }

    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
        }
    }

    assertThrows(fn, errorMatch, message = '') {
        try {
            fn();
            throw new Error(`Expected function to throw, but it didn't: ${message}`);
        } catch (error) {
            if (errorMatch && !error.message.includes(errorMatch)) {
                throw new Error(`Error message mismatch: ${message}\n  Expected to include: ${errorMatch}\n  Actual: ${error.message}`);
            }
        }
    }

    run() {
        console.log(`\n🧪 Running test suite: ${this.suiteName}\n`);

        this.tests.forEach(({ description, testFn }) => {
            try {
                testFn.call(this);
                this.passed++;
                console.log(`✓ ${description}`);
            } catch (error) {
                this.failed++;
                console.log(`✗ ${description}`);
                console.log(`  Error: ${error.message}\n`);
            }
        });

        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed\n`);

        if (this.failed > 0) {
            console.log('❌ TEST SUITE FAILED (expected in TDD red phase)\n');
            process.exit(1);
        } else {
            console.log('✅ TEST SUITE PASSED\n');
            process.exit(0);
        }
    }
}

// Contract Tests
const suite = new TestRunner('formatDisplayDate() Contract Tests');
const app = new Taakbeheer();

// Test 1: Valid ISO string input
suite.test('Should format valid ISO string (YYYY-MM-DD) to DD/MM/YYYY', function() {
    const result = app.formatDisplayDate('2025-10-22');
    this.assertEqual(result, '22/10/2025', 'ISO string conversion');
});

// Test 2: Valid Date object input
suite.test('Should format valid Date object to DD/MM/YYYY', function() {
    const date = new Date(2025, 9, 22); // Month is 0-indexed: 9 = October
    const result = app.formatDisplayDate(date);
    this.assertEqual(result, '22/10/2025', 'Date object conversion');
});

// Test 3: Leading zeros for day
suite.test('Should include leading zeros for single-digit day (01/01/2025)', function() {
    const result = app.formatDisplayDate('2025-01-01');
    this.assertEqual(result, '01/01/2025', 'Leading zero for day');
});

// Test 4: Leading zeros for month
suite.test('Should include leading zeros for single-digit month (22/01/2025)', function() {
    const result = app.formatDisplayDate('2025-01-22');
    this.assertEqual(result, '22/01/2025', 'Leading zero for month');
});

// Test 5: End of month edge case
suite.test('Should correctly format last day of month (31/12/2099)', function() {
    const result = app.formatDisplayDate('2099-12-31');
    this.assertEqual(result, '31/12/2099', 'Last day of month');
});

// Test 6: Leap year edge case
suite.test('Should correctly handle leap year date (29/02/2024)', function() {
    const result = app.formatDisplayDate('2024-02-29');
    this.assertEqual(result, '29/02/2024', 'Leap year date');
});

// Test 7: ISO DateTime string (with time component - should ignore time)
suite.test('Should format ISO DateTime string, ignoring time component', function() {
    const result = app.formatDisplayDate('2025-10-22T14:30:00');
    this.assertEqual(result, '22/10/2025', 'ISO DateTime conversion');
});

// Test 8: Timestamp input (milliseconds since epoch)
suite.test('Should format Date created from timestamp', function() {
    const timestamp = new Date('2025-10-22').getTime();
    const result = app.formatDisplayDate(new Date(timestamp));
    this.assertEqual(result, '22/10/2025', 'Timestamp conversion');
});

// Test 9: Invalid string input should throw Error
suite.test('Should throw Error for invalid date string', function() {
    this.assertThrows(
        () => app.formatDisplayDate('not a date'),
        'Invalid date',
        'Invalid string rejection'
    );
});

// Test 10: Null input should throw Error
suite.test('Should throw Error for null input', function() {
    this.assertThrows(
        () => app.formatDisplayDate(null),
        'Invalid date',
        'Null rejection'
    );
});

// Test 11: Undefined input should throw Error
suite.test('Should throw Error for undefined input', function() {
    this.assertThrows(
        () => app.formatDisplayDate(undefined),
        'Invalid date',
        'Undefined rejection'
    );
});

// Test 12: Invalid Date object (NaN) should throw Error
suite.test('Should throw Error for invalid Date object (NaN)', function() {
    this.assertThrows(
        () => app.formatDisplayDate(new Date('invalid')),
        'Invalid date',
        'NaN Date rejection'
    );
});

// Test 13: Empty string should throw Error
suite.test('Should throw Error for empty string', function() {
    this.assertThrows(
        () => app.formatDisplayDate(''),
        'Invalid date',
        'Empty string rejection'
    );
});

// Test 14: Use slashes (/) not hyphens (-)
suite.test('Should use forward slashes (/) as separator, not hyphens', function() {
    const result = app.formatDisplayDate('2025-10-22');
    this.assertEqual(result.includes('/'), true, 'Contains slash separator');
    this.assertEqual(result.match(/\//g).length, 2, 'Exactly 2 slashes');
});

// Test 15: Format must be exactly DD/MM/YYYY (10 characters)
suite.test('Should produce exactly 10 character output (DD/MM/YYYY)', function() {
    const result = app.formatDisplayDate('2025-10-22');
    this.assertEqual(result.length, 10, 'Output length is 10 characters');
});

// Test 16: Verify format pattern with regex
suite.test('Should match DD/MM/YYYY regex pattern', function() {
    const result = app.formatDisplayDate('2025-10-22');
    const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
    this.assertEqual(pattern.test(result), true, 'Matches DD/MM/YYYY pattern');
});

// Test 17: Different years (past, present, future)
suite.test('Should handle past dates (01/01/2020)', function() {
    const result = app.formatDisplayDate('2020-01-01');
    this.assertEqual(result, '01/01/2020', 'Past date');
});

suite.test('Should handle future dates (31/12/2099)', function() {
    const result = app.formatDisplayDate('2099-12-31');
    this.assertEqual(result, '31/12/2099', 'Future date');
});

// Test 18: Consistent output for same input (idempotency)
suite.test('Should return consistent output for repeated calls (idempotent)', function() {
    const input = '2025-10-22';
    const result1 = app.formatDisplayDate(input);
    const result2 = app.formatDisplayDate(input);
    this.assertEqual(result1, result2, 'Idempotent function');
});

// Run test suite
suite.run();

/**
 * EXPECTED OUTPUT (TDD Red Phase):
 *
 * 🧪 Running test suite: formatDisplayDate() Contract Tests
 *
 * ✗ Should format valid ISO string (YYYY-MM-DD) to DD/MM/YYYY
 *   Error: formatDisplayDate() not yet implemented - TDD red phase
 *
 * ✗ Should format valid Date object to DD/MM/YYYY
 *   Error: formatDisplayDate() not yet implemented - TDD red phase
 *
 * ... (all tests fail)
 *
 * 📊 Results: 0 passed, 18 failed
 *
 * ❌ TEST SUITE FAILED (expected in TDD red phase)
 *
 * ---
 *
 * AFTER IMPLEMENTATION (TDD Green Phase):
 * All tests should pass (18 passed, 0 failed)
 */
