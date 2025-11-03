/**
 * Tickedify Recurring Date Calculator - Standalone Test Utility
 * v0.21.41
 *
 * Extracted from app.js to provide standalone date calculation functionality
 * for test pages without requiring full Taakbeheer class initialization.
 *
 * This file contains the EXACT same logic as app.js calculateNextRecurringDate
 * to ensure tests validate production code behavior.
 */

window.RecurringDateCalculator = {
    /**
     * Calculate the next recurring date based on a base date and recurrence pattern
     * @param {string} baseDate - ISO date string (YYYY-MM-DD)
     * @param {string} herhalingType - Recurrence pattern type
     * @param {boolean} ensureFuture - If true, ensures returned date is > today (default: true for production)
     * @param {string} eventDate - For event-based patterns, the date of the event (ISO format YYYY-MM-DD)
     * @returns {string|null} - Next date in ISO format (YYYY-MM-DD) or null if invalid
     */
    calculateNextRecurringDate(baseDate, herhalingType, ensureFuture = true, eventDate = null) {
        let date = new Date(baseDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for date comparison

        console.log('🔄 calculateNextRecurringDate:', { baseDate, herhalingType, ensureFuture, today: today.toISOString().split('T')[0] });

        switch (herhalingType) {
            case 'dagelijks':
                date.setDate(date.getDate() + 1);
                break;

            case 'werkdagen':
                // Find next weekday (Monday to Friday)
                do {
                    date.setDate(date.getDate() + 1);
                } while (date.getDay() === 0 || date.getDay() === 6); // Skip weekends
                break;

            case 'wekelijks':
                date.setDate(date.getDate() + 7);
                break;

            case 'maandelijks':
                // FIX v0.21.45: UTC-safe month-end handling using Date.UTC()
                {
                    const targetMonth = date.getUTCMonth() + 1;
                    const targetYear = date.getUTCFullYear() + (targetMonth > 11 ? 1 : 0);
                    const normalizedMonth = targetMonth > 11 ? 0 : targetMonth;
                    const targetDay = date.getUTCDate();

                    // Use Date.UTC() to create UTC date (prevents timezone offset bugs)
                    const newDate = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));

                    // Check if month overflowed (day doesn't exist in target month)
                    if (newDate.getUTCMonth() !== normalizedMonth) {
                        // Day doesn't exist - use last day of target month
                        newDate.setUTCMonth(normalizedMonth + 1);
                        newDate.setUTCDate(0);
                    }

                    date = newDate;
                }
                break;

            case 'jaarlijks':
                // FIX v0.21.45: UTC-safe leap year handling using Date.UTC()
                {
                    const targetYear = date.getUTCFullYear() + 1;
                    const targetMonth = date.getUTCMonth();
                    const targetDay = date.getUTCDate();

                    // Use Date.UTC() to prevent timezone offset bugs
                    const newDate = new Date(Date.UTC(targetYear, targetMonth, targetDay));

                    // Check if month overflowed (leap year edge case: 29 Feb → 1 Mar)
                    if (newDate.getUTCMonth() !== targetMonth) {
                        // Day doesn't exist - use last day of target month
                        newDate.setUTCMonth(targetMonth + 1);
                        newDate.setUTCDate(0);
                    }

                    date = newDate;
                }
                break;

            case 'om-de-dag':
                date.setDate(date.getDate() + 2);
                break;

            case '2-weken':
                date.setDate(date.getDate() + 14);
                break;

            case '3-weken':
                date.setDate(date.getDate() + 21);
                break;

            case '2-maanden':
                // FIX v0.21.45: UTC-safe month-end handling
                {
                    const targetMonth = date.getUTCMonth() + 2;
                    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
                    const normalizedMonth = targetMonth % 12;
                    const targetDay = date.getUTCDate();

                    const newDate = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
                    if (newDate.getUTCMonth() !== normalizedMonth) {
                        newDate.setUTCMonth(normalizedMonth + 1);
                        newDate.setUTCDate(0);
                    }
                    date = newDate;
                }
                break;

            case '3-maanden':
                // FIX v0.21.45: UTC-safe month-end handling (31 Mar + 3 months → 30 Jun, not 1 Jul)
                {
                    const targetMonth = date.getUTCMonth() + 3;
                    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
                    const normalizedMonth = targetMonth % 12;
                    const targetDay = date.getUTCDate();

                    const newDate = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
                    if (newDate.getUTCMonth() !== normalizedMonth) {
                        newDate.setUTCMonth(normalizedMonth + 1);
                        newDate.setUTCDate(0);
                    }
                    date = newDate;
                }
                break;

            case '6-maanden':
                // FIX v0.21.45: UTC-safe month-end handling
                {
                    const targetMonth = date.getUTCMonth() + 6;
                    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
                    const normalizedMonth = targetMonth % 12;
                    const targetDay = date.getUTCDate();

                    const newDate = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
                    if (newDate.getUTCMonth() !== normalizedMonth) {
                        newDate.setUTCMonth(normalizedMonth + 1);
                        newDate.setUTCDate(0);
                    }
                    date = newDate;
                }
                break;

            // Specific weekdays
            case 'maandag':
                return this.getNextWeekday(date, 1);
            case 'dinsdag':
                return this.getNextWeekday(date, 2);
            case 'woensdag':
                return this.getNextWeekday(date, 3);
            case 'donderdag':
                return this.getNextWeekday(date, 4);
            case 'vrijdag':
                return this.getNextWeekday(date, 5);
            case 'zaterdag':
                return this.getNextWeekday(date, 6);
            case 'zondag':
                return this.getNextWeekday(date, 0);

            // Monthly special cases
            case 'eerste-dag-maand':
                return this.getFirstDayOfNextMonth(date);
            case 'laatste-dag-maand':
                return this.getLastDayOfNextMonth(date);
            case 'eerste-werkdag-maand':
                return this.getFirstWorkdayOfNextMonth(date);
            case 'laatste-werkdag-maand':
                return this.getLastWorkdayOfNextMonth(date);

            // First weekday of month
            case 'eerste-maandag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 1);
            case 'eerste-dinsdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 2);
            case 'eerste-woensdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 3);
            case 'eerste-donderdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 4);
            case 'eerste-vrijdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 5);
            case 'eerste-zaterdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 6);
            case 'eerste-zondag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 0);

            // Last weekday of month
            case 'laatste-maandag-maand':
                return this.getLastWeekdayOfNextMonth(date, 1);
            case 'laatste-dinsdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 2);
            case 'laatste-woensdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 3);
            case 'laatste-donderdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 4);
            case 'laatste-vrijdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 5);
            case 'laatste-zaterdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 6);
            case 'laatste-zondag-maand':
                return this.getLastWeekdayOfNextMonth(date, 0);

            // Yearly special cases
            case 'eerste-dag-jaar':
                return this.getFirstDayOfNextYear(date);
            case 'laatste-dag-jaar':
                return this.getLastDayOfNextYear(date);
            case 'eerste-werkdag-jaar':
                return this.getFirstWorkdayOfNextYear(date);
            case 'laatste-werkdag-jaar':
                return this.getLastWorkdayOfNextYear(date);

            default:
                // Handle complex recurring patterns
                if (herhalingType.startsWith('weekly-')) {
                    const parts = herhalingType.split('-');
                    if (parts.length === 3) {
                        const interval = parseInt(parts[1]);
                        const targetDay = parseInt(parts[2]);

                        if (!isNaN(interval) && !isNaN(targetDay) && targetDay >= 0 && targetDay <= 7) {
                            const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                            return this.getNextWeekdayWithInterval(date, jsTargetDay, interval);
                        }
                    }
                }

                if (herhalingType.startsWith('daily-')) {
                    const parts = herhalingType.split('-');
                    if (parts.length === 2) {
                        const interval = parseInt(parts[1]);
                        if (!isNaN(interval) && interval > 0) {
                            const nextDate = new Date(date);
                            nextDate.setDate(date.getDate() + interval);
                            return nextDate.toISOString().split('T')[0];
                        }
                    }
                }

                if (herhalingType.startsWith('monthly-day-')) {
                    const parts = herhalingType.split('-');
                    if (parts.length === 4) {
                        const dayNum = parseInt(parts[2]);
                        const interval = parseInt(parts[3]);
                        if (!isNaN(dayNum) && !isNaN(interval) && dayNum >= 1 && dayNum <= 31) {
                            return this.getNextMonthlyDay(date, dayNum, interval);
                        }
                    }
                }

                if (herhalingType.startsWith('yearly-')) {
                    const parts = herhalingType.split('-');
                    if (parts.length === 4) {
                        const day = parseInt(parts[1]);
                        const month = parseInt(parts[2]);
                        const interval = parseInt(parts[3]);
                        if (!isNaN(day) && !isNaN(month) && !isNaN(interval) &&
                            day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                            return this.getNextYearlyDate(date, day, month, interval);
                        }
                    }
                }

                if (herhalingType.startsWith('monthly-weekday-')) {
                    const parts = herhalingType.split('-');
                    if (parts.length === 5) {
                        const position = parts[2];
                        const targetDay = parseInt(parts[3]);
                        const interval = parseInt(parts[4]);

                        const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
                        const isValidTargetDay = parts[3] === 'workday' || (!isNaN(targetDay) && targetDay >= 1 && targetDay <= 7);
                        if (validPositions.includes(position) &&
                            isValidTargetDay &&
                            !isNaN(interval) && interval > 0) {

                            // FIX v0.21.36: Prevent date overflow - set day to 1 BEFORE changing month
                            const nextDateObj = new Date(date);
                            nextDateObj.setDate(1); // Reset to day 1 to prevent overflow
                            nextDateObj.setMonth(date.getMonth() + interval);

                            // Special handling for workday patterns
                            if (parts[3] === 'workday') {
                                if (position === 'first') {
                                    while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                        nextDateObj.setDate(nextDateObj.getDate() + 1);
                                    }
                                } else if (position === 'last') {
                                    nextDateObj.setMonth(nextDateObj.getMonth() + 1);
                                    nextDateObj.setDate(0);
                                    while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                        nextDateObj.setDate(nextDateObj.getDate() - 1);
                                    }
                                }
                            } else {
                                const jsTargetDay = targetDay === 7 ? 0 : targetDay;

                                if (position === 'last') {
                                    nextDateObj.setMonth(nextDateObj.getMonth() + 1);
                                    nextDateObj.setDate(0);
                                    while (nextDateObj.getDay() !== jsTargetDay) {
                                        nextDateObj.setDate(nextDateObj.getDate() - 1);
                                    }
                                } else {
                                    const positionNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
                                    const occurrenceNumber = positionNumbers[position];

                                    nextDateObj.setDate(1);
                                    let occurrenceCount = 0;

                                    while (occurrenceCount < occurrenceNumber) {
                                        if (nextDateObj.getDay() === jsTargetDay) {
                                            occurrenceCount++;
                                            if (occurrenceCount === occurrenceNumber) {
                                                break;
                                            }
                                        }
                                        nextDateObj.setDate(nextDateObj.getDate() + 1);

                                        if (nextDateObj.getMonth() !== (date.getMonth() + interval) % 12) {
                                            return null;
                                        }
                                    }
                                }
                            }

                            return nextDateObj.toISOString().split('T')[0];
                        }
                    }
                }

                if (herhalingType.startsWith('yearly-special-')) {
                    const parts = herhalingType.split('-');
                    if (parts.length >= 4) {
                        const specialType = parts.slice(2, -1).join('-');
                        const interval = parseInt(parts[parts.length - 1]);

                        if (!isNaN(interval) && interval > 0) {
                            // FIX v0.21.42: Check CURRENT year first before jumping to next interval
                            const baseDate = new Date(date);

                            // Try current year first
                            const currentYearObj = new Date(date);

                            if (specialType === 'first-workday') {
                                currentYearObj.setMonth(0);
                                currentYearObj.setDate(1);
                                while (currentYearObj.getDay() === 0 || currentYearObj.getDay() === 6) {
                                    currentYearObj.setDate(currentYearObj.getDate() + 1);
                                }
                            } else if (specialType === 'last-workday') {
                                currentYearObj.setMonth(11);
                                currentYearObj.setDate(31);
                                while (currentYearObj.getDay() === 0 || currentYearObj.getDay() === 6) {
                                    currentYearObj.setDate(currentYearObj.getDate() - 1);
                                }
                            }

                            // If current year occurrence is still in the future, use it!
                            if (currentYearObj > baseDate) {
                                return currentYearObj.toISOString().split('T')[0];
                            }

                            // Otherwise, add interval year(s)
                            const nextDateObj = new Date(date);
                            nextDateObj.setDate(1);
                            nextDateObj.setFullYear(date.getFullYear() + interval);

                            if (specialType === 'first-workday') {
                                nextDateObj.setMonth(0);
                                nextDateObj.setDate(1);
                                while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                    nextDateObj.setDate(nextDateObj.getDate() + 1);
                                }
                            } else if (specialType === 'last-workday') {
                                nextDateObj.setMonth(11);
                                nextDateObj.setDate(31);
                                while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                    nextDateObj.setDate(nextDateObj.getDate() - 1);
                                }
                            }

                            return nextDateObj.toISOString().split('T')[0];
                        }
                    }
                }

                if (herhalingType.startsWith('event-')) {
                    // FIX v0.21.42: Implement event-based recurring date calculation
                    // Pattern format: event-{days}-{before|after}-{name}
                    // Example: event-10-before-webinar with eventDate=2025-07-01 → 2025-06-21

                    if (!eventDate) {
                        console.warn('⚠️ Event-based pattern requires eventDate parameter');
                        return null;
                    }

                    const parts = herhalingType.split('-');
                    if (parts.length >= 3) {
                        const days = parseInt(parts[1]);
                        const direction = parts[2]; // 'before' or 'after'

                        if (!isNaN(days) && (direction === 'before' || direction === 'after')) {
                            const event = new Date(eventDate);

                            if (direction === 'before') {
                                event.setDate(event.getDate() - days);
                            } else { // after
                                event.setDate(event.getDate() + days);
                            }

                            return event.toISOString().split('T')[0];
                        }
                    }

                    console.error('❌ Invalid event-based pattern format:', herhalingType);
                    return null;
                }
                return null;
        }

        // Ensure the calculated date is in the future (only if ensureFuture === true)
        let calculatedDate = date.toISOString().split('T')[0];

        if (!ensureFuture) {
            // For tests: just return the next occurrence without ensuring it's > today
            console.log(`✅ Test mode: returning ${calculatedDate} (ensureFuture=false)`);
            return calculatedDate;
        }

        // Production mode: ensure date is in the future
        let iterations = 0;
        const maxIterations = 100;

        while (new Date(calculatedDate) <= today && iterations < maxIterations) {
            console.log(`🔄 Date ${calculatedDate} is in past, calculating next occurrence...`);
            iterations++;

            const nextCalculation = this.calculateNextRecurringDate(calculatedDate, herhalingType, false, eventDate); // Don't recurse with ensureFuture
            if (!nextCalculation || nextCalculation === calculatedDate) {
                console.log('⚠️ Could not calculate future date, breaking loop');
                break;
            }
            calculatedDate = nextCalculation;
        }

        if (iterations >= maxIterations) {
            console.error('❌ Max iterations reached in recurring date calculation');
            return null;
        }

        console.log(`✅ Final calculated date: ${calculatedDate} (after ${iterations} iterations)`);
        return calculatedDate;
    },

    getNextWeekday(date, targetDay) {
        const currentDay = date.getDay();
        let daysToAdd = targetDay - currentDay;

        if (daysToAdd <= 0) {
            daysToAdd += 7;
        }

        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + daysToAdd);
        return nextDate.toISOString().split('T')[0];
    },

    getNextWeekdayWithInterval(date, targetDay, interval) {
        const nextDate = this.getNextWeekday(date, targetDay);
        const finalDate = new Date(nextDate);

        if (interval > 1) {
            finalDate.setDate(finalDate.getDate() + (interval - 1) * 7);
        }

        return finalDate.toISOString().split('T')[0];
    },

    getNextMonthlyDay(date, dayNum, interval) {
        // FIX v0.21.42: Check CURRENT month first before jumping to next interval
        // FIX v0.21.43: If target day doesn't exist in current month, skip to next interval
        // Example: monthly-day-31-1 from 2025-02-15 should give 2025-03-31 (not 2025-02-28!)

        const baseDate = new Date(date);

        // Try current month first
        const currentMonthDate = new Date(date);
        currentMonthDate.setDate(dayNum);

        // FIX v0.21.43: Only use current month if the EXACT day exists
        // If day overflowed (e.g., day 31 in Feb → Mar 3), skip current month entirely
        if (currentMonthDate.getDate() === dayNum) {
            // Day exists in current month - check if it's in the future
            if (currentMonthDate > baseDate) {
                return currentMonthDate.toISOString().split('T')[0];
            }
        }
        // If day doesn't exist or is in the past, fall through to add interval

        // Add interval month(s)
        const nextDate = new Date(date);
        nextDate.setDate(1); // Prevent date overflow
        nextDate.setMonth(date.getMonth() + interval);
        nextDate.setDate(dayNum);

        if (nextDate.getDate() !== dayNum) {
            nextDate.setDate(0);
        }

        return nextDate.toISOString().split('T')[0];
    },

    getNextYearlyDate(date, day, month, interval) {
        // FIX v0.21.45: UTC-safe implementation to prevent timezone offset bugs
        // Example: yearly-25-12-1 from 2025-06-01 should give 2025-12-25 (not 2026-12-25!)

        const baseDate = new Date(date);

        // Try current year first - use Date.UTC() to prevent timezone issues
        const currentYear = baseDate.getUTCFullYear();
        const currentYearDate = new Date(Date.UTC(currentYear, month - 1, day));

        // Handle edge case: day doesn't exist in month (e.g., Feb 31)
        if (currentYearDate.getUTCMonth() !== month - 1) {
            // Overflow detected - set to last day of target month
            currentYearDate.setUTCMonth(month - 1 + 1);
            currentYearDate.setUTCDate(0);
        }

        // If current year occurrence is still in the future (> base date), use it!
        if (currentYearDate > baseDate) {
            return currentYearDate.toISOString().split('T')[0];
        }

        // Otherwise, add interval year(s)
        const nextYear = baseDate.getUTCFullYear() + interval;
        const nextDate = new Date(Date.UTC(nextYear, month - 1, day));

        // Handle edge case again for next year
        if (nextDate.getUTCMonth() !== month - 1) {
            nextDate.setUTCMonth(month - 1 + 1);
            nextDate.setUTCDate(0);
        }

        return nextDate.toISOString().split('T')[0];
    },

    getFirstDayOfNextMonth(date) {
        // FIX v0.21.36: Prevent date overflow - set day to 1 BEFORE changing month
        const nextMonth = new Date(date);
        nextMonth.setDate(1);
        nextMonth.setMonth(date.getMonth() + 1);
        return nextMonth.toISOString().split('T')[0];
    },

    getLastDayOfNextMonth(date) {
        // FIX v0.21.36: Prevent date overflow - set day to 1 BEFORE changing month
        const nextMonth = new Date(date);
        nextMonth.setDate(1);
        nextMonth.setMonth(date.getMonth() + 2);
        nextMonth.setDate(0);
        return nextMonth.toISOString().split('T')[0];
    },

    getFirstWorkdayOfNextMonth(date) {
        const firstDay = this.getFirstDayOfNextMonth(date);
        const firstDate = new Date(firstDay);

        while (firstDate.getDay() === 0 || firstDate.getDay() === 6) {
            firstDate.setDate(firstDate.getDate() + 1);
        }

        return firstDate.toISOString().split('T')[0];
    },

    getLastWorkdayOfNextMonth(date) {
        const lastDay = this.getLastDayOfNextMonth(date);
        const lastDate = new Date(lastDay);

        while (lastDate.getDay() === 0 || lastDate.getDay() === 6) {
            lastDate.setDate(lastDate.getDate() - 1);
        }

        return lastDate.toISOString().split('T')[0];
    },

    getFirstWeekdayOfNextMonth(date, targetWeekday) {
        const nextMonth = new Date(date);
        nextMonth.setMonth(date.getMonth() + 1);
        nextMonth.setDate(1);

        while (nextMonth.getDay() !== targetWeekday) {
            nextMonth.setDate(nextMonth.getDate() + 1);
        }

        return nextMonth.toISOString().split('T')[0];
    },

    getLastWeekdayOfNextMonth(date, targetWeekday) {
        // FIX v0.21.36: Prevent date overflow - set day to 1 BEFORE changing month
        const nextMonth = new Date(date);
        nextMonth.setDate(1);
        nextMonth.setMonth(date.getMonth() + 2);
        nextMonth.setDate(0);

        while (nextMonth.getDay() !== targetWeekday) {
            nextMonth.setDate(nextMonth.getDate() - 1);
        }

        return nextMonth.toISOString().split('T')[0];
    },

    getFirstDayOfNextYear(date) {
        const nextYear = new Date(date);
        nextYear.setFullYear(date.getFullYear() + 1);
        nextYear.setMonth(0);
        nextYear.setDate(1);
        return nextYear.toISOString().split('T')[0];
    },

    getLastDayOfNextYear(date) {
        // FIX v0.21.42: Check CURRENT year first before jumping to next year
        // Example: laatste-dag-jaar from 2025-06-15 should give 2025-12-31 (not 2026-12-31!)

        const baseDate = new Date(date);

        // Try current year first
        const currentYear = new Date(date);
        currentYear.setMonth(11); // December
        currentYear.setDate(31);

        // If current year's last day is still in the future, use it!
        if (currentYear > baseDate) {
            return currentYear.toISOString().split('T')[0];
        }

        // Otherwise, use next year
        const nextYear = new Date(date);
        nextYear.setFullYear(date.getFullYear() + 1);
        nextYear.setMonth(11);
        nextYear.setDate(31);
        return nextYear.toISOString().split('T')[0];
    },

    getFirstWorkdayOfNextYear(date) {
        const firstDay = this.getFirstDayOfNextYear(date);
        const firstDate = new Date(firstDay);

        while (firstDate.getDay() === 0 || firstDate.getDay() === 6) {
            firstDate.setDate(firstDate.getDate() + 1);
        }

        return firstDate.toISOString().split('T')[0];
    },

    getLastWorkdayOfNextYear(date) {
        const lastDay = this.getLastDayOfNextYear(date);
        const lastDate = new Date(lastDay);

        while (lastDate.getDay() === 0 || lastDate.getDay() === 6) {
            lastDate.setDate(lastDate.getDate() - 1);
        }

        return lastDate.toISOString().split('T')[0];
    }
};

// Make it available as window.app for backward compatibility with test-herhalingen.js
// For tests, we use ensureFuture=false to get the immediate next occurrence
window.app = {
    calculateNextRecurringDate: (baseDate, herhalingType, ensureFuture = false, eventDate = null) => {
        return window.RecurringDateCalculator.calculateNextRecurringDate(baseDate, herhalingType, ensureFuture, eventDate);
    }
};

console.log('✅ Recurring Date Calculator loaded successfully');
