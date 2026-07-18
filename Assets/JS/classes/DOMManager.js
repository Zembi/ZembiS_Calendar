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
        this.closeElement(config.coreElements.monthsWrap);
        this.closeElement(config.coreElements.timeWrap);
        this.closeElement(config.coreElements.mobileLayerWrap);

        const element = config.inputToAttach;
        if (element.tagName.toLowerCase() == 'button') {
            element.disabled = false;
        }
        else if (element.tagName.toLowerCase() == 'select') {
            element.disabled = false;
        }
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
        const timeTriggerWrap = this.createTimeTriggerRow(config, wraps[1]);

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

        // STEP 6B: CREATE MONTH WRAP AND OPTIONS IF CONFIG ALLOWS MONTH CLICKING - SAME GATING PATTERN AS THE
        // YEAR WRAP ABOVE, INDEPENDENT OF IT (A CALENDAR CAN HAVE EITHER PANEL, BOTH, OR NEITHER)
        let monthsWrap = null;
        let monthsFollowCursorEl = null;
        if (config.clickable && config.month.clickable) {
            monthsWrap = this.createMonthsWrap(outerWrap);
            monthsFollowCursorEl = this.createAllMonthChoices(config, monthsWrap);
        }

        // STEP 6C: CREATE TIME WRAP AND CHOICES IF CONFIG ALLOWS TIME SELECTION - NEVER BUILT IN RANGE-SELECT
        // MODE, TIME IS A SINGLE-DATE-ONLY CONCEPT (SEE Calendar_Controller's time config comment)
        let timeWrap = null;
        if (config.clickable && config.time.enabled && !config.day.rangeSelect) {
            timeWrap = this.createTimeWrap(outerWrap);
            this.createTimeChoices(config, timeWrap);
        }

        // STEP 7: CREATE MOBILE OVERLAY FOR THE CALENDAR (IF NECESSARY)
        let mobileLayerWrap = document.querySelector(`.${this.controller.ccn}_overlay_for_mobile`);
        if (!mobileLayerWrap) {
            mobileLayerWrap = this.createMobileOverlay();
        }

        // STEP 8: CREATE THE LOADER OVERLAY (HIDDEN BY DEFAULT, TOGGLED VIA disableCalendar()/enableCalendar())
        const loaderOverlay = this.createLoaderOverlay(config, outerWrap);

        // STEP 9: ATTACH ALL CORE ELEMENTS TO THE CONFIG OBJECT
        config.coreElements = {
            calendarWrap: outerWrap,
            calendarInnerWrap: wraps[0],
            helperBody,
            yearsWrap,
            followCursor: followCursorEl,
            monthsWrap,
            monthsFollowCursor: monthsFollowCursorEl,
            timeWrap,
            timeTriggerWrap,
            mobileLayerWrap,
            loaderOverlay,
            monthBodyTrack: monthBody.parentElement,
            monthBodyViewport: monthBody.parentElement.parentElement
        };

        // STEP 10: APPLY STYLES AND EVENT HANDLERS TO THE CALENDAR
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
        else if (typeOfInput === 'textarea') {
            config.inputToAttach.readOnly = true;
            config.inputToAttach.placeholder = config.inputPlaceholder;
        }
        else if (typeOfInput === 'select') {
            console.warn('VFZ_Calendar: With select elements the placeholder option can not be utilized');
        }
        else {
            config.inputToAttach.readOnly = true;
            config.inputToAttach.innerText = config.inputPlaceholder;
        }
    }

    createOuterWrap(config) {
        const outerWrap = document.createElement('div');
        outerWrap.className = `input_${this.controller.ccn}_outer_wrap ${this.controller.ccn}_layout_${config.layout}`;
        outerWrap.id = config.id;
        // SCOPES style.transitions.monthNavigation TO THIS CALENDAR'S OWN OUTER WRAP - THE reduced-motion MEDIA
        // QUERY IN calendar.css OVERRIDES THIS VARIABLE WITH !important SO IT STILL WINS OVER THIS INLINE VALUE
        outerWrap.style.setProperty('--calendar-slide-duration', `${config.style.transitions.monthNavigation}ms`);
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

    addCursorFollowInMonth(monthsContainer) {
        const cursor = document.createElement('span');
        cursor.className = `${this.controller.ccn}_cursor_to_follow`;
        monthsContainer.appendChild(cursor);
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

    createMonthsWrap(outerWrap) {
        const monthsWrap = document.createElement('div');
        monthsWrap.className = `${this.controller.ccn}_months_wrap`;
        outerWrap.appendChild(monthsWrap);

        this.closeElement(monthsWrap);

        Calendar_Controller.domReadyPromise.then(() => {
            if (this.ifFirefox() && monthsWrap) {
                monthsWrap.classList.add('firefox-scroll');
            }
        });

        return monthsWrap;
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

    // BUILDS ALL 12 MONTH CHOICES FOR THE CURRENTLY ACTIVE YEAR (config.openCalendar.getFullYear()) - UNLIKE
    // createAllYearChoices, THIS IS MEANT TO BE CALLED ON EVERY NAVIGATION, NOT JUST WHEN LIMITS CHANGE, SINCE
    // WHICH MONTHS ARE ENABLED DEPENDS ON THE ACTIVE YEAR (config.processedLimits.years[year].months). SEE
    // rebuildMonthsPicker, WHICH IS THE FULL-REBUILD ENTRY POINT CALLED FROM EVERY NAV-COMMIT PATH.
    createAllMonthChoices(config, monthsWrap) {
        const ccn = this.controller.ccn;
        const monthsContainer = document.createElement('div');
        monthsContainer.className = `${ccn}_months_container`;

        const activeYear = config.openCalendar.getFullYear();
        const activeMonth = config.openCalendar.getMonth();
        const { minMonth, maxMonth } = config.processedLimits.years[activeYear].months;

        for (let m = 0; m <= 11; m++) {
            const monthElement = document.createElement('span');
            let extraClass = '';
            if (activeMonth === m) {
                extraClass += ` ${ccn}_active_month`;
            }
            if (m < minMonth || m > maxMonth) {
                extraClass += ` ${ccn}_disabled_month`;
            }
            monthElement.className = `${ccn}_month_choice${extraClass}`;
            monthElement.textContent = config.language.months[m];
            monthElement.setAttribute('data-month', m);

            monthsContainer.appendChild(monthElement);
        }

        let cursor = null;
        if (config.cursorEffect) {
            cursor = this.addCursorFollowInMonth(monthsContainer);
        }

        monthsWrap.appendChild(monthsContainer);

        return cursor;
    }

    // REBUILDS THE YEAR-PICKER LIST AFTER processedLimits CHANGES (E.G. updateYearLimits) - createAllYearChoices
    // ONLY EVER APPENDS, SO THE OLD CONTAINER MUST BE CLEARED FIRST OR THE OLD/NEW YEAR LISTS WOULD BOTH SHOW
    rebuildYearsPicker(config) {
        const yearsWrap = config.coreElements?.yearsWrap;
        if (!yearsWrap) return;

        yearsWrap.innerHTML = '';
        config.coreElements.followCursor = this.createAllYearChoices(config, yearsWrap);
    }

    // REBUILDS THE MONTH-PICKER PANEL FROM SCRATCH ON EVERY NAVIGATION (ARROW/DRAG/YEAR-PICK/setOpenCalendar/
    // updateYearLimits) - UNLIKE THE YEAR PICKER'S SPLIT BETWEEN A RARE FULL REBUILD AND A CHEAP PER-NAV ACTIVE-
    // CHIP SYNC, HERE BOTH "WHICH MONTHS ARE ENABLED" AND "WHICH MONTH IS ACTIVE" CAN CHANGE ON THE SAME EVENT
    // (ANY NAV THAT CROSSES A YEAR BOUNDARY), SO THERE'S NO SUCH SPLIT TO EXPLOIT - AND AT ONLY 12 ELEMENTS, A
    // FULL REBUILD EVERY TIME IS CHEAP AND LEAVES NO STALE STATE THAT A MISSED CALL SITE COULD FORGET TO SYNC
    // (SEE THE BUG THAT SAME GAP CAUSED FOR syncActiveYearChip).
    rebuildMonthsPicker(config) {
        const monthsWrap = config.coreElements?.monthsWrap;
        if (!monthsWrap) return;

        monthsWrap.innerHTML = '';
        config.coreElements.monthsFollowCursor = this.createAllMonthChoices(config, monthsWrap);
    }

    // UNLIKE createYearsWrap/createMonthsWrap, THIS ELEMENT ITSELF NEVER SCROLLS - THE HOUR/MINUTE WHEEL COLUMNS
    // INSIDE IT EACH SCROLL INDEPENDENTLY (SEE createTimeChoices/createWheelColumn), SO NO Firefox-scroll CLASS
    // OR SCROLLBAR STYLING IS NEEDED ON THIS WRAP ITSELF
    createTimeWrap(outerWrap) {
        const timeWrap = document.createElement('div');
        timeWrap.className = `${this.controller.ccn}_time_wrap`;
        outerWrap.appendChild(timeWrap);

        this.closeElement(timeWrap);

        return timeWrap;
    }

    // NUMBER OF TIMES THE BASE VALUE LIST (0-23, 1-12, OR THE STEPPED MINUTE LIST) IS DUPLICATED BACK-TO-BACK IN
    // EACH WHEEL COLUMN, TO FAKE INFINITE SCROLL VIA THE STANDARD "BUFFER + SILENT RESET" TRICK (SEE
    // EventHandler's SCROLL-SETTLE HANDLER, WHICH JUMPS scrollTop BACK TO THE MIDDLE COPY WHENEVER THE USER
    // SCROLLS INTO ANY OTHER COPY). 5 GIVES 2 SPARE COPIES ON EITHER SIDE OF THE "HOME" MIDDLE COPY (INDEX 2),
    // ENOUGH BUFFER THAT A SINGLE STRONG FLICK CAN'T OUTRUN IT BEFORE THE NEXT SETTLE CHECK.
    static WHEEL_COPIES = 5;
    static WHEEL_HOME_COPY_INDEX = 2;

    // BUILDS ONE WHEEL COLUMN (HOURS OR MINUTES): choiceClass DUPLICATED WHEEL_COPIES TIMES OVER `values`
    // (EACH {label, value}), MARKING ONLY THE MIDDLE COPY'S MATCHING ENTRY active SO EXACTLY ONE CHIP STARTS
    // ACTIVE, AND (IF disabledClass/isDisabledFn ARE GIVEN) MARKING EVERY COPY OF ANY VALUE isDisabledFn REJECTS.
    // RETURNS { container, homeIndex } - THE CALLER MUST SET container.scrollTop = homeIndex * rowHeight
    // ITSELF, ONLY AFTER container IS ATTACHED TO THE LIVE DOCUMENT (getComputedStyle ON A DETACHED NODE CAN'T
    // RESOLVE THE INHERITED --calendar-time-wheel-row-height VAR, AND scrollTop IS MEANINGLESS BEFORE LAYOUT
    // ANYWAY) - SEE createTimeChoices, WHICH DOES THIS ONCE THE WHOLE PANEL IS APPENDED.
    createWheelColumn(containerClass, choiceClass, activeClass, dataAttr, values, activeValue, disabledClass = null, isDisabledFn = null) {
        const container = document.createElement('div');
        container.className = containerClass;

        for (let copy = 0; copy < DOMManager.WHEEL_COPIES; copy++) {
            values.forEach((v) => {
                const el = document.createElement('span');
                const isActive = copy === DOMManager.WHEEL_HOME_COPY_INDEX && v.value === activeValue;
                const isDisabled = isDisabledFn && isDisabledFn(v.value);
                el.className = `${choiceClass}${isActive ? ` ${activeClass}` : ''}${isDisabled ? ` ${disabledClass}` : ''}`;
                el.textContent = v.label;
                el.setAttribute(dataAttr, v.value);
                container.appendChild(el);
            });
        }

        const realIndex = values.findIndex((v) => v.value === activeValue);
        const homeIndex = DOMManager.WHEEL_HOME_COPY_INDEX * values.length + realIndex;

        return { container, homeIndex };
    }

    // BUILDS THE HOUR/MINUTE WHEELS (AND, FOR 12-HOUR MODE, AN AM/PM ROW BELOW THEM). UNLIKE THE MONTH PICKER,
    // NOTHING ABOUT MONTH/YEAR NAVIGATION EVER INVALIDATES THIS PANEL'S CONTENT, SO THERE IS NO rebuildXPicker-
    // STYLE ENTRY POINT CALLED FROM NAV-COMMIT PATHS - THIS IS ONLY EVER CALLED ONCE, AT FIRST BUILD, AND THE
    // PANEL IS OTHERWISE UPDATED IN PLACE BY EventHandler's OWN SCROLL/CLICK HANDLERS.
    createTimeChoices(config, timeWrap) {
        const ccn = this.controller.ccn;
        const timeContainer = document.createElement('div');
        timeContainer.className = `${ccn}_time_container`;

        const wheelsRow = document.createElement('div');
        wheelsRow.className = `${ccn}_wheels_row`;

        const activeHour = config.time.handler.activeHour;
        const activeMinute = config.time.handler.activeMinute;
        const isPM = activeHour >= 12;

        // AM/PM ROW - ABOVE THE WHEELS. ALWAYS BUILT, EVEN IN 24-HOUR MODE, SO THE WHEELS SIT AT THE SAME
        // VERTICAL POSITION REGARDLESS OF use12Hour - OTHERWISE A 24-HOUR CALENDAR'S WHEELS WOULD SHIFT UP TO
        // FILL THE SPACE WHERE THE AM/PM ROW WOULD OTHERWISE BE. JUST VISUALLY HIDDEN (visibility:hidden, NOT
        // display:none, SO ITS SPACE STAYS RESERVED) WHEN use12Hour IS OFF.
        const periodContainer = document.createElement('div');
        periodContainer.className = `${ccn}_period_container${config.time.use12Hour ? '' : ` ${ccn}_period_container_hidden`}`;

        ['AM', 'PM'].forEach((label) => {
            const periodElement = document.createElement('span');
            const isActivePeriod = (label === 'PM') === isPM;
            periodElement.className = `${ccn}_period_choice${isActivePeriod ? ` ${ccn}_active_period` : ''}`;
            periodElement.textContent = label;
            periodElement.setAttribute('data-period', label);
            periodContainer.appendChild(periodElement);
        });

        timeContainer.appendChild(periodContainer);

        // HOURS WHEEL - 12 VALUES (12,1..11) FOR 12-HOUR MODE, OR 24 VALUES (0-23) FOR 24-HOUR MODE. 12-HOUR
        // CHIPS STORE THE DISPLAYED NUMERAL (data-hour12, 1-12), NOT A RESOLVED 24H VALUE - THE ACTUAL 24H VALUE
        // DEPENDS ON THE SEPARATE AM/PM TOGGLE TOO, AND KEEPING IT OUT OF THIS ATTRIBUTE MEANS TOGGLING AM/PM
        // LATER (handlerClickPeriod) NEVER NEEDS TO REGENERATE THIS WHEEL - ONLY THE PERIOD TOGGLE'S OWN ACTIVE
        // CLASS CHANGES. THE MATCHING CHIP IS keyed OFF activeHour % 12 (WITH 12 MATCHING 0, SO MIDNIGHT/NOON
        // BOTH CORRECTLY CENTER THE "12" CHIP).
        // HOUR LIMITS ARE WEEKDAY-DEPENDENT (config.time.processedLimits.weekdayLimits) - data-hour12 CHIPS ARE
        // RESOLVED TO A REAL 24H VALUE AGAINST THE CURRENT AM/PM HALF (isPM, ABOVE), MATCHING THE EXACT SAME
        // RESOLUTION EventHandler.resolveHourValueFromChip USES ELSEWHERE FOR THESE CHIPS
        const hourLimits = this.controller.dateManager.getActiveWeekdayHourLimits(config);
        const isHourDisabled = (chipValue) => {
            const realHour = config.time.use12Hour
                ? (chipValue % 12) + (isPM ? 12 : 0)
                : chipValue;
            return realHour < hourLimits[0] || realHour > hourLimits[1];
        };

        let hourValues, activeHourValue, hourDataAttr;
        if (config.time.use12Hour) {
            hourValues = [];
            for (let h12 = 1; h12 <= 12; h12++) hourValues.push({ label: String(h12).padStart(2, '0'), value: h12 });
            activeHourValue = activeHour % 12 === 0 ? 12 : activeHour % 12;
            hourDataAttr = 'data-hour12';
        }
        else {
            hourValues = [];
            for (let h = 0; h <= 23; h++) hourValues.push({ label: String(h).padStart(2, '0'), value: h });
            activeHourValue = activeHour;
            hourDataAttr = 'data-hour';
        }
        const hoursWheel = this.createWheelColumn(`${ccn}_hours_container`, `${ccn}_hour_choice`, `${ccn}_active_hour`, hourDataAttr, hourValues, activeHourValue, `${ccn}_disabled_hour`, isHourDisabled);
        const hoursContainer = hoursWheel.container;

        // MINUTES WHEEL - STEPPED BY config.time.minuteStep (E.G. STEP 15 -> 00/15/30/45). minuteLimits ARE GLOBAL
        // (NOT WEEKDAY-DEPENDENT), SO THIS DISABLED SET IS COMPUTED ONCE HERE AND NEVER REVISITED
        const minuteLimits = config.time.processedLimits.minuteLimits;
        const isMinuteDisabled = (m) => m < minuteLimits[0] || m > minuteLimits[1];

        const minuteValues = [];
        for (let m = 0; m <= 59; m += config.time.minuteStep) minuteValues.push({ label: String(m).padStart(2, '0'), value: m });
        const minutesWheel = this.createWheelColumn(`${ccn}_minutes_container`, `${ccn}_minute_choice`, `${ccn}_active_minute`, 'data-minute', minuteValues, activeMinute, `${ccn}_disabled_minute`, isMinuteDisabled);
        const minutesContainer = minutesWheel.container;

        wheelsRow.appendChild(hoursContainer);

        // CENTER-SELECTION BAND - A STATIC, NON-INTERACTIVE VISUAL ANCHOR FOR "THIS IS THE SELECTED ROW",
        // INDEPENDENT OF THE SCROLL-DRIVEN SCALE EFFECT ON THE CHIPS THEMSELVES
        const centerBand = document.createElement('div');
        centerBand.className = `${ccn}_wheel_center_band`;
        wheelsRow.appendChild(centerBand);

        wheelsRow.appendChild(minutesContainer);
        timeContainer.appendChild(wheelsRow);

        timeWrap.appendChild(timeContainer);

        // NOW THAT THE PANEL IS ATTACHED TO THE LIVE DOCUMENT, getComputedStyle CAN RESOLVE THE INHERITED
        // --calendar-time-wheel-row-height VAR - POSITION BOTH WHEELS SO THEIR ACTIVE VALUE STARTS DEAD-CENTER
        const rowHeight = parseFloat(getComputedStyle(hoursContainer).getPropertyValue('--calendar-time-wheel-row-height'));
        hoursContainer.scrollTop = hoursWheel.homeIndex * rowHeight;
        minutesContainer.scrollTop = minutesWheel.homeIndex * rowHeight;

        this.controller.eventHandler.attachWheelScrollListeners(config, hoursContainer, minutesContainer);
    }

    // RE-EVALUATES WHICH HOUR CHIPS ARE DISABLED WITHOUT REBUILDING ANYTHING (NO DOM REGENERATION, NO SCROLL
    // DISTURBANCE UNLESS THE ACTIVE HOUR ITSELF IS NOW OUT OF RANGE) - CALLED AFTER A DAY CLICK (THE ACTIVE
    // WEEKDAY MAY HAVE CHANGED) AND AFTER AN AM/PM TOGGLE (THE SAME data-hour12 CHIP RESOLVES TO A DIFFERENT REAL
    // HOUR). IF THE CURRENTLY ACTIVE HOUR IS NOW DISABLED, CLAMPS IT TO THE NEAREST BOUND OF THE NEW RANGE, MOVES
    // THE ACTIVE CLASS AND SCROLL POSITION TO THAT CHIP (WITHIN THE SAME WHEEL COPY THE OLD ACTIVE CHIP WAS IN, SO
    // THE JUMP STAYS LOCAL RATHER THAN CROSSING COPIES), AND RE-APPLIES THE TIME CHANGE.
    refreshHourWheelDisabledState(config) {
        const ccn = this.controller.ccn;
        const hoursContainer = config.coreElements?.timeWrap?.querySelector(`.${ccn}_hours_container`);
        if (!hoursContainer) return;

        const hourLimits = this.controller.dateManager.getActiveWeekdayHourLimits(config);
        const disabledClass = `${ccn}_disabled_hour`;
        const activeClass = `${ccn}_active_hour`;
        const children = Array.from(hoursContainer.children);

        let activeIndex = -1;
        children.forEach((chip, index) => {
            const realHour = this.controller.eventHandler.resolveHourValueFromChip(config, chip);
            const isDisabled = realHour < hourLimits[0] || realHour > hourLimits[1];
            chip.classList.toggle(disabledClass, isDisabled);
            if (chip.classList.contains(activeClass)) activeIndex = index;
        });

        if (activeIndex === -1) return;
        const activeChip = children[activeIndex];
        if (!activeChip.classList.contains(disabledClass)) return;

        const clampedHour = Math.max(hourLimits[0], Math.min(hourLimits[1], config.time.handler.activeHour));
        config.time.handler.activeHour = clampedHour;

        const itemsPerCopy = children.length / DOMManager.WHEEL_COPIES;
        const copyStart = Math.floor(activeIndex / itemsPerCopy) * itemsPerCopy;

        let targetChip = null;
        for (let i = copyStart; i < copyStart + itemsPerCopy; i++) {
            if (this.controller.eventHandler.resolveHourValueFromChip(config, children[i]) === clampedHour) {
                targetChip = children[i];
                break;
            }
        }
        if (!targetChip) return;

        activeChip.classList.remove(activeClass);
        targetChip.classList.add(activeClass);

        const rowHeight = parseFloat(getComputedStyle(hoursContainer).getPropertyValue('--calendar-time-wheel-row-height'));
        hoursContainer.scrollTop = children.indexOf(targetChip) * rowHeight;

        const fullValue = this.controller.eventHandler.applyTimeChange(config);
        if (config.time.onSelectHour) {
            config.time.onSelectHour(config.time.handler.activeHour, fullValue, config.inputToAttach);
        }
    }

    // KEEPS THE YEAR-PICKER'S HIGHLIGHTED CHIP IN SYNC WITH config.openCalendar. THE CHIP IS ONLY EVER MARKED
    // ACTIVE AT FIRST RENDER (createAllYearChoices, ABOVE) OR WHEN THE USER MANUALLY PICKS A YEAR FROM THE LIST
    // (EventHandler.handlerClickYear) - EVERY OTHER WAY THE OPEN YEAR CAN CHANGE (ARROW NAV, DRAG, setOpenCalendar,
    // updateYearLimits) NEVER TOUCHED IT, SO E.G. A DRAG THAT CROSSED A YEAR BOUNDARY LEFT THE OLD YEAR HIGHLIGHTED
    // THE NEXT TIME THE PICKER WAS OPENED, EVEN THOUGH THE MONTH BODY WAS ALREADY SHOWING THE NEW YEAR.
    syncActiveYearChip(config) {
        const ccn = this.controller.ccn;
        const yearsWrap = config.coreElements?.yearsWrap;
        if (!yearsWrap) return;

        const activeClass = `${ccn}_active_year`;
        const targetYear = config.openCalendar.getFullYear();
        const currentActive = yearsWrap.querySelector(`.${activeClass}`);
        if (currentActive && parseInt(currentActive.getAttribute('data-year'), 10) === targetYear) return;

        if (currentActive) currentActive.classList.remove(activeClass);
        const targetEl = yearsWrap.querySelector(`[data-year='${targetYear}']`);
        if (targetEl) targetEl.classList.add(activeClass);
    }

    createMobileOverlay() {
        const mobileLayerWrap = document.createElement('div');
        mobileLayerWrap.className = `${this.controller.ccn}_overlay_for_mobile`;
        document.body.appendChild(mobileLayerWrap);
        this.closeElement(mobileLayerWrap);
        return mobileLayerWrap;
    }

    // COVERS THE WHOLE CALENDAR (HEADER, DAY-GRID, YEAR-PICKER, HELPER ROW) WHILE disableCalendar() IS ACTIVE.
    // CREATED ONCE, HIDDEN BY DEFAULT VIA CSS, JUST TOGGLED VISIBLE/HIDDEN AFTERWARDS (NO RE-CREATION)
    createLoaderOverlay(config, outerWrap) {
        const ccn = this.controller.ccn;
        const loaderOverlay = document.createElement('div');
        loaderOverlay.className = `${ccn}_loader_overlay`;

        if (config.disable.overlay.color) {
            loaderOverlay.style.backgroundColor = config.disable.overlay.color;
        }

        if (config.disable.spinner.show) {
            const spinner = document.createElement('span');
            spinner.className = `${ccn}_spinner`;
            if (config.disable.spinner.color) {
                spinner.style.borderTopColor = config.disable.spinner.color;
            }
            loaderOverlay.appendChild(spinner);
        }

        if (config.disable.message) {
            const message = document.createElement('span');
            message.className = `${ccn}_loader_message`;
            message.textContent = config.disable.message;
            loaderOverlay.appendChild(message);
        }

        outerWrap.appendChild(loaderOverlay);
        return loaderOverlay;
    }

    setLoaderVisible(config, visible) {
        const loaderOverlay = config.coreElements?.loaderOverlay;
        if (!loaderOverlay) return;

        const activeClass = `${this.controller.ccn}_loader_active`;
        if (visible) {
            loaderOverlay.classList.add(activeClass);
        } else {
            loaderOverlay.classList.remove(activeClass);
        }
    }

    // VIEWPORT (overflow:hidden window) > TRACK (flex row, translateX'd to reveal one side or the other) >
    // .month_body (the day grid, unchanged class/return contract - every existing querySelector('.month_body')
    // caller keeps working since it's just nested one level deeper now). USED BY slideToMonth/DRAG NAVIGATION.
    createMonthBodyWrapper(wrap) {
        const ccn = this.controller.ccn;

        const viewport = document.createElement('div');
        viewport.className = `${ccn}_month_body_viewport`;
        wrap.appendChild(viewport);

        const track = document.createElement('div');
        track.className = `${ccn}_month_body_track`;
        viewport.appendChild(track);

        const monthBody = document.createElement('div');
        monthBody.className = `${ccn}_month_body`;
        track.appendChild(monthBody);
        return monthBody;
    }

    // SHARED ENTRY POINT FOR INSTANT (NON-DRAG) MONTH NAVIGATION - USED BY navigateMonth (ARROW CLICK /
    // YEAR-SELECT). DISPATCHES ON config.navigation.transition. DRAG NAVIGATION IN EventHandler NEVER CALLS
    // THIS - IT REUSES THE SAME PEEK-GRID/TRACK TECHNIQUE AS 'slide' BUT DRIVES THE TRANSFORM IMPERATIVELY
    // FRAME-BY-FRAME, ALWAYS, REGARDLESS OF THIS SETTING.
    slideToMonth(config, direction) {
        if (config.slide.active) return false; // IGNORE RE-ENTRANT NAV WHILE ONE IS ALREADY ANIMATING

        const [targetMonth, targetYear] = this.controller.dateManager.findTargetMonth(config.openCalendar, direction);
        const transition = config.navigation.transition;

        if (transition === 'none') {
            this._finalizeSlide(config, targetMonth, targetYear, config.coreElements.monthBodyTrack);
            return true;
        }

        if (transition === 'fade') {
            this._fadeToMonth(config, targetMonth, targetYear);
            return true;
        }

        this._animateSlideToMonth(config, direction, targetMonth, targetYear);
        return true;
    }

    // 'slide' MODE - BUILDS A "PEEK" GRID FOR THE ADJACENT MONTH AS A TRACK SIBLING, THEN ANIMATES THE TRACK'S
    // transform TO REVEAL IT.
    _animateSlideToMonth(config, direction, targetMonth, targetYear) {
        const ccn = this.controller.ccn;
        const track = config.coreElements.monthBodyTrack;
        this.pinMonthBodyViewportWidth(config);

        // OPTIMISTICALLY SHOW THE TARGET MONTH/YEAR IN THE HEADER RIGHT AWAY, IN SYNC WITH THE PEEK GRID -
        // OTHERWISE THE HEADER WOULD KEEP SHOWING THE OLD MONTH/YEAR FOR THE WHOLE DURATION OF THE SLIDE
        const header = config.coreElements.calendarWrap.querySelector(`.${ccn}_month_header_title_wrap`);
        if (header) {
            header.innerHTML = this.buildMonthYearHtml(config, targetMonth, targetYear);
        }

        const peek = document.createElement('div');
        peek.className = `${ccn}_month_body`;
        peek.innerHTML = this.buildMonthBodyHtml(config, targetMonth, targetYear, false);

        const goingNext = direction > 0;
        if (goingNext) {
            track.appendChild(peek);
        } else {
            track.insertBefore(peek, track.firstChild);
        }

        config.slide.active = true;
        track.style.transition = 'none';
        track.style.transform = goingNext ? 'translateX(0%)' : 'translateX(-100%)';
        // FORCE A REFLOW SO THE transform WRITE BELOW ACTUALLY ANIMATES INSTEAD OF COALESCING WITH THE ONE ABOVE
        void track.offsetHeight;

        track.style.transition = `transform var(--calendar-slide-duration) var(--calendar-slide-easing)`;
        track.style.transform = goingNext ? 'translateX(-100%)' : 'translateX(0%)';

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            this._finalizeSlide(config, targetMonth, targetYear, track);
        };
        track.addEventListener('transitionend', finish, { once: true });
        setTimeout(finish, 600); // SAFETY NET IN CASE transitionend NEVER FIRES (E.G. ELEMENT HIDDEN MID-FLIGHT)
    }

    // 'fade' MODE - THE PEEK GRID OVERLAYS THE CURRENT ONE (position:absolute, A VIEWPORT CHILD, NOT A TRACK/
    // FLEX SIBLING LIKE 'slide' USES) AND CROSSFADES IN VIA OPACITY. THE TRACK ITSELF IS NEVER TOUCHED UNTIL
    // COMMIT, SO IT COMMITS THROUGH THE EXACT SAME _finalizeSlide 'slide' MODE USES.
    _fadeToMonth(config, targetMonth, targetYear) {
        const ccn = this.controller.ccn;
        const viewport = config.coreElements.monthBodyViewport;
        const track = config.coreElements.monthBodyTrack;

        const header = config.coreElements.calendarWrap.querySelector(`.${ccn}_month_header_title_wrap`);
        if (header) {
            header.innerHTML = this.buildMonthYearHtml(config, targetMonth, targetYear);
        }

        const oldHeight = viewport.getBoundingClientRect().height;

        const peek = document.createElement('div');
        peek.className = `${ccn}_month_body ${ccn}_fade_peek`;
        peek.innerHTML = this.buildMonthBodyHtml(config, targetMonth, targetYear, false);
        viewport.appendChild(peek);

        // THE PEEK IS position:absolute WITH NO bottom (SEE calendar.css) SO ITS HEIGHT IS INTRINSIC TO ITS OWN
        // CONTENT INSTEAD OF STRETCHED TO MATCH THE OLD GRID - BUT THAT MEANS THE VIEWPORT (SIZED OFF THE OLD,
        // STILL IN-FLOW GRID) WOULD CLIP A TALLER PEEK, OR LEAVE VISIBLE GAP UNDER A SHORTER ONE, WHICH READS AS A
        // "DOWN AND UP" BOUNCE ONCE _finalizeSlide SWAPS IN THE REAL (CORRECTLY SIZED) GRID. PIN THE VIEWPORT TO
        // THE TALLER OF THE TWO FOR THE DURATION OF THE FADE SO NEITHER GRID EVER MOVES; unpinMonthBodyViewportHeight
        // LETS IT SPRING BACK TO AUTO ONCE THE REAL GRID IS IN PLACE.
        const peekHeight = peek.getBoundingClientRect().height;
        viewport.style.height = `${Math.max(oldHeight, peekHeight)}px`;

        config.slide.active = true;
        void peek.offsetHeight; // FORCE A REFLOW BEFORE ADDING THE "FADE IN" CLASS SO THE TRANSITION ANIMATES
        peek.classList.add(`${ccn}_fade_in`);

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            this._finalizeSlide(config, targetMonth, targetYear, track);
            this.unpinMonthBodyViewportHeight(config);
            peek.remove();
        };
        peek.addEventListener('transitionend', finish, { once: true });
        setTimeout(finish, 600); // SAFETY NET IN CASE transitionend NEVER FIRES
    }

    // DISCARDS BOTH GRIDS AND RENDERS THE TARGET MONTH FRESH VIA THE ORDINARY, SIDE-EFFECT-PRESERVING
    // createMonthBody - THAT IS WHAT CORRECTLY RESTORES THE activeDate HIGHLIGHT, WHICH A RAW PEEK GRID
    // BUILT VIA buildMonthBodyHtml ALONE NEVER SHOWS (SEE buildMonthBodyHtml's COMMENT)
    _finalizeSlide(config, targetMonth, targetYear, track) {
        config.openCalendar = new Date(targetYear, targetMonth);

        track.style.transition = 'none';
        track.innerHTML = '';
        const fresh = document.createElement('div');
        fresh.className = `${this.controller.ccn}_month_body`;
        track.appendChild(fresh);
        this.createMonthBody(config, fresh);
        track.style.transform = 'translateX(0px)';

        const header = config.coreElements.calendarWrap.querySelector(`.${this.controller.ccn}_month_header_title_wrap`);
        if (header) {
            header.innerHTML = this.returnMonthYear(config);
        }
        this.controller.configManager.arrowsCheckIfNeeded(config);
        this.syncActiveYearChip(config);
        this.rebuildMonthsPicker(config);

        this.unpinMonthBodyViewportWidth(config);
        config.slide.active = false;
        config.slide.dragging = false;
    }

    // PIN THE VIEWPORT TO ITS CURRENT MEASURED PIXEL WIDTH FOR THE DURATION OF A SLIDE/DRAG. WITHOUT THIS, THE
    // TRACK BRIEFLY HOLDING TWO .month_body GRIDS SIDE BY SIDE MAKES THE WHOLE CARD BALLOON TO ROUGHLY DOUBLE
    // WIDTH UNTIL THE EXTRA GRID IS REMOVED - NOTHING IN THE outerWrap->innerCalendar->wrap->viewport CHAIN HAS
    // AN EXPLICIT PIXEL WIDTH (BY DESIGN, SO IT ADAPTS TO CONTENT/THEME), SO THE SHRINK-TO-FIT COMPUTATION FOR
    // THAT CHAIN SEES WHICHEVER CHILD IS WIDEST - NORMALLY ONE MONTH-GRID, BRIEFLY TWO DURING A SLIDE.
    pinMonthBodyViewportWidth(config) {
        const viewport = config.coreElements.monthBodyViewport;
        viewport.style.width = `${viewport.getBoundingClientRect().width}px`;
    }

    unpinMonthBodyViewportWidth(config) {
        config.coreElements.monthBodyViewport.style.width = '';
    }

    // SAME IDEA AS THE WIDTH PIN ABOVE, BUT FOR 'fade' MODE'S HEIGHT - SEE THE COMMENT IN _fadeToMonth.
    unpinMonthBodyViewportHeight(config) {
        config.coreElements.monthBodyViewport.style.height = '';
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

        this.createStaticWeekDaysHeaderOfMonth(config, wrap);
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
        const monthIndex = config.openCalendar.getMonth();
        const year = config.openCalendar.getFullYear();

        config.year.handler.activeYear = year;
        config.month.handler.activeMonth = monthIndex;

        return this.buildMonthYearHtml(config, monthIndex, year);
    }

    // PURE HTML-STRING BUILDER FOR AN ARBITRARY month/year - NO SIDE EFFECTS (UNLIKE returnMonthYear, WHICH ALSO
    // COMMITS config.year.handler.activeYear/config.month.handler.activeMonth). USED TO OPTIMISTICALLY PREVIEW
    // THE TARGET MONTH/YEAR IN THE HEADER WHILE A SLIDE/DRAG IS IN FLIGHT, BEFORE IT'S ACTUALLY COMMITTED.
    buildMonthYearHtml(config, month, year) {
        const ccn = this.controller.ccn;
        let clickableYear = '';
        if (config.clickable && config.year.clickable) {
            clickableYear = `${ccn}_clickable`;
        }

        let clickableMonth = '';
        if (config.clickable && config.month.clickable) {
            clickableMonth = `${ccn}_clickable`;
        }

        const monthName = config.language.months[month];

        return `
            <div class="${ccn}_month_header_title ${clickableMonth}" id="calendar_${config.id}_month" aria-label="Month input">
                <span aria-label="${monthName} ${year}">${monthName}</span>
            </div>
            <div class="${ccn}_year_header_title_wrap">
                <span class="${ccn}_year_header_title ${clickableYear}" id="calendar_${config.id}_year" aria-label="Year input" data-min="${year - this.controller.downLimit}" data-max="${year + this.controller.upLimit}">${year}</span>
            </div>
        `;
    }

    createStaticWeekDaysHeaderOfMonth(config, parentEl) {
        const ccn = this.controller.ccn;
        const monthHeader = document.createElement('div');
        monthHeader.className = `${ccn}_month_header`;
        parentEl.appendChild(monthHeader);

        let htmlForMonthHeader = '';
        for (let weekDay = 0; weekDay < 7; weekDay++) {
            const weekDayStr = config.language.weekDays[weekDay];
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

        parentEl.innerHTML = this.buildMonthBodyHtml(config, month, year, disabledMonth);

        // ADD ACTIVE TO CURRENT DATE IF CALENDAR IS OPENED TO THAT DATE (OTHERWISE ON RE RENDER THE ACTIVE DATE WILL NOT DISPLAY IT)
        if (config.day.handler.activeDate) {
            const activeYear = config.day.handler.activeDate.getFullYear();
            const activeMonth = config.day.handler.activeDate.getMonth();
            const activeDay = config.day.handler.activeDate.getDate();
            const formattedActiveDate = this.controller.dateManager.formatDate(config, activeDay, activeMonth, activeYear);
            const initDateElement = document.querySelector(`#${config.id} [data-date="${formattedActiveDate}"]`);
            if (initDateElement) {
                if (!initDateElement.classList.contains('outofbound')) {
                    this.controller.eventHandler.onClickDayAction(initDateElement, config, false);
                }
                else {
                    initDateElement.classList.add(`${this.controller.ccn}_active_day`);
                }
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

    // PURE HTML-STRING BUILDER FOR AN ARBITRARY month/year (NOT NECESSARILY config.openCalendar'S CURRENT ONE) -
    // USED BY createMonthBody FOR THE REAL CURRENT RENDER, AND BY slideToMonth/DRAG NAVIGATION TO BUILD A
    // TEMPORARY "PEEK" GRID FOR AN ADJACENT MONTH. DELIBERATELY HAS NO SIDE EFFECTS (NO activeDate RESTORE,
    // NO initDate HANDLING) SINCE A PEEK GRID MAY NEVER ACTUALLY GET COMMITTED.
    buildMonthBodyHtml(config, month, year, disabledMonth = false) {
        const countDays = this.controller.dateManager.getNumOfDaysInMonth(month, year);

        const first_day = this.controller.dateManager.getFirstDayOfMonth(month, year);
        const start_day = (first_day - config.rules.weekStartDay + 7) % 7;

        const prev_month = new Date(year, month, 0);
        let htmlForMonthBody = this.startDaysOfMonthFromCorrectWeekDay(config, start_day, { prev_month });

        // ADD CUSTOM CLASS TO DAY
        const customClasses = this.controller.configManager.getCustomDayClasses(config);

        const ccn = this.controller.ccn;
        for (let day = 1; day <= countDays; day++) {
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

                if (!exists) currentDayClass = ` ${ccn}_disabled_day`;
            }

            let data = '';
            let clickableClassData = '';
            let restData = '';

            if (config.clickable && config.day.clickable) {
                clickableClassData = `${ccn}_clickable`;
                restData = `aria-checked="false"`;
            }

            let rangeClass = '';
            if (config.day.rangeSelect) {
                const rangeDesc = this.controller.dateManager.getRangeDescriptorForDate(config, currDay);
                if (rangeDesc.inRange) rangeClass += ` ${ccn}_in_range_day`;
                if (rangeDesc.isStart) rangeClass += ` ${ccn}_range_start_day`;
                if (rangeDesc.isEnd) rangeClass += ` ${ccn}_range_end_day`;
            }

            const formattedDate = this.controller.dateManager.formatDate(config, day, month, year);
            const fullDateAttr = this.controller.dateManager.formatFullDateAttrString(currDay);
            data = `class="${ccn}_day ${clickableClassData}${customClasses}${currentDayClass}${rangeClass}" data-day="${day}" data-date="${formattedDate}" data-full-date="${fullDateAttr}" aria-label="${day} ${this.controller.dateManager.monthsForUse[month]} ${year}" ${restData}`;

            htmlForMonthBody += `
                <span ${data} >
                ${day}
                    </span>
            `;
        }

        // ALWAYS FILLS OUT TO A FULL 6 ROWS (42 CELLS), NOT JUST TO THE END OF THE LAST PARTIAL WEEK - THE GRID
        // HAS NO grid-template-rows, SO ITS HEIGHT IS PURELY "HOWEVER MANY ROWS OF CELLS EXIST", AND A GIVEN
        // MONTH ONLY EVER NEEDS 4-6 ROWS DEPENDING ON ITS DAY COUNT/STARTING WEEKDAY - WITHOUT THIS, THE WHOLE
        // CARD VISIBLY GREW/SHRANK NAVIGATING BETWEEN MONTHS. THIS TRAILING FILL IS RENDERED AS REAL, FADED
        // NEXT-MONTH DAYS VIA forceShow=true, BYPASSING config.rules.displayNextMonth - A BLANK-CELL VERSION OF
        // THIS WAS TRIED FIRST, BUT LEFT AN UGLY EMPTY GAP UNDER SHORTER MONTHS; SHOWING REAL DAYS (LIKE A
        // TYPICAL MONTH-VIEW CALENDAR) FILLS THE SAME SPACE WITH SOMETHING MEANINGFUL INSTEAD. NOTE THIS MEANS
        // displayNextMonth: false NO LONGER FULLY SUPPRESSES NEXT-MONTH DAYS - IT ONLY GOVERNED THE "COMPLETE THE
        // LAST PARTIAL WEEK" PORTION BEFORE THIS CHANGE, AND FORCING JUST THAT PORTION WHILE LEAVING THE NEWLY-
        // ADDED EXTRA ROWS BLANK WOULD'VE LOOKED INCONSISTENT (BLANK THEN REAL WITHIN THE SAME TRAILING RUN).
        const trailingCellsNeeded = 42 - start_day - countDays;
        const next_month = new Date(year, month + 2, 0);
        htmlForMonthBody += this.startDaysOfMonthFromCorrectWeekDay(config, trailingCellsNeeded, { next_month }, true);

        return htmlForMonthBody;
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
        buttonToToday.innerText = config.language.todayButtonText;
        wrapButtonToToday.appendChild(buttonToToday);
    }

    // TIME TRIGGER ROW - OPENS THE TIME PANEL (SEE createTimeWrap/createTimeChoices). DELIBERATELY ITS OWN ROW
    // APPENDED TO wrap (NOT INSIDE calendar_vfz_wrap_helper/createWrapHelper ABOVE) - THAT HELPER LAYER IS A
    // z-index:-1, HOVER-ONLY-REVEAL CONTAINER BUILT SPECIFICALLY FOR THE "TODAY" BUTTON'S PEEK-UP ANIMATION,
    // WHICH WOULD MAKE A PRIMARY, ALWAYS-NEEDED CONTROL LIKE THE TIME TRIGGER INVISIBLE BY DEFAULT (WORSE STILL
    // ON TOUCH DEVICES WITH NO HOVER AT ALL). NEVER BUILT IN RANGE-SELECT MODE - SAME GATING AS THE PANEL ITSELF.
    createTimeTriggerRow(config, wrap) {
        if (!(config.clickable && config.time.enabled && !config.day.rangeSelect)) return null;

        const ccn = this.controller.ccn;
        const wrapTimeTrigger = document.createElement('div');
        wrapTimeTrigger.className = `${ccn}_time_trigger_wrap`;
        wrap.appendChild(wrapTimeTrigger);

        const timeTrigger = document.createElement('span');
        timeTrigger.className = `${ccn}_time_trigger`;
        timeTrigger.textContent = this.controller.dateManager.formatTime(config, config.time.handler.activeHour, config.time.handler.activeMinute);
        wrapTimeTrigger.appendChild(timeTrigger);

        // NO POINT SHOWING A TIME TRIGGER BEFORE ANY DAY IS ACTIVE - THERE'S NOTHING TO ATTACH THE TIME TO YET
        // (buildFullValueString's config.openCalendar FALLBACK IS FOR THE VALUE-COMPOSITION CASE, NOT FOR
        // DECIDING WHAT'S SHOWN). config.day.handler.activeDate IS ALREADY SET HERE IF initDate:true, SINCE THAT
        // RUNS INSIDE createMonthBody, WHICH THIS IS CALLED RIGHT AFTER. REVEALED BY
        // EventHandler.onClickDayAction ONCE A DAY IS ACTUALLY CLICKED.
        if (!config.day.handler.activeDate) {
            this.closeElement(wrapTimeTrigger);
        }

        return wrapTimeTrigger;
    }

    // forceShow BYPASSES config.rules.displayNextMonth FOR THE TRAILING (next_month) BRANCH ONLY - USED BY
    // buildMonthBodyHtml TO ALWAYS FILL THE GRID OUT TO A FULL 6 ROWS WITH REAL, FADED NEXT-MONTH DAYS RATHER
    // THAN BLANK CELLS (SEE ITS OWN COMMENT), REGARDLESS OF WHETHER displayNextMonth ITSELF IS ON. THE LEADING
    // (prev_month) BRANCH NEVER NEEDS THIS - THE LEADING CELL COUNT IS ALWAYS EXACTLY RIGHT TO ALIGN THE 1ST OF
    // THE MONTH TO ITS WEEKDAY COLUMN, THERE'S NO EQUIVALENT "EXTRA LEADING ROW" CASE TO TOP UP.
    startDaysOfMonthFromCorrectWeekDay(config, firstDayOfMonth, month_obj, forceShow = false) {
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
        }
        else if ((config.rules.displayNextMonth || forceShow) && month_obj.next_month) {
            custom_class = ` ${this.controller.ccn}_next_month_day`;
            count_days = 0;
            month = month_obj.next_month.getMonth();
            year = month_obj.next_month.getFullYear();
            is_for_next_month = true;
            c = -1;
        }
        else {
            let html = '';
            for (let i = 0; i < firstDayOfMonth; i++) {
                html += `<span class="${this.controller.ccn}_day outofbound" data-day="-1" data-date="-1"></span>`;
            }

            return html;
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

            const color_fonts = 'rgba(169, 169, 169,';
            const bg_color_active = 'rgba(0, 114, 9,';
            let use_or_not_fade = config.style.includeFadedDays
                ? `style="color: ${color_fonts} ${color_opacity.toFixed(2)});`
                : '';

            let data_date = data_day != -1 ? this.controller.dateManager.formatDate(config, data_day, month, year) : -1;

            const currDay = new Date(`${year}-${month + 1}-${data_day}`);

            // CORE CHECKS 
            const currentMonthCheck = this.controller.dateManager.compareTwoDates(currDay, new Date());
            const availableDay = this.controller.validatorHandle.validateDateConsideringProccessedLimits(currDay, config.processedLimits);
            const isActiveDay = config.day.handler?.activeDate ? this.controller.dateManager.compareTwoDates(currDay, config.day.handler.activeDate) : null;
            if (isActiveDay) use_or_not_fade += `background-color: ${bg_color_active} ${color_opacity.toFixed(2) / 2});`;

            use_or_not_fade += '"';

            let currentDayClass = '';
            if (currentMonthCheck) currentDayClass += ` ${this.controller.ccn}_current_day`;
            if (!availableDay) currentDayClass += ` ${this.controller.ccn}_disabled_day`;

            let rangeClass = '';
            if (config.day.rangeSelect) {
                const rangeDesc = this.controller.dateManager.getRangeDescriptorForDate(config, currDay);
                if (rangeDesc.inRange) rangeClass += ` ${this.controller.ccn}_in_range_day`;
                if (rangeDesc.isStart) rangeClass += ` ${this.controller.ccn}_range_start_day`;
                if (rangeDesc.isEnd) rangeClass += ` ${this.controller.ccn}_range_end_day`;
            }

            const fullDateAttr = this.controller.dateManager.formatFullDateAttrString(currDay);

            html += `<span class="${this.controller.ccn}_day${custom_class}${currentDayClass}${rangeClass} outofbound" data-day="${data_day}" data-date="${data_date}" data-full-date="${fullDateAttr}" ${use_or_not_fade}>${view_data_day}</span>`;
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

        if (config.coreElements.monthsWrap) {
            config.coreElements.monthsWrap.style.transition = `
                opacity ${config.style.transitions.fadeMonthPicker}ms,
                visibility ${config.style.transitions.fadeMonthPicker}ms,
                transform ${config.style.transitions.fadeMonthPicker}ms
            `;
        }

        if (config.coreElements.monthsFollowCursor) {
            config.coreElements.monthsFollowCursor.style.transition = `
                top ${config.style.transitions.cursorEffectDelay}ms,
                left ${config.style.transitions.cursorEffectDelay}ms,
                opacity 0.1s
            `;
        }

        // REUSES fadeMonthPicker's TIMING RATHER THAN A DEDICATED OPTION - THE TIME PANEL IS THE SAME KIND OF
        // OVERLAY POP AS THE MONTH/YEAR PANELS, NO NEED FOR A THIRD INDEPENDENTLY-NAMED DURATION
        if (config.coreElements.timeWrap) {
            config.coreElements.timeWrap.style.transition = `
                opacity ${config.style.transitions.fadeMonthPicker}ms,
                visibility ${config.style.transitions.fadeMonthPicker}ms,
                transform ${config.style.transitions.fadeMonthPicker}ms
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