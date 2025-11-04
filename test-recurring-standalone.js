#!/usr/bin/env node

// Standalone recurring date calculator test script
// Dit script test de constructor method fix voor v0.21.44

// Load the recurring date calculator
const fs = require('fs');
const path = require('path');

// Read and evaluate the recurring-date-calculator.js
const calculatorCode = fs.readFileSync(
    path.join(__dirname, 'public', 'recurring-date-calculator.js'),
    'utf8'
);

// Create a minimal DOM-like environment for the script
global.window = global;
global.document = {};

// Evaluate the calculator code
eval(calculatorCode);

// Test runner
class RecurringTestRunner {
    constructor() {
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0
        };
        this.failures = [];
    }

    test(description, pattern, baseDate, expected, edgeCase = null) {
        this.stats.total++;

        try {
            // Use RecurringDateCalculator from the global window object
            const result = global.RecurringDateCalculator.calculateNextRecurringDate(baseDate, pattern, false);
            const passed = result === expected;

            if (passed) {
                this.stats.passed++;
                console.log(`✅ ${description} - ${pattern} vanaf ${baseDate} = ${result}`);
            } else {
                this.stats.failed++;
                this.failures.push({
                    description,
                    pattern,
                    baseDate,
                    expected,
                    actual: result,
                    edgeCase
                });
                console.log(`❌ ${description} - ${pattern} vanaf ${baseDate}`);
                console.log(`   Verwacht: ${expected}, Werkelijk: ${result}`);
                if (edgeCase) console.log(`   Edge case: ${edgeCase}`);
            }
        } catch (error) {
            this.stats.failed++;
            this.failures.push({
                description,
                pattern,
                baseDate,
                expected,
                actual: `ERROR: ${error.message}`,
                edgeCase
            });
            console.log(`❌ ${description} - ${pattern} vanaf ${baseDate}`);
            console.log(`   ERROR: ${error.message}`);
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('TEST SAMENVATTING');
        console.log('='.repeat(80));
        console.log(`Totaal tests: ${this.stats.total}`);
        console.log(`✅ Geslaagd: ${this.stats.passed}`);
        console.log(`❌ Gefaald: ${this.stats.failed}`);
        console.log(`Slagingspercentage: ${((this.stats.passed / this.stats.total) * 100).toFixed(1)}%`);

        if (this.failures.length > 0) {
            console.log('\n' + '='.repeat(80));
            console.log('GEFAALDE TESTS:');
            console.log('='.repeat(80));
            this.failures.forEach((f, i) => {
                console.log(`\n${i + 1}. ${f.description}`);
                console.log(`   Patroon: ${f.pattern}`);
                console.log(`   Base datum: ${f.baseDate}`);
                console.log(`   Verwacht: ${f.expected}`);
                console.log(`   Werkelijk: ${f.actual}`);
                if (f.edgeCase) console.log(`   Edge case: ${f.edgeCase}`);
            });
        }

        console.log('\n' + '='.repeat(80));

        return this.stats.failed === 0;
    }
}

// Run all tests
const runner = new RecurringTestRunner();

console.log('TICKEDIFY HERHALINGEN TEST - v0.21.44 CONSTRUCTOR METHOD FIX');
console.log('='.repeat(80));
console.log('\n📅 DAGELIJKSE HERHALINGEN\n');

runner.test('Elke dag', 'dagelijks', '2025-06-01', '2025-06-02');
runner.test('Elke dag (einde jaar)', 'dagelijks', '2025-12-31', '2026-01-01', 'Jaarovergang');
runner.test('Elke 2 dagen', 'daily-2', '2025-06-15', '2025-06-17');
runner.test('Elke 3 dagen', 'daily-3', '2025-06-20', '2025-06-23');
runner.test('Elke 7 dagen', 'daily-7', '2025-06-01', '2025-06-08');
runner.test('Elke 10 dagen', 'daily-10', '2025-06-25', '2025-07-05', 'Maandovergang');
runner.test('Elke 30 dagen', 'daily-30', '2025-01-15', '2025-02-14');
runner.test('Elke 365 dagen', 'daily-365', '2024-02-29', '2025-02-28', 'Schrikkeljaar');
runner.test('Om de dag', 'om-de-dag', '2025-06-10', '2025-06-12');
runner.test('Werkdagen', 'werkdagen', '2025-06-13', '2025-06-16', 'Weekend skip');
runner.test('Werkdagen (vrijdag)', 'werkdagen', '2025-06-20', '2025-06-23', 'Weekend skip');

console.log('\n📆 WEKELIJKSE HERHALINGEN\n');

runner.test('Elke week', 'wekelijks', '2025-06-01', '2025-06-08');
runner.test('Elke week (jaarovergang)', 'wekelijks', '2025-12-28', '2026-01-04', 'Jaarovergang');
runner.test('Elke 2 weken', '2-weken', '2025-06-15', '2025-06-29');
runner.test('Elke 3 weken', '3-weken', '2025-06-01', '2025-06-22');
runner.test('Elke week op maandag', 'weekly-1-1', '2025-06-17', '2025-06-23');
runner.test('Elke week op donderdag', 'weekly-1-4', '2025-06-17', '2025-06-19');
runner.test('Elke 2 weken op vrijdag', 'weekly-2-5', '2025-06-01', '2025-06-13');
runner.test('Elke 4 weken op zondag', 'weekly-4-0', '2025-06-01', '2025-06-29');

console.log('\n📅 MAANDELIJKSE HERHALINGEN\n');

runner.test('Elke maand', 'maandelijks', '2025-06-15', '2025-07-15');
runner.test('Elke maand (31 jan)', 'maandelijks', '2025-01-31', '2025-02-28', 'Februari aanpassing');
runner.test('Elke 2 maanden', '2-maanden', '2025-06-01', '2025-08-01');
runner.test('Elke 3 maanden', '3-maanden', '2025-03-15', '2025-06-15');
runner.test('Elke 6 maanden', '6-maanden', '2025-01-01', '2025-07-01');
runner.test('Maandelijks op de 1ste', 'monthly-day-1-1', '2025-06-15', '2025-07-01');
runner.test('Maandelijks op de 15de', 'monthly-day-15-1', '2025-06-20', '2025-07-15');
runner.test('Maandelijks op de 31ste', 'monthly-day-31-1', '2025-01-15', '2025-01-31');
runner.test('Maandelijks dag 31 vanaf eind jan', 'monthly-day-31-1', '2025-01-31', '2025-03-31', 'KRITIEK: 31 jan → 28 feb skip → 31 maart');
runner.test('Maandelijks dag 31 vanaf feb', 'monthly-day-31-1', '2025-02-15', '2025-03-31', 'Februari heeft geen dag 31');
runner.test('Om de 2 maanden op dag 31', 'monthly-day-31-2', '2025-01-31', '2025-03-31', 'Februari skip');
runner.test('Om de 3 maanden op dag 31', 'monthly-day-31-3', '2025-01-31', '2025-04-30', 'KRITIEK: 31 maart → 30 april');

console.log('\n🗓️ JAARLIJKSE HERHALINGEN\n');

runner.test('Elk jaar', 'jaarlijks', '2025-06-15', '2026-06-15');
runner.test('Elk jaar (schrikkeljaar)', 'jaarlijks', '2024-02-29', '2025-02-28', 'KRITIEK: 29 feb → 28 feb');
runner.test('Elke 2 jaar', '2-jaar', '2025-06-01', '2027-06-01');
runner.test('Elke 3 jaar', '3-jaar', '2024-01-01', '2027-01-01');
runner.test('Jaarlijks op 6 augustus', 'yearly-6-8-1', '2025-01-15', '2025-08-06', 'KRITIEK: Moet 6 augustus zijn, niet 5');
runner.test('Jaarlijks op 25 december', 'yearly-25-12-1', '2025-06-15', '2025-12-25');
runner.test('Om de 2 jaar op 29 februari', 'yearly-29-2-2', '2024-02-29', '2026-02-28', 'Niet-schrikkeljaar aanpassing');

console.log('\n💼 WERKDAG PATRONEN\n');

runner.test('Eerste werkdag van de maand', 'monthly-weekday-first-workday-1', '2025-06-15', '2025-07-01', 'Juli start op dinsdag');
runner.test('Laatste werkdag van de maand', 'monthly-weekday-last-workday-1', '2025-06-15', '2025-06-30', 'Juni eindigt op maandag');
runner.test('Eerste werkdag van het jaar', 'yearly-special-first-workday-1', '2025-01-15', '2026-01-01', '1 jan 2026 is donderdag');
runner.test('Laatste werkdag van het jaar', 'yearly-special-last-workday-1', '2025-01-15', '2025-12-31', '31 dec 2025 is woensdag');

console.log('\n📍 SPECIALE WEEKDAG PATRONEN\n');

runner.test('Eerste maandag van de maand', 'monthly-weekday-first-1-1', '2025-06-15', '2025-07-07');
runner.test('Tweede dinsdag van de maand', 'monthly-weekday-second-2-1', '2025-06-15', '2025-07-08');
runner.test('Derde woensdag van de maand', 'monthly-weekday-third-3-1', '2025-06-15', '2025-07-16');
runner.test('Vierde donderdag van de maand', 'monthly-weekday-fourth-4-1', '2025-06-15', '2025-07-24');
runner.test('Laatste vrijdag van de maand', 'monthly-weekday-last-5-1', '2025-06-15', '2025-06-27');
runner.test('Laatste zondag van de maand', 'monthly-weekday-last-0-1', '2025-06-15', '2025-06-29');
runner.test('Eerste maandag om de 2 maanden', 'monthly-weekday-first-1-2', '2025-06-01', '2025-08-04');
runner.test('Laatste vrijdag om de 3 maanden', 'monthly-weekday-last-5-3', '2025-03-01', '2025-06-27');

console.log('\n🎯 EVENT-BASED HERHALINGEN\n');

runner.test('10 dagen voor event (event: 2025-08-15)', 'event-10-before-webinar', '2025-06-15', '2025-08-05', 'Event datum: 2025-08-15');
runner.test('5 dagen na event (event: 2025-07-01)', 'event-5-after-meeting', '2025-06-15', '2025-07-06', 'Event datum: 2025-07-01');
runner.test('Op event datum (event: 2025-09-20)', 'event-0-on-vakantie', '2025-06-15', '2025-09-20', 'Event datum: 2025-09-20');

console.log('\n🔥 EDGE CASES - KRITIEKE TESTS v0.21.44\n');

runner.test('EDGE: 31 jan + maandelijks → 28 feb', 'maandelijks', '2025-01-31', '2025-02-28', 'Constructor method moet 28 feb geven');
runner.test('EDGE: 31 maart + 3-maanden → 30 juni', 'monthly-day-31-3', '2025-03-31', '2025-06-30', 'Constructor method moet 30 juni geven');
runner.test('EDGE: 29 feb 2024 + jaarlijks → 28 feb 2025', 'jaarlijks', '2024-02-29', '2025-02-28', 'Constructor method schrikkeljaar fix');
runner.test('EDGE: monthly-day-31-1 vanaf 15 feb → 31 maart', 'monthly-day-31-1', '2025-02-15', '2025-03-31', 'Februari skip naar maart');
runner.test('EDGE: yearly-6-8-1 → 6 augustus (NIET 5!)', 'yearly-6-8-1', '2025-01-15', '2025-08-06', 'Off-by-one month fix');

// Print summary and exit
const success = runner.printSummary();
process.exit(success ? 0 : 1);
