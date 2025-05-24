class ConfigManager {
    constructor(controller) {
        this.controller = controller;
    }

    getCustomDayClasses(config) {
        let customClass = '';
        const classes = config.day.myClass.split(' ');
        classes.forEach((eachClass) => {
            if (eachClass !== '') {
                customClass += ` ${eachClass}`;
            }
        });
        return customClass;
    }

    getSavedDataOfCurrentConfigId(id) {
        return this.controller.savedData.filter((dataObj) => dataObj.id === id)[0];
    }

    getConfigFromClickedEl(clickedEl) {
        const calendarId = clickedEl.closest(`.input_${this.controller.ccn}_outer_wrap`).id;
        return this.getConfigById(calendarId);
    }

    getConfigById(id) {
        return this.controller.configurations.find(cfg => cfg.id === id);
    }

    processConfigLimits({ openCalendar, year, month, day }) {
        const today = new Date();

        // DEFAULT YEAR RANGE BASED ON THE CONTROLLER'S GLOBAL DOWNLIMIT AND UPLIMIT
        const defaultMinYear = today.getFullYear() - this.controller.downLimit;
        const defaultMaxYear = today.getFullYear() + this.controller.upLimit;

        // GET GENERAL YEAR LIMITS OR DEFAULT TO GLOBAL DOWNLIMIT AND UPLIMIT
        let globalYearLimits = this.controller.validatorHandle.validateYearRange(year?.yearLimits);
        if (!globalYearLimits) {
            globalYearLimits = [defaultMinYear, defaultMaxYear];
        }

        const specificYearLimits = [];

        const finalYearLimits = this.controller.dateManager.combineAvailableYears(globalYearLimits, specificYearLimits, true);

        const finalMinYear = finalYearLimits[0];
        const finalMaxYear = finalYearLimits[1];
        const processedLimits = {
            minYear: finalMinYear,
            maxYear: finalMaxYear,
            years: {}
        };

        // CHECK IF OPENCALENDAR IS OUT OF YEAR LIMITS
        let currentYear = null;
        [currentYear, openCalendar] = this.controller.dateManager.modifyYearThroughConfiguringTheLimits(openCalendar, finalYearLimits);

        // ITERATE THROUGH EACH YEAR AND PROCESS MONTH AND DAY LIMITS
        for (let y = finalMinYear; y <= finalMaxYear; y++) {
            const yearLimits = year?.limits?.[y];
            if (!yearLimits && !year?.yearLimits) continue;

            // MONTH LIMITS FOR THE SPECIFIC YEAR OR FALLBACK TO GLOBAL MONTH LIMITS
            const globalMonthLimits = this.controller.validatorHandle.validateMonthRange(year?.globalLimits?.months) || [0, 11]; // DEFAULT: ALLOW ALL MONTHS
            const finalMonthLimits = this.controller.validatorHandle.validateMonthRange(yearLimits?.months) || globalMonthLimits;

            const finalMinMonth = finalMonthLimits[0];
            const finalMaxMonth = finalMonthLimits[1];

            // IF OPENCALENDAR YEAR MATCHES, CHECK IF THE MONTH IS WITHIN LIMITS
            if (y === currentYear) {
                let currentMonth = null;
                [currentMonth, openCalendar] = this.controller.dateManager.modifyMonthThroughConfiguringTheLimits(openCalendar, finalMonthLimits);
            }

            // PROCESS DAY LIMITS FOR EACH MONTH
            const months = {};
            for (let m = finalMinMonth; m <= finalMaxMonth; m++) {
                const globalDayLimits = this.controller.validatorHandle.validateDayRange(year?.globalLimits?.days?.[m], m, y) || [1, this.controller.dateManager.getNumOfDaysInMonth(m, y)];

                const specificDayLimits = this.controller.validatorHandle.validateDayRange(yearLimits?.days?.[m], m, y) || globalDayLimits;

                months[m] = {
                    minDay: specificDayLimits[0],
                    maxDay: Math.min(this.controller.dateManager.getNumOfDaysInMonth(m, y), specificDayLimits[1])
                };

                // IF OPENCALENDAR MATCHES BOTH YEAR AND MONTH, CHECK IF THE DAY IS WITHIN LIMITS
                if (y === currentYear && m === openCalendar.getMonth()) {
                    let currentDay = null;
                    [currentDay, openCalendar] = this.controller.dateManager.modifyDayThroughConfiguringTheLimits(openCalendar, specificDayLimits);
                }
            }

            // STORE PROCESSED MONTH AND DAY LIMITS FOR THE YEAR
            processedLimits.years[y] = {
                months: {
                    minMonth: finalMinMonth,
                    maxMonth: finalMaxMonth,
                    days: months
                }
            };
        }

        openCalendar = this.modifyOpenCalendarIfNeedItAfterLimits(processedLimits, openCalendar);

        return [processedLimits, openCalendar];
    }

    modifyOpenCalendarIfNeedItAfterLimits(processedLimits, openCalendar) {
        let currentYear = openCalendar.getFullYear();
        let currentMonth = openCalendar.getMonth();
        let currentDay = openCalendar.getDate();

        // CHECK IF currentYear IS WITHIN THE LIMITS AND EXISTS IN PROCESSEDLIMITS.YEARS
        if (currentYear < processedLimits.minYear) {
            currentYear = processedLimits.minYear;
            openCalendar.setFullYear(currentYear);
        }
        else if (currentYear > processedLimits.maxYear) {
            currentYear = processedLimits.maxYear;
            openCalendar.setFullYear(currentYear);
        }

        // IF currentYear IS NOT FOUND IN PROCESSEDLIMITS.YEARS, FIND THE NEAREST VALID YEAR
        if (!processedLimits.years[currentYear]) {
            // LOOP THROUGH PROCESSEDLIMITS.YEARS TO FIND THE NEAREST AVAILABLE YEAR
            const availableYears = Object.keys(processedLimits.years).map(Number);

            // FIND THE NEAREST VALID YEAR
            let nearestYear = availableYears.reduce((closest, year) => {
                return Math.abs(year - currentYear) < Math.abs(closest - currentYear) ? year : closest;
            }, availableYears[0]);

            // SET OPENCALENDAR TO THE NEAREST AVAILABLE YEAR
            currentYear = nearestYear;
            openCalendar.setFullYear(currentYear);
        }

        // NOW, GET THE YEAR-SPECIFIC LIMITS FOR THE VALID currentYear
        const yearLimits = processedLimits.years[currentYear];

        // ENSURE THE MONTH IS WITHIN THE VALID RANGE FOR THIS YEAR
        if (currentMonth < yearLimits.months.minMonth) {
            currentMonth = yearLimits.months.minMonth;
            openCalendar.setMonth(currentMonth);
        }
        else if (currentMonth > yearLimits.months.maxMonth) {
            currentMonth = yearLimits.months.maxMonth;
            openCalendar.setMonth(currentMonth);
        }

        // ENSURE THE DAY IS WITHIN THE VALID RANGE FOR THIS MONTH
        const monthLimits = yearLimits.months.days[currentMonth];
        if (currentDay < monthLimits.minDay) {
            currentDay = monthLimits.minDay;
            openCalendar.setDate(currentDay);
        }
        else if (currentDay > monthLimits.maxDay) {
            currentDay = monthLimits.maxDay;
            openCalendar.setDate(currentDay);
        }

        return openCalendar;
    }


    generateUniqueIds(length, startingIdString = '') {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = startingIdString + letters[Math.floor(Math.random() * letters.length)];

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 1; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            result += chars[randomIndex];
        }
        return result;
    }

    removeGreekTones(text) {
        const normalizedText = text.normalize("NFD");
        return normalizedText.replace(/[\u0300-\u036f]/g, "");
    }

    // FUNCTION TO UPDATE ARROW VISIBILITY
    arrowsCheckIfNeeded(config) {
        const currentDate = config.openCalendar;  // GET THE CURRENT DATE FROM CONFIG
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();

        const limits = config.processedLimits;

        // CHECK FOR PREVIOUS MONTH AVAILABILITY
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;

        if (prevMonth < 0) {
            prevMonth = 11;  // WRAP AROUND TO DECEMBER
            prevYear--;
        }

        // CHECK LIMITS FOR PREVIOUS MONTH/YEAR
        let prevAvailable = !(!limits.years[prevYear] || prevYear < limits.minYear);

        // CHECK FOR NEXT MONTH AVAILABILITY
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;

        if (nextMonth >= 12) {
            nextMonth = 0;  // WRAP AROUND TO JANUARY
            nextYear++;
        }

        // CHECK LIMITS FOR NEXT MONTH/YEAR
        let nextAvailable = !(!limits.years[nextYear] || nextYear > limits.maxYear);

        this.controller.domManager.updateNavArrowsVisibility(config, prevAvailable, nextAvailable);
    }
}