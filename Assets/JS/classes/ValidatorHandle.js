class ValidatorHandle {
    constructor(controller) {
        this.controller = controller;

        this.acceptedFormats = [
            'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'YYYY-DD-MM',
            'DD-MM-YY', 'MM-DD-YY', 'YY-MM-DD', 'YY-DD-MM',
            'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'YYYY/DD/MM',
            'DD/MM/YY', 'MM/DD/YY', 'YY/MM/DD', 'YY/DD/MM',
        ];
    }

    // VALIDATOR FUNCTIONS
    validateDate(date, defaultDate = new Date()) {
        return !isNaN(date?.getTime()) ? date : defaultDate;
    }
    clampDate({ date, minYear, maxYear, minMonth, maxMonth, minDay, maxDay }) {
        const year = Math.max(minYear, Math.min(maxYear, date.getFullYear()));
        const month = Math.max(minMonth, Math.min(maxMonth, date.getMonth()));
        const day = Math.max(minDay, Math.min(maxDay, date.getDate()));

        return new Date(year, month, day);
    }
    validateString(string, ifNotValid = null) {
        return typeof string === 'string' || string instanceof String ? string : ifNotValid;
    }
    validateBoolean(boolean, ifNotValid = false) {
        return typeof boolean === 'boolean' ? boolean : ifNotValid;
    }
    validateInteger(integer, ifNotValid = null) {
        return Number.isInteger(integer) ? integer : ifNotValid;
    }
    validateFunction(funct) {
        return typeof funct === "function" ? funct : null;
    }
    validateDateFormat(givenFormat, defaultFormat = 'DD-MM-YYYY') {
        return this.acceptedFormats.includes(givenFormat) ? givenFormat : defaultFormat;
    }

    validateIfInputIsAcceptable(config) {
        const input = document.querySelector(config.inputToAttach);
        if (input) {
            if (input.classList.contains(this.controller.flagClassToAvoidDuplicates)) {
                console.error(`VFZ_Calendar: Element '${config.inputToAttach}' is already attached to ZembiS_Calendar.`);
                return false;
            }

            config.inputToAttach = input;
            input.classList.add(this.controller.flagClassToAvoidDuplicates);
            return true;
        }
        console.error(`VFZ_Calendar: No element '${config.inputToAttach}' was found, to be attached to ZembiS_Calendar.`);
        return false;
    }

    findMinMaxValues(array) {
        const min = Math.min.apply(Math, array);
        const max = Math.max.apply(Math, array);
        return [min, max]
    }

    validateYearRange(years) {
        if (!years) return null;
        let min = years[0];
        let max = years[1];
        if (!min || !max) return null;
        [min, max] = this.decideMinMaxValues(min, max);

        const today = new Date();
        const defaultMinYear = today.getFullYear() - this.controller.downLimit;
        const defaultMaxYear = today.getFullYear() + this.controller.upLimit;

        if (max > defaultMaxYear) max = defaultMaxYear;
        if (min < defaultMinYear) min = defaultMinYear;

        return [min, max];
    }

    validateMonthRange(months) {
        if (!months) return null;
        let min = months[0];
        let max = months[1];
        if ((!min && min !== 0) || (!max && max !== 0)) return null;
        [min, max] = this.decideMinMaxValues(min, max);

        if (max > 11 || min < 0) return null;

        return [min, max];
    }

    validateDayRange(days, currMonth, currYear) {
        if (!days) return null;
        let min = days[0];
        let max = days[1];
        if ((!min && min !== 0) || (!max && max !== 0)) return null;
        [min, max] = this.decideMinMaxValues(min, max);

        if (min < 1) min = 0;

        const maxDefault = this.controller.dateManager.getNumOfDaysInMonth(currMonth, currYear);

        if (max > maxDefault) max = maxDefault;

        return [min, max];
    }

    decideMinMaxValues(min, max) {
        // XOR METHOD
        if (min > max) {
            // SWAP VARIABLE VALUES - OLD SCHOOL STYLE
            min = min ^ max;
            max = min ^ max;
            min = min ^ max;
        }
        return [min, max];
    }

    validateDateConsideringProccessedLimits(date, processedLimits) {
        const { minYear, maxYear, years } = processedLimits;

        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        if (year < minYear || year > maxYear) {
            return false;
        }

        const yearLimits = years[year];
        if (!yearLimits) {
            return false;
        }

        const { minMonth, maxMonth, months } = yearLimits;
        if (month < minMonth || month > maxMonth) {
            return false;
        }

        const monthLimits = months.days[month];
        if (!monthLimits) {
            return false;
        }

        const { minDay, maxDay } = monthLimits;
        if (day < minDay || day > maxDay) {
            return false;
        }

        return true;
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || "Assertion failed");
        }
    }
}