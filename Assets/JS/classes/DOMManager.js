class DOMManager {
    constructor(controller) {
        this.controller = controller;
    }

    ifFirefox() {
        return typeof InstallTrigger !== 'undefined';
    }

    closeAllCoreElements(config) {
        this.closeElement(config.coreElements.calendarWrap);
        this.closeElement(config.coreElements.calendarInnerWrap);
        this.closeElement(config.coreElements.helperBody);
        this.closeElement(config.coreElements.yearsWrap);
        this.closeElement(config.coreElements.mobileLayerWrap);
    }

    closeElement(element) {
        if (element) {
            element.classList.add(`${this.controller.ccn}_close_status`);
        }
    }

    openElement(element) {
        if (element) {
            element.classList.remove(`${this.controller.ccn}_close_status`);
        }
    }

    // STARTING ACTIONS AFTER RENDER, TO BUILD THE STARTING CORE OF THE CALENDAR 
    createOrUpdateInputCalendar(config) {
        // STEP 1: PREPARE INPUT FIELD AND CREATE OUTER WRAP
        this.prepareInputField(config);
        const outerWrap = this.createOuterWrap(config);

        // STEP 2: REMOVE ANY PREVIOUS EVENT LISTENERS ATTACHED TO THE CONFIGURATION
        this.controller.eventHandler.removePreviousCalendarEventListeners(config);

        // STEP 3: PROCESS LIMITS AND CLAMP THE OPEN CALENDAR DATE TO BE WITHIN VALID LIMITS (ACCESS PRE-PROCESSED LIMITS DONE IN createCalendar)
        const processedLimits = config.processedLimits;

        const year = config.openCalendar.getFullYear();
        const month = config.openCalendar.getMonth();
        const day = config.openCalendar.getDate();

        // FETCH THE LIMITS FOR THE CURRENT YEAR AND MONTH
        const yearLimits = processedLimits.years[year];
        const monthLimits = yearLimits.months;

        config.openCalendar = this.controller.validatorHandle.clampDate({
            date: config.openCalendar,
            minYear: processedLimits.minYear,
            maxYear: processedLimits.maxYear,
            minMonth: monthLimits.minMonth,
            maxMonth: monthLimits.maxMonth,
            minDay: monthLimits.days[month].minDay,
            maxDay: monthLimits.days[month].maxDay
        });

        // STEP 4: CREATE NECESSARY CALENDAR STRUCTURES (WRAPS, HEADERS, BODY)
        const wraps = this.createWrap(outerWrap);
        this.createMonthHeader(config, wraps[1]);
        const monthBody = this.createMonthBodyWrapper(wraps[1]);
        this.createMonthBody(config, monthBody);

        // STEP 5: CREATE HELPER WINDOW WRAP
        const helperBody = this.createHelperWrapper(outerWrap);
        this.createWrapHelper(config, helperBody);

        // STEP 6: CREATE YEAR WRAP AND OPTIONS IF CONFIG ALLOWS YEAR CLICKING
        let yearsWrap = null;
        let followCursorEl = null;
        if (config.clickable && config.year.clickable) {
            yearsWrap = this.createYearsWrap(outerWrap);
            followCursorEl = this.createAllYearChoices(config, yearsWrap);
        }

        // STEP 7: CREATE MOBILE OVERLAY FOR THE CALENDAR (IF NECESSARY)
        let mobileLayerWrap = document.querySelector(`${this.controller.ccn}_overlay_for_mobile`);
        if (!mobileLayerWrap) {
            mobileLayerWrap = this.createMobileOverlay();
        }

        // STEP 8: ATTACH ALL CORE ELEMENTS TO THE CONFIG OBJECT
        config.coreElements = {
            calendarWrap: outerWrap,
            calendarInnerWrap: wraps[0],
            helperBody,
            yearsWrap,
            followCursor: followCursorEl,
            mobileLayerWrap
        };

        // STEP 9: APPLY STYLES AND EVENT HANDLERS TO THE CALENDAR
        this.prepareCssForThisCalendarFromConfig(config);
        this.controller.eventHandler.handleInputsBehaviorWithCalendarElement(config);
    }


    prepareInputField(config) {
        const typeOfInput = config.inputToAttach.tagName.toLowerCase();
        if (typeOfInput === 'input') {
            config.inputToAttach.type = "text";
            config.inputToAttach.readOnly = true;
            config.inputToAttach.placeholder = config.inputPlaceholder;
        }
        else {
            config.inputToAttach.readOnly = true;
            config.inputToAttach.innerText = config.inputPlaceholder;
        }
    }

    createOuterWrap(config) {
        const outerWrap = document.createElement('div');
        outerWrap.className = `input_${this.controller.ccn}_outer_wrap`;
        outerWrap.id = config.id;
        document.body.appendChild(outerWrap);
        this.closeElement(outerWrap);
        return outerWrap;
    }

    addCursorFollowInYear(yearsContainer) {
        const cursor = document.createElement('span');
        cursor.className = `${this.controller.ccn}_cursor_to_follow`;
        yearsContainer.appendChild(cursor);
        return cursor;
    }

    createWrap(outerWrap) {
        const ccn = this.controller.ccn;
        const innerCalendar = document.createElement('div');
        innerCalendar.className = `input_${ccn}_inner_calendar`;
        outerWrap.appendChild(innerCalendar);

        const wrap = document.createElement('div');
        wrap.className = `input_${ccn}_wrap`;
        innerCalendar.appendChild(wrap);
        return [innerCalendar, wrap];
    }

    createYearsWrap(outerWrap) {
        const yearsWrap = document.createElement('div');
        yearsWrap.className = `${this.controller.ccn}_years_wrap`;
        outerWrap.appendChild(yearsWrap);

        this.closeElement(yearsWrap);

        Calendar_Controller.domReadyPromise.then(() => {
            if (this.ifFirefox() && yearsWrap) {
                yearsWrap.classList.add('firefox-scroll');
            }
        });

        return yearsWrap;
    }

    createAllYearChoices(config, yearsWrap) {
        const ccn = this.controller.ccn;
        const yearsContainer = document.createElement('div');
        yearsContainer.className = `${ccn}_years_container`;

        let minYear = config.processedLimits.minYear;
        let maxYear = config.processedLimits.maxYear;

        for (let year = minYear; year <= maxYear; year++) {
            const yearElement = document.createElement('span');
            let activeClass = '';
            if (config.openCalendar.getFullYear() === year) {
                activeClass = ` ${ccn}_active_year`;
            }
            yearElement.className = `${ccn}_year${activeClass}`;
            yearElement.textContent = year;
            yearElement.setAttribute('data-year', year);

            yearsContainer.appendChild(yearElement);
        }

        let cursor = null;
        if (config.cursorEffect) {
            cursor = this.addCursorFollowInYear(yearsContainer);
        }

        yearsWrap.appendChild(yearsContainer);

        return cursor;
    }

    createMobileOverlay() {
        const mobileLayerWrap = document.createElement('div');
        mobileLayerWrap.className = `${this.controller.ccn}_overlay_for_mobile`;
        document.body.appendChild(mobileLayerWrap);
        this.closeElement(mobileLayerWrap);
        return mobileLayerWrap;
    }

    createMonthBodyWrapper(wrap) {
        const monthBody = document.createElement('div');
        monthBody.className = `${this.controller.ccn}_month_body`;
        wrap.appendChild(monthBody);
        return monthBody;
    }

    createHelperWrapper(wrap) {
        const wrapHelper = document.createElement('div');
        wrapHelper.className = `${this.controller.ccn}_wrap_helper`;
        wrap.appendChild(wrapHelper);
        return wrapHelper;
    }

    // HANDLES THE FUNCTIONALITY OF THE CALENDAR'S HEADER
    createMonthHeader(config, parentEl) {
        const ccn = this.controller.ccn;
        const wrap = document.createElement('div');
        wrap.className = `${ccn}_month_header_wrap`;
        parentEl.appendChild(wrap);

        wrap.innerHTML += `
            <div class="${ccn}_month_header_title_outer_wrap">
                <div id="calendar_${config.id}_left_arrow_parent" class="${ccn}_header_left_arrow_wrap"></div>
                <div class="${ccn}_month_header_title_wrap">
                    ${this.returnMonthYear(config)}
                </div>
                <div id="calendar_${config.id}_right_arrow_parent" class="${ccn}_header_right_arrow_wrap"></div>
            </div>
        `;

        if (config.clickable && config.navigation.activeArrows) {
            const leftArrowParent = document.getElementById(`calendar_${config.id}_left_arrow_parent`);
            const rightArrowParent = document.getElementById(`calendar_${config.id}_right_arrow_parent`);
            this.createNavigationButtons(config, leftArrowParent, rightArrowParent);
        }

        this.createStaticWeekDaysHeaderOfMonth(wrap);
    }

    createNavigationButtons(config, parentLeftArrow, parentRightArrow) {
        const ccn = this.controller.ccn;
        const colorOfArrows = 'black';
        const svgRestTag = `version="1.1" id="icons_1_" xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 128 128" style="enable-background:new 0 0 128 128" xml:space="preserve"><style>.st0{display:none}.st1{display:inline}</style><g id="row2_1_"><g id="_x32__4_"><path class="st2" d="M64 .3C28.7.3 0 28.8 0 64s28.7 63.7 64 63.7 64-28.5 64-63.7S99.3.3 64 .3zm0 121C32.2 121.3 6.4 95.7 6.4 64 6.4 32.3 32.2 6.7 64 6.7s57.6 25.7 57.6 57.3c0 31.7-25.8 57.3-57.6 57.3zm22.4-63.7H57.6l12.3-15.2c0-2.2-1.8-3.9-3.9-3.9h-7.1L32 64l26.8 25.5H66c2.2 0 3.9-1.8 3.9-3.9L57.1 69.9h28.6c2.2 0 3.9-1.8 3.9-3.9v-4c0-2.1-1-4.4-3.2-4.4z" id="left_1_"/></g></g></svg>`;


        const leftArrow = document.createElement('a');
        leftArrow.className = `input_${ccn}_nav_arrow input_${ccn}_left_arrow`;
        leftArrow.id = `calendar_${config.id}_left_arrow`;
        leftArrow.name = 'left_arrow';
        leftArrow.innerHTML = `<svg class="input_${ccn}_arrow_image" alt="left_arrow" ${svgRestTag}`;
        parentLeftArrow.appendChild(leftArrow);

        const rightArrow = document.createElement('a');
        rightArrow.className = `input_${ccn}_nav_arrow input_${ccn}_right_arrow`;
        rightArrow.id = `calendar_${config.id}_right_arrow`;
        rightArrow.name = 'right_arrow';
        rightArrow.innerHTML = `<svg class="input_${ccn}_arrow_image" alt="right_arrow" ${svgRestTag}`;
        parentRightArrow.appendChild(rightArrow);

        this.controller.configManager.arrowsCheckIfNeeded(config)
    }

    returnMonthYear(config) {
        const ccn = this.controller.ccn;
        let clickableYear = '';
        if (config.clickable && config.year.clickable) {
            clickableYear = `${ccn}_clickable`;
        }

        const monthIndex = config.openCalendar.getMonth();
        const month = this.controller.dateManager.months[monthIndex];
        const year = config.openCalendar.getFullYear();

        config.year.handler.activeYear = year;
        config.month.handler.activeMonth = monthIndex;

        return `
            <div class="${ccn}_month_header_title">
                <span aria-label="${month} ${year}">${month}</span>
            </div>
            <div class="${ccn}_year_header_title_wrap">
                <span class="${ccn}_year_header_title ${clickableYear}" id="calendar_${config.id}_year" aria-label="Year input" data-min="${year - this.controller.downLimit}" data-max="${year + this.controller.upLimit}">${year}</span>
            </div>
        `;
    }

    createStaticWeekDaysHeaderOfMonth(parentEl) {
        const ccn = this.controller.ccn;
        const monthHeader = document.createElement('div');
        monthHeader.className = `${ccn}_month_header`;
        parentEl.appendChild(monthHeader);

        let htmlForMonthHeader = '';
        for (let weekDay = 0; weekDay < 7; weekDay++) {
            const weekDayStr = this.controller.dateManager.weekDays[weekDay];
            let weekDaysDisplayed = weekDayStr.substring(0, 2);
            weekDaysDisplayed = this.controller.configManager.removeGreekTones(weekDaysDisplayed);

            htmlForMonthHeader += `
                <span class="${ccn}_day_header" aria-label="${weekDayStr}">
                    ${weekDaysDisplayed}
                </span>
            `;
        }
        monthHeader.innerHTML = htmlForMonthHeader;
    }

    // RE RENDERS WHEN CHANGING MONTHS
    createMonthBody(config, parentEl, disabledMonth = false) {
        const month = config.openCalendar.getMonth(), year = config.openCalendar.getFullYear();

        const countDays = this.controller.dateManager.getNumOfDaysInMonth(month, year);

        const first_day = this.controller.dateManager.getFirstDayOfMonth(month, year);
        const start_day = (first_day - config.rules.weekStartDay + 7) % 7;

        const prev_month = new Date(year, month, 0);
        let htmlForMonthBody = this.startDaysOfMonthFromCorrectWeekDay(config, start_day, { prev_month });

        // ADD CUSTOM CLASS TO DAY
        const customClasses = this.controller.configManager.getCustomDayClasses(config);

        const ccn = this.controller.ccn;
        config.day.handler.previousDay = null;
        config.day.handler.currentDay = null;
        for (let day = 1; day <= countDays; day++) {
            config.day.handler.currentDay = day;

            const currDay = new Date(`${year}-${month + 1}-${day}`);
            const currentMonthCheck = this.controller.dateManager.compareTwoDates(currDay, new Date());
            let currentDayClass = '';
            if (currentMonthCheck) {
                currentDayClass += ` ${ccn}_current_day`;
            }

            // IF DISABLED MONTH ADD IT HERE
            if (disabledMonth) {
                currentDayClass += ` ${ccn}_disabled_day`;
            }
            else {
                // CHECK IF SPECIFIC DATE IS DISABLED
                const exists = this.controller.validatorHandle.validateDateConsideringProccessedLimits(currDay, config.processedLimits);

                if (!exists) currentDayClass = `  ${ccn}_disabled_day`;
            }

            let data = '';
            let clickableClassData = '';
            let restData = '';

            if (config.clickable && config.day.clickable) {
                clickableClassData = `${ccn}_clickable`;
                restData = `aria-checked="false"`;
            }

            const formattedDate = this.controller.dateManager.formatDate(config, day, month, year);
            data = `class="${ccn}_day ${clickableClassData}${customClasses}${currentDayClass}" data-day="${day}" data-date="${formattedDate}" aria-label="${day} ${this.controller.dateManager.monthsForUse[month]} ${year}" ${restData}`;

            htmlForMonthBody += `
                <span ${data} >
                ${day}
                    </span>
            `;
        }

        const last_days = (7 - ((start_day + countDays) % 7)) % 7;

        const next_month = new Date(year, month + 2, 0);
        htmlForMonthBody += this.startDaysOfMonthFromCorrectWeekDay(config, last_days, { next_month });

        parentEl.innerHTML = htmlForMonthBody;

        // ADD ACTIVE TO CURRENT DATE IF CALENDAR IS OPENED TO THAT DATE (OTHERWISE ON RE RENDER THE ACTIVE DATE WILL NOT DISPLAY IT)
        if (config.day.handler.activeDate) {
            const activeYear = config.day.handler.activeDate.getFullYear();
            const activeMonth = config.day.handler.activeDate.getMonth();
            const activeDay = config.day.handler.activeDate.getDate();
            const formattedActiveDate = this.controller.dateManager.formatDate(config, activeDay, activeMonth, activeYear);
            const initDateElement = document.querySelector(`#${config.id} [data-date="${formattedActiveDate}"]`);
            if (initDateElement) {
                this.controller.eventHandler.onClickDayAction(initDateElement, config, false);
            }
        }


        // ONLY USE FOR THE INIT CONSTRUCTION
        if (config.initDate) {
            const day = config.openCalendar.getDate();
            const formattedDate = this.controller.dateManager.formatDate(config, day, month, year);
            const initDateElement = document.querySelector(`#${config.id} [data-date="${formattedDate}"]`)
            this.controller.eventHandler.onClickDayAction(initDateElement, config, false);
            config.initDate = false;
        }
    }

    createWrapHelper(config, parentEl) {
        const wrapBody = document.createElement('span');
        wrapBody.classList.add(`${this.controller.ccn}_helper_body_wrap`);
        parentEl.appendChild(wrapBody);

        // FUNCTIONALITY TO NAV TO CURRENT DATE, IF CALENDAR INCLUDES IT IN ITS LIMIT
        const wrapButtonToToday = document.createElement('span');
        wrapButtonToToday.classList.add(`${this.controller.ccn}_today_button_wrap`);
        wrapBody.appendChild(wrapButtonToToday);

        const buttonToToday = document.createElement('span');
        buttonToToday.classList.add(`${this.controller.ccn}_today_button`);
        buttonToToday.innerText = this.controller.dateManager.buttons.currentDate;
        wrapButtonToToday.appendChild(buttonToToday);
    }

    startDaysOfMonthFromCorrectWeekDay(config, firstDayOfMonth, month_obj) {
        let html = '';
        let custom_class = '';
        let count_days = -1;
        let month = -1;
        let year = -1;
        let is_for_next_month = false;
        let is_for_prev_month = false;

        let c = 0;
        if (config.rules.displayPreviousMonth && month_obj.prev_month) {
            custom_class = ` ${this.controller.ccn}_prev_month_day`;
            count_days = month_obj.prev_month.getDate();
            month = month_obj.prev_month.getMonth();
            year = month_obj.prev_month.getFullYear();
            is_for_prev_month = true;
            c = firstDayOfMonth - 1;
            console.log(month_obj.prev_month);
        }
        else if (config.rules.displayNextMonth && month_obj.next_month) {
            custom_class = ` ${this.controller.ccn}_next_month_day`;
            count_days = 0;
            month = month_obj.next_month.getDate();
            year = month_obj.next_month.getFullYear();
            is_for_next_month = true;
            c = -1;
            console.log(month_obj.next_month);
        }

        let data_day = count_days;

        const minOpacity = 0.1;
        const maxOpacity = 0.6;
        for (let day = 0; day < firstDayOfMonth; day++) {
            data_day = count_days != -1 ? count_days - c : count_days;
            let view_data_day = data_day != -1 ? data_day : '';

            // MIGHT HAVE A VALUE FROM 0 TO 1
            let normalized = firstDayOfMonth <= 1 ? 1 : day / (firstDayOfMonth - 1);
            normalized == 0 ? normalized = 0.2 : normalized;

            const color_opacity = is_for_prev_month
                ? minOpacity + normalized * (maxOpacity - minOpacity)
                : is_for_next_month
                    ? maxOpacity - normalized * (maxOpacity - minOpacity)
                    : 0;

            const use_or_not_fade = config.style.includeFadedDays
                ? `style="color: rgba(169, 169, 169, ${color_opacity.toFixed(2)});"`
                : '';

            let data_date = data_day != -1 ? this.controller.dateManager.formatDate(config, data_day, month, year) : -1;

            html += `<span class="${this.controller.ccn}_day${custom_class}" data-day="${data_day}" data-date="${data_date}" ${use_or_not_fade}}>${view_data_day}</span>`;
            c--;
        }
        return html;
    }

    prepareCssForThisCalendarFromConfig(config) {
        // SET TRANSITIONS
        const transitionGeneralWrap = `
            visibility ${config.style.transitions.fadeDatePicker}ms,
            opacity ${config.style.transitions.fadeDatePicker}ms
        `;
        config.coreElements.calendarWrap.style.transition = transitionGeneralWrap;
        config.coreElements.calendarInnerWrap.style.transition = transitionGeneralWrap;

        if (config.coreElements.yearsWrap) {
            config.coreElements.yearsWrap.style.transition = `
                opacity ${config.style.transitions.fadeYearPicker}ms, 
                visibility ${config.style.transitions.fadeYearPicker}ms, 
                transform ${config.style.transitions.fadeYearPicker}ms
            `;
        }

        if (config.coreElements.followCursor) {
            config.coreElements.followCursor.style.transition = `
                top ${config.style.transitions.cursorEffectDelay}ms, 
                left ${config.style.transitions.cursorEffectDelay}ms, 
                opacity 0.1s
            `;
        }
    }

    updateNavArrowsVisibility(config, prevAvailable, nextAvailable) {
        const ccn = this.controller.ccn;
        // HIDE OR SHOW ARROWS BASED ON AVAILABILITY
        const prevArrow = document.querySelector(`#${config.id} .input_${ccn}_nav_arrow.input_${ccn}_left_arrow`);
        const nextArrow = document.querySelector(`#${config.id} .input_${ccn}_nav_arrow.input_${ccn}_right_arrow`);

        if (prevArrow) {
            if (!prevAvailable) {
                prevArrow.classList.add(`${ccn}_disable_arrow`);  // HIDE PREVIOUS ARROW IF NO PREVIOUS MONTH AVAILABLE
            }
            else {
                prevArrow.classList.remove(`${ccn}_disable_arrow`);  // SHOW PREVIOUS ARROW
            }
        }

        if (nextArrow) {
            if (!nextAvailable) {
                nextArrow.classList.add(`${ccn}_disable_arrow`);  // HIDE NEXT ARROW IF NO NEXT MONTH AVAILABLE
            }
            else {
                nextArrow.classList.remove(`${ccn}_disable_arrow`);;  // SHOW NEXT ARROW
            }
        }
    }
}