class DateManager {
    constructor(controller) {
        this.controller = controller;

        this.months = [];
        this.monthsForUse = [
            'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
        ];

        this.weekDays = [];

        this.buttons = {
            currentDate: null
        };
    }

    getCurrentDay(d, m, y) {
        return new Date(y, m + 1, d).getDay();
    }

    getFirstDayOfMonth(m, y) {
        return new Date(y, m + 1, 1).getDay();
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

    clickDayCoreFunctionality(clickedEl, config) {
        if (config.inputToAttach.hasAttribute('value')) {
            config.inputToAttach.value = clickedEl.getAttribute('data-date');
        }
        else {
            config.inputToAttach.innerText = clickedEl.getAttribute('data-date');
        }
        this.configureActiveDay(clickedEl, config);
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
            openCalendar.setMonth(minMaxInfo[0] - 1);
        }
        else if (currInfo > minMaxInfo[1]) {
            currInfo = minMaxInfo[1];
            openCalendar.setMonth(minMaxInfo[1] - 1);
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