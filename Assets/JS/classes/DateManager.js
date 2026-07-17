class DateManager {
    constructor(controller) {
        this.controller = controller;

        this.monthsForUse = [
            'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
        ];
    }

    getCurrentDay(d, m, y) {
        return new Date(y, m, d).getDay();
    }

    getFirstDayOfMonth(m, y) {
        return new Date(y, m, 1).getDay();
    }

    getNumOfDaysInMonth(m, y) {
        return new Date(y, m + 1, 0).getDate();
    }

    formatDate(config, day, month, year) {
        const dd = String(day).padStart(2, '0');
        const mm = String(month).padStart(2, '0');
        const yyyy = String(year);
        const yy = yyyy.slice(-2);

        return config.dateFormat
            .replace('DD', dd)
            .replace('MM', mm)
            .replace('YYYY', yyyy)
            .replace('YY', yy);
    }

    compareTwoDates(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    // RANGE-SELECTION HELPERS

    dateToComparableNumber(date) {
        return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    }

    sortDates(dateA, dateB) {
        return this.dateToComparableNumber(dateA) <= this.dateToComparableNumber(dateB) ? [dateA, dateB] : [dateB, dateA];
    }

    isDateBetween(date, boundA, boundB) {
        const [lo, hi] = this.sortDates(boundA, boundB);
        const value = this.dateToComparableNumber(date);
        return value >= this.dateToComparableNumber(lo) && value <= this.dateToComparableNumber(hi);
    }

    // SIGNED WHOLE-CALENDAR-DAY DIFFERENCE (dateB - dateA)
    daysBetween(dateA, dateB) {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.round((dateB.getTime() - dateA.getTime()) / msPerDay);
    }

    // FLOORS rawLength DOWN TO THE NEAREST VALID INCREMENT (minDays, minDays+step, minDays+2*step, ...)
    snapToValidRangeLength(rawLength, minDays, stepDays) {
        if (!minDays) return rawLength;
        if (rawLength <= minDays) return minDays;
        const step = stepDays || minDays;
        return minDays + step * Math.floor((rawLength - minDays) / step);
    }

    // WALKS DAY-BY-DAY FROM startDate TOWARD targetDate (SNAPPED TO A VALID LENGTH IF day.rangeMinDays IS SET),
    // STOPPING AT THE LAST DAY BEFORE THE FIRST DISABLED ONE. RE-SNAPS DOWN IF DISABLED-DAY TRUNCATION CUTS SHORT.
    getEffectiveRangeEnd(config, startDate, targetDate) {
        const minDays = config.day.rangeMinDays;
        const stepDays = config.day.rangeStepDays;

        const direction = this.dateToComparableNumber(targetDate) >= this.dateToComparableNumber(startDate) ? 1 : -1;

        let desiredEnd = targetDate;
        if (minDays) {
            const rawLength = Math.abs(this.daysBetween(startDate, targetDate)) + 1;
            const snappedLength = this.snapToValidRangeLength(rawLength, minDays, stepDays);
            desiredEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + direction * (snappedLength - 1));
        }

        let lastValidDate = startDate;
        let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + direction);

        while (direction > 0 ? this.dateToComparableNumber(cursor) <= this.dateToComparableNumber(desiredEnd) : this.dateToComparableNumber(cursor) >= this.dateToComparableNumber(desiredEnd)) {
            if (!this.controller.validatorHandle.validateDateConsideringProccessedLimits(cursor, config.processedLimits)) break;

            lastValidDate = cursor;
            cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + direction);
        }

        if (minDays) {
            const truncatedLength = Math.abs(this.daysBetween(startDate, lastValidDate)) + 1;
            if (truncatedLength < minDays) return startDate;

            const refittedLength = Math.min(this.snapToValidRangeLength(truncatedLength, minDays, stepDays), truncatedLength);
            return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + direction * (refittedLength - 1));
        }

        return lastValidDate;
    }

    // SINGLE SOURCE OF TRUTH FOR "WHAT RANGE STATE DOES THIS DAY HAVE" - USED BY BOTH RENDER AND LIVE HOVER
    getRangeDescriptorForDate(config, date, previewEnd = null) {
        const handler = config.day.handler;
        const start = handler.rangeStart;
        if (!config.day.rangeSelect || !start) {
            return { inRange: false, isStart: false, isEnd: false };
        }

        let end = null;
        if (handler.rangeState === 'complete') {
            end = handler.rangeEnd;
        }
        else if (handler.rangeState === 'selecting' && previewEnd) {
            end = previewEnd;
        }

        if (!end) {
            const isStartOnly = this.compareTwoDates(date, start);
            return { inRange: isStartOnly, isStart: isStartOnly, isEnd: false };
        }

        const [lo, hi] = this.sortDates(start, end);
        const inRange = this.isDateBetween(date, lo, hi);
        return {
            inRange,
            isStart: inRange && this.compareTwoDates(date, lo),
            isEnd: inRange && this.compareTwoDates(date, hi),
        };
    }

    formatFullDateAttrString(date) {
        const yyyy = String(date.getFullYear());
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    parseFullDateAttrString(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    writeValueToAttachedElement(config, valueString) {
        const element = config.inputToAttach;
        const typeOfInput = element.tagName.toLowerCase();

        if (typeOfInput === 'input' || typeOfInput === 'textarea') {
            element.value = valueString;
        }
        else if (typeOfInput === 'select') {
            this.controller.eventHandler.setSelectValueQuietly(element, valueString);
        }
        else {
            element.innerText = valueString;
        }
    }

    clickDayCoreFunctionality(clickedEl, config) {
        const element = config.inputToAttach;
        const dateValue = clickedEl.getAttribute('data-date');

        if (config.day.displayDateAfterClick) {
            this.writeValueToAttachedElement(config, dateValue);
        }
        element.setAttribute('data-active-date', dateValue);

        this.configureActiveDay(clickedEl, config);
    }

    // RETURNS [startDateStr, endDateStr, rangeInfo] - rangeInfo CARRIES RAW Date OBJECTS + INCLUSIVE DAY COUNT
    // FOR CONSUMERS THAT NEED TO COMPUTE PRICING/NIGHTS (E.G. BOOKING SYSTEMS) WITHOUT RE-PARSING FORMATTED STRINGS
    rangeClickCoreFunctionality(config, startDate, endDate) {
        const startStr = this.formatDate(config, startDate.getDate(), startDate.getMonth(), startDate.getFullYear());
        const endStr = this.formatDate(config, endDate.getDate(), endDate.getMonth(), endDate.getFullYear());
        const days = Math.abs(this.daysBetween(startDate, endDate)) + 1;

        if (config.day.displayDateAfterClick) {
            this.writeValueToAttachedElement(config, `${startStr} - ${endStr}`);
        }

        const rangeInfo = { startDate, endDate, days };
        return [startStr, endStr, rangeInfo];
    }

    configureActiveDay(clickedEl, config) {
        const ccn = this.controller.ccn;
        config.day.handler.previousDay = config.day.handler.currentDay;
        const previousClickedEl = document.querySelector(`#${config.id} [data-day="${config.day.handler.previousDay}"].${ccn}_day.${ccn}_clickable`);
        if (previousClickedEl) {
            previousClickedEl.classList.remove(`${ccn}_active_day`);
            previousClickedEl.setAttribute('aria-checked', 'false');
        }

        config.day.handler.currentDay = clickedEl.getAttribute('data-day');
        clickedEl.classList.add(`${ccn}_active_day`);
        clickedEl.setAttribute('aria-checked', 'true');

        const currentActiveDate = new Date(config.openCalendar.getFullYear(), config.openCalendar.getMonth(), config.day.handler.currentDay);
        config.day.handler.activeDate = currentActiveDate;
    }

    combineAvailableYears(globalYears, specificYears, merge) {
        if (!merge) return specificYears;

        let combined = globalYears.concat(specificYears);

        let minYear = Math.min(...combined);
        let maxYear = Math.max(...combined);

        return [minYear, maxYear];
    }

    findTargetMonth(currentDate, direction) {
        let currentMonth = currentDate.getMonth();  // GET THE CURRENT MONTH
        let currentYear = currentDate.getFullYear();  // GET THE CURRENT YEAR

        // CALCULATE NEW MONTH BASED ON DIRECTION
        let newMonth = currentMonth + direction;
        // CALCULATE NEW YEAR BASED ON TOTAL MONTHS
        let newYear = currentYear + Math.floor(newMonth / 12);

        // ADJUST THE MONTH TO STAY WITHIN 0-11 RANGE
        newMonth = (newMonth % 12 + 12) % 12;

        // ADJUST THE YEAR AND MONTH FOR OVERFLOW AND UNDERFLOW
        if (newMonth < 0) {
            newMonth += 12;
            newYear--;  // IF MONTH IS NEGATIVE, ADJUST YEAR
        }

        return [newMonth, newYear];
    }

    modifyYearThroughConfiguringTheLimits(openCalendar, minMaxInfo) {
        let currInfo = openCalendar.getFullYear();
        if (currInfo < minMaxInfo[0]) {
            currInfo = minMaxInfo[0];
            openCalendar.setFullYear(minMaxInfo[0]);
        }
        else if (currInfo > minMaxInfo[1]) {
            currInfo = minMaxInfo[1];
            openCalendar.setFullYear(minMaxInfo[1]);
        }

        return [currInfo, openCalendar];
    }

    modifyMonthThroughConfiguringTheLimits(openCalendar, minMaxInfo) {
        let currInfo = openCalendar.getMonth();
        if (currInfo < minMaxInfo[0]) {
            currInfo = minMaxInfo[0];
            openCalendar.setMonth(minMaxInfo[0]);
        }
        else if (currInfo > minMaxInfo[1]) {
            currInfo = minMaxInfo[1];
            openCalendar.setMonth(minMaxInfo[1]);
        }

        return [currInfo, openCalendar];
    }

    modifyDayThroughConfiguringTheLimits(openCalendar, minMaxInfo) {
        let currInfo = openCalendar.getDate();
        if (currInfo < minMaxInfo[0]) {
            currInfo = minMaxInfo[0];
            openCalendar.setDate(minMaxInfo[0]);
        }
        else if (currInfo > minMaxInfo[1]) {
            currInfo = minMaxInfo[1];
            openCalendar.setDate(minMaxInfo[1]);
        }

        return [currInfo, openCalendar];
    }
}