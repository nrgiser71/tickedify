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
     * @returns {string|null} - Next date in ISO format (YYYY-MM-DD) or null if invalid
     */
    calculateNextRecurringDate(baseDate, herhalingType) {
        let date = new Date(baseDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for date comparison

        console.log('🔄 calculateNextRecurringDate:', { baseDate, herhalingType, today: today.toISOString().split('T')[0] });

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
                date.setMonth(date.getMonth() + 1);
                break;

            case 'jaarlijks':
                date.setFullYear(date.getFullYear() + 1);
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
                date.setMonth(date.getMonth() + 2);
                break;

            case '3-maanden':
                date.setMonth(date.getMonth() + 3);
                break;

            case '6-maanden':
                date.setMonth(date.getMonth() + 6);
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
                            // FIX v0.21.36: Prevent date overflow - set day to 1 BEFORE changing year
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
                    return null;
                }
                return null;
        }

        // Ensure the calculated date is in the future
        let calculatedDate = date.toISOString().split('T')[0];
        let iterations = 0;
        const maxIterations = 100;

        while (new Date(calculatedDate) <= today && iterations < maxIterations) {
            console.log(`🔄 Date ${calculatedDate} is in past, calculating next occurrence...`);
            iterations++;

            const nextCalculation = this.calculateNextRecurringDate(calculatedDate, herhalingType);
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
        // FIX v0.21.36: Prevent date overflow - set day to 1 BEFORE changing month
        const nextDate = new Date(date);
        nextDate.setDate(1);
        nextDate.setMonth(date.getMonth() + interval);
        nextDate.setDate(dayNum);

        if (nextDate.getDate() !== dayNum) {
            nextDate.setDate(0);
        }

        return nextDate.toISOString().split('T')[0];
    },

    getNextYearlyDate(date, day, month, interval) {
        // FIX v0.21.36: Prevent date overflow - set day to 1 BEFORE changing year/month
        const nextDate = new Date(date);
        nextDate.setDate(1);
        nextDate.setFullYear(date.getFullYear() + interval);
        nextDate.setMonth(month - 1);
        nextDate.setDate(day);

        if (nextDate.getDate() !== day) {
            nextDate.setDate(0);
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
window.app = {
    calculateNextRecurringDate: (baseDate, herhalingType) => {
        return window.RecurringDateCalculator.calculateNextRecurringDate(baseDate, herhalingType);
    }
};

console.log('✅ Recurring Date Calculator loaded successfully');
