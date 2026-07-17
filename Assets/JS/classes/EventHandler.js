class EventHandler {
    constructor(controller) {
        this.controller = controller;

        this.createClickAndHoldEvent();
    }

    createClickAndHoldEvent() {
        this._clckHold = {};
        this.ClickAndHold = (selectorTarget, callback) => {
            this._clckHold.calWrapSelector = `.input_${this.controller.ccn}_outer_wrap`;
            this._clckHold.selectorTarget = selectorTarget;
            this._clckHold.callback = callback;
            this._clckHold.isHeld = false;
            this._clckHold.activeHoldTimeoutID = null;

            ['mousedown', 'touchstart'].forEach(type => {
                document.addEventListener(type, this._clckHold.onHoldStart.bind(this));
            });

            ['mouseup', 'mouseleave', 'mouseout', 'touchend', 'touchcancel'].forEach(type => {
                document.addEventListener(type, this._clckHold.onHoldEnd.bind(this));
            });
        }

        this._clckHold.onHoldStart = (event) => {
            const wrapEl = event.target.closest(this._clckHold.calWrapSelector);
            const clickedEl = event.target.closest(this._clckHold.selectorTarget);
            if (!clickedEl) return;

            if (this._clckHold.activeHoldTimeoutID) {
                clearTimeout(this._clckHold.activeHoldTimeoutID);
                this._clckHold.activeHoldTimeoutID = null;
            }
            if (this._clckHold.immediateTimeoutID) {
                clearTimeout(this._clckHold.immediateTimeoutID);
                this._clckHold.immediateTimeoutID = null;
            }

            this._clckHold.isHeld = true;

            this._clckHold.immediateTimeoutID = setTimeout(() => {
                if (this._clckHold.isHeld) {
                    this._clckHold.callback.call(this, wrapEl, event);
                }
            }, 50);

            const holdCallback = () => {
                if (this._clckHold.isHeld) {
                    this._clckHold.callback.call(this, wrapEl, event);
                    this._clckHold.activeHoldTimeoutID = setTimeout(holdCallback, 150);
                }
            };

            this._clckHold.activeHoldTimeoutID = setTimeout(holdCallback, 300);
        }

        this._clckHold.onHoldEnd = () => {
            this._clckHold.isHeld = false;
            clearTimeout(this._clckHold.activeHoldTimeoutID);
        }
    }

    // CORE EVENT LISTENER FOR OPENING/CLOSING THE CALENDAR
    handleInputsBehaviorWithCalendarElement(config) {
        const targetInput = config.inputToAttach;

        if (!config.functionsHandler) {
            config.functionsHandler = {};
        }

        config.functionsHandler._calendarClickHandler = (event) => {
            const isTargetInput = event.target === targetInput;
            const isInsideCalendar = config.coreElements.calendarWrap.contains(event.target);

            if (isTargetInput) {
                // ONLY THE 'blockOpen' BEHAVIOR PREVENTS OPENING WHILE DISABLED - THE DEFAULT 'allowOpenNoAction'
                // STILL OPENS THE CALENDAR (SHOWING THE LOADER OVERLAY), IT JUST BLOCKS NAV/YEAR/DAY ACTIONS.
                // "CLICK OUTSIDE CLOSES" BELOW STAYS UNGUARDED EITHER WAY, SO AN ALREADY-OPEN CALENDAR CAN
                // ALWAYS BE DISMISSED WHILE DISABLED, RATHER THAN TRAPPING THE UI
                if (config.disabled && config.disable.behavior === 'blockOpen') return;

                if (targetInput.tagName.toLowerCase() == 'select') {
                    this.initSelectActionsOnOpenCloseCalendar(targetInput);
                }
                if (targetInput.tagName.toLowerCase() == 'button') {
                    targetInput.disabled = true;
                }
                this.controller.domManager.openElement(config.coreElements.calendarWrap);
                this.controller.domManager.openElement(config.coreElements.calendarInnerWrap);
                this.controller.domManager.openElement(config.coreElements.mobileLayerWrap);

                addCalendarToPosAndfixPosIfNeeded(targetInput, config.coreElements.calendarWrap);
            }
            else if (!isInsideCalendar) {
                this.controller.domManager.closeAllCoreElements(config);
            }
        };

        config.functionsHandler._calendarResizeHandler = (event) => {
            addCalendarToPosAndfixPosIfNeeded(targetInput, config.coreElements.calendarWrap);
        }

        // DISPLAY FIELD ON FOCUS AND HIDE IT IF NEEDED - OPTIMIZED CODE AI
        document.addEventListener('click', config.functionsHandler._calendarClickHandler);
        window.addEventListener('resize', config.functionsHandler._calendarResizeHandler);

        // PREVENT HIDE CALENDAR IF CLICKING INSIDE IT (ITS ELEMENTS) **REMOVED BECAUSE THERE IS ONE LISTENER GENERALLY AND IT WAS IN CONFLICT**
        // calendarWrap.addEventListener('click', (e) => e.stopPropagation());

        const addCalendarToPosAndfixPosIfNeeded = (targetInput, calendarWrap) => {
            // ADD CALENDAR TO THE CORRECT POSITION, IF NOT MOBILE
            const rect = targetInput.getBoundingClientRect();
            calendarWrap.style.top = `${rect.bottom + window.scrollY}px`;
            calendarWrap.style.left = `${rect.left + window.scrollX}px`;

            // 
            if (!calendarWrap.classList.contains(`${this.controller.ccn}_close_status`)) {
                const leftPosOfWrap = parseInt(calendarWrap.style.left);
                const widthOfWrap = calendarWrap.getBoundingClientRect().width;
                const sum = leftPosOfWrap + widthOfWrap;
                if (sum > window.innerWidth) {
                    const diff = sum - window.innerWidth;

                    calendarWrap.style.left = `${leftPosOfWrap - diff}px`;
                }
            }
        }
    }

    removePreviousCalendarEventListeners(config) {
        if (config.functionsHandler) {
            if (config.functionsHandler._calendarClickHandler) {
                document.removeEventListener('click', config.functionsHandler._calendarClickHandler);
                // console.log(config.functionsHandler);
                config.functionsHandler._calendarClickHandler = null;
            }
            
            if (config.functionsHandler._calendarResizeHandler) {
                document.removeEventListener('resize', config.functionsHandler._calendarResizeHandler);
                // console.log(config.functionsHandler);
                config.functionsHandler._calendarResizeHandler = null;
            }
        }
    }

    removeDayEventListener(config) {
        const calendarBody = document.querySelector(`#${config.id} .${this.controller.ccn}_month_body`);

        if (calendarBody) {
            // REMOVE PREVIOUSLY calendarBody ENTIRELY (AND ITS ATTACHED LISTENERS), THE RE-RENDER THE MONTH
            calendarBody.innerHTML = '';
            calendarBody.dataset.listenerAdded = "";
        }
    }

    // THIS IS IMPORTANT TO ENSURE THAT NO DUPLICATE LISTENERS WILL BE ADDED
    setupEventDelegation() {
        // this.ClickAndHold(`.input_${this.controller.ccn}_nav_arrow`, this.handlerClickArrowsNav);

        document.addEventListener('click', (event) => {
            this.clickEventsDelegation(event);
        });

        ['mouseover', 'mouseout'].forEach(type => {
            document.addEventListener(type, (event) => {
                this.hoverEventsDelegation(event);
            });
        });

        Calendar_Controller.domReadyPromise.then(() => {
            const ccn = this.controller.ccn;
            const observer = new MutationObserver(() => {
                const cursorEl = document.querySelector(`.input_${ccn}_outer_wrap .${ccn}_cursor_to_follow`);
                // console.log(cursorEl);
                if (cursorEl) {
                    if (!this.controller.mousemoveListenerAdded) {
                        this.controller.mouseMoveEventsDelegation = (event) => {
                            this.handleMouseMove(event);
                        };
                        document.addEventListener('pointermove', this.controller.mouseMoveEventsDelegation, { once: true });
                        this.controller.mousemoveListenerAdded = true;
                    }
                    observer.disconnect();
                }
            });

            const calendar_root = document.querySelector(`.input_${ccn}_outer_wrap`);
            observer.observe(calendar_root, { childList: true, subtree: true });
        });
    }

    clickEventsDelegation(event) {
        const clickedEl = event.target.closest(`.input_${this.controller.ccn}_outer_wrap`);
        if (!clickedEl) return;

        // BLOCKS ARROW-NAV/YEAR-NAV/YEAR-SELECT/DAY-SELECT ALL AT ONCE WHILE disableCalendar() IS ACTIVE
        const config = this.controller.configManager.getConfigById(clickedEl.id);
        if (config?.disabled) return;

        // EVENT LISTENERS FOR NAVIGATING MONTHS
        this.handlerClickArrowsNav(clickedEl, event);
        // EVENT LISTENERS FOR NAVIGATING TO YEARS
        this.handlerClickYearToNav(clickedEl, event);
        // EVENT LISTENERS FOR SELECTING YEARS
        this.handlerClickYear(clickedEl, event);
        // EVENT LISTENERS FOR SELECTING DAYS
        this.handlerClickDay(event);
    }

    // DELEGATED HOVER LISTENER - ONLY DOES WORK FOR CALENDARS MID RANGE-SELECTION (rangeState === 'selecting')
    hoverEventsDelegation(event) {
        const clickedEl = event.target.closest(`.input_${this.controller.ccn}_outer_wrap`);
        if (!clickedEl) return;
        this.handlerHoverDay(clickedEl, event);
    }

    handlerHoverDay(clickedEl, event) {
        const ccn = this.controller.ccn;
        const config = this.controller.configManager.getConfigById(clickedEl.id);
        if (!config || config.disabled || !config.day.rangeSelect || config.day.handler.rangeState !== 'selecting') return;

        if (event.type === 'mouseout') {
            const stillInsideCalendar = event.relatedTarget && clickedEl.contains(event.relatedTarget);
            if (!stillInsideCalendar) this.clearRangePreview(config);
            return;
        }

        const hoveredDayEl = event.target.closest(`.${ccn}_day`);
        if (!hoveredDayEl || hoveredDayEl.getAttribute('data-day') === '-1') return;

        const fullDateStr = hoveredDayEl.getAttribute('data-full-date');
        if (!fullDateStr) return;

        const dm = this.controller.dateManager;
        const hoveredDate = dm.parseFullDateAttrString(fullDateStr);
        const previewEnd = dm.getEffectiveRangeEnd(config, config.day.handler.rangeStart, hoveredDate);

        this.applyRangePreview(config, previewEnd);
    }

    clearRangePreview(config) {
        const ccn = this.controller.ccn;
        const monthBody = document.querySelector(`#${config.id} .${ccn}_month_body`);
        if (!monthBody) return;

        monthBody.querySelectorAll(`.${ccn}_in_range_day, .${ccn}_range_start_day, .${ccn}_range_end_day`).forEach(el => {
            el.classList.remove(`${ccn}_in_range_day`, `${ccn}_range_start_day`, `${ccn}_range_end_day`);
        });
    }

    applyRangePreview(config, previewEnd) {
        const ccn = this.controller.ccn;
        const dm = this.controller.dateManager;
        const monthBody = document.querySelector(`#${config.id} .${ccn}_month_body`);
        if (!monthBody) return;

        monthBody.querySelectorAll(`.${ccn}_day`).forEach(dayEl => {
            if (dayEl.getAttribute('data-day') === '-1') return;

            const fullDateStr = dayEl.getAttribute('data-full-date');
            if (!fullDateStr) return;

            const dayDate = dm.parseFullDateAttrString(fullDateStr);
            const desc = dm.getRangeDescriptorForDate(config, dayDate, previewEnd);

            dayEl.classList.remove(`${ccn}_in_range_day`, `${ccn}_range_start_day`, `${ccn}_range_end_day`);
            if (desc.inRange) dayEl.classList.add(`${ccn}_in_range_day`);
            if (desc.isStart) dayEl.classList.add(`${ccn}_range_start_day`);
            if (desc.isEnd) dayEl.classList.add(`${ccn}_range_end_day`);
        });
    }

    // CORE EVENT LISTENER FOR NAVIGATING MONTHS
    handlerClickArrowsNav(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedAnArrow = event.target.closest(`.input_${ccn}_nav_arrow`);
        if (!clickedAnArrow) return;
        if (clickedAnArrow.classList.contains(`${ccn}_disable_arrow`)) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        let navDirection = -1;
        if (clickedAnArrow.name === 'right_arrow') {
            navDirection = 1;
        }

        this.navigateMonth(config, navDirection);
    }

    // TRIGGERS WHEN USER CLICKS ARROWS TO GO TO THE NEXT OR THE PREVIOUS MONTH
    navigateMonth(config, direction) {
        const [newMonth, newYear] = this.controller.dateManager.findTargetMonth(config.openCalendar, direction);
        const limits = config.processedLimits;

        // ENSURE THE YEAR STAYS WITHIN THE PROCESSED LIMITS
        if (newYear < limits.minYear || newYear > limits.maxYear) return;

        // OPTIONALLY ENSURE THE MONTH STAYS WITHIN THAT YEAR'S PROCESSED LIMITS
        if (config.navigation.respectMonthLimits) {
            const yearLimits = limits.years[newYear];
            if (!yearLimits || newMonth < yearLimits.months.minMonth || newMonth > yearLimits.months.maxMonth) return;
        }

        // PROCEED TO UPDATE THE CALENDAR WITH THE NEW MONTH
        const newDate = new Date(newYear, newMonth);
        config.openCalendar = newDate;  // UPDATE THE CALENDAR WITH THE NEW DATE

        this.rerenderMonthAndHeader(config);
    }

    // TARGETED RE-RENDER OF THE HEADER + DAY-GRID FOR WHATEVER config.openCalendar CURRENTLY IS -
    // REUSED BY navigateMonth AND BY THE PROGRAMMATIC NAVIGATION/LIMITS-UPDATE PUBLIC FUNCTIONS
    rerenderMonthAndHeader(config) {
        this.removeDayEventListener(config);

        const ccn = this.controller.ccn;
        const calendarElement = config.coreElements.calendarWrap;

        const monthBody = calendarElement.querySelector(`.${ccn}_month_body`);
        const header = calendarElement.querySelector(`.${ccn}_month_header_title_wrap`);

        // RE-RENDER THE MONTH BODY AND HEADER
        if (monthBody) {
            this.controller.domManager.createMonthBody(config, monthBody);
        }
        if (header) {
            header.innerHTML = this.controller.domManager.returnMonthYear(config);
            // UPDATE THE ARROWS' VISIBILITY BASED ON NEXT/PREVIOUS MONTH VALIDITY
            this.controller.configManager.arrowsCheckIfNeeded(config);
        }
    }

    // CORE EVENT LISTENER FOR NAVIGATING TO YEARS
    handlerClickYearToNav(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedYear = event.target.closest(`.${ccn}_year_header_title.${ccn}_clickable`);
        if (!clickedYear) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        const yearsWrap = document.querySelector(`#${config.id} .${ccn}_years_wrap`);

        if (!yearsWrap) return;

        const currentYearEl = yearsWrap.querySelector(`[data-year='${config.openCalendar.getFullYear()}']`);

        // ALWAYS SCROLL INTO CURRENT CHOSEN YEAR VIEW
        yearsWrap.classList.toggle(`${ccn}_close_status`);
        // IF RENDER, SCROLL INTO VIEW
        if (!yearsWrap.classList.contains(`${ccn}_close_status`)) {
            requestAnimationFrame(() => {
                const yearsWrapHeight = yearsWrap.clientHeight;
                const currentYearElHeight = currentYearEl.clientHeight;

                const currentYearElOffsetTop = currentYearEl.offsetTop;
                const currentYearElCenter = currentYearElOffsetTop + (currentYearElHeight / 2);

                const yearsWrapCenter = yearsWrap.scrollTop + (yearsWrapHeight / 2);

                const scrollToPosition = currentYearElCenter - yearsWrapHeight / 2;

                yearsWrap.scrollTo({
                    top: scrollToPosition,
                    behavior: "smooth"
                });
            });
        }
    }

    // CORE EVENT LISTENER FOR SELECTING YEARS
    handlerClickYear(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedYearWrap = event.target.closest(`.${ccn}_years_wrap`);
        if (!clickedYearWrap) return;

        const clickedYear = event.target.closest(`.${ccn}_year`);
        if (!clickedYear) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        const currentYear = config.openCalendar.getFullYear();
        const targetYear = clickedYear.getAttribute('data-year');
        const navDirection = (targetYear - currentYear) * 12;

        if (navDirection) {
            this.navigateMonth(config, navDirection);
        }

        const activeClass = `${ccn}_active_year`;
        clickedYearWrap.querySelector(`.${activeClass}`).classList.remove(activeClass);
        clickedYear.classList.add(activeClass);
        setTimeout(() => {
            clickedYearWrap.classList.toggle(`${ccn}_close_status`);
        }, 100);
    }

    // CORE EVENT LISTENER FOR SELECTING DAYS
    handlerClickDay(event) {
        const ccn = this.controller.ccn;
        const clickedEl = event.target.closest(`.${ccn}_day.${ccn}_clickable`);
        if (!clickedEl) return;
        if (clickedEl.classList.contains(`${this.controller.ccn}_disabled_day`)) return;

        const pickedNumDay = clickedEl.getAttribute('data-day');

        if (pickedNumDay && parseInt(pickedNumDay, 10) !== -1) {
            const config = this.controller.configManager.getConfigFromClickedEl(clickedEl);

            if (config.day.rangeSelect) {
                this.handlerClickDayRangeMode(clickedEl, config);
                return;
            }

            if (config.day.handler.currentDay !== clickedEl.getAttribute('data-day')) {
                // CORE FUNCTIONALITY
                this.onClickDayAction(clickedEl, config);
            }
            else {
                if (config.day.reClickable) {
                    // CORE FUNCTIONALITY
                    this.onClickDayAction(clickedEl, config);
                }
            }
        }
    }

    // CORE EVENT LOGIC FOR RANGE-SELECT MODE: 1ST CLICK STARTS/RESTARTS A RANGE, 2ND CLICK FINALIZES IT
    handlerClickDayRangeMode(clickedEl, config) {
        const dm = this.controller.dateManager;
        const handler = config.day.handler;
        const clickedDate = dm.parseFullDateAttrString(clickedEl.getAttribute('data-full-date'));

        if (handler.rangeState !== 'selecting') {
            // IDLE OR COMPLETE -> (RE)START A FRESH RANGE (COVERS "3RD CLICK DISCARDS THE OLD RANGE")
            handler.rangeStart = clickedDate;
            handler.rangeEnd = null;
            handler.rangeState = 'selecting';
            // TARGETED CLASS UPDATE ONLY - NEVER REPLACE THE DOM HERE, IT WOULD DETACH clickedEl (== event.target)
            // BEFORE THE SEPARATE "CLICK OUTSIDE CLOSES THE CALENDAR" LISTENER RUNS FOR THIS SAME CLICK EVENT,
            // MAKING IT WRONGLY THINK THE CLICK WAS OUTSIDE THE CALENDAR AND CLOSE IT
            this.applyRangePreview(config, null);
            return;
        }

        // SECOND CLICK -> FINALIZE, SNAPPED TO A VALID LENGTH AND TRUNCATED AT ANY DISABLED-DAY BOUNDARY
        const effectiveEnd = dm.getEffectiveRangeEnd(config, handler.rangeStart, clickedDate);
        const [lo, hi] = dm.sortDates(handler.rangeStart, effectiveEnd);
        handler.rangeStart = lo;
        handler.rangeEnd = hi;
        handler.rangeState = 'complete';

        this.applyRangePreview(config, null);

        const [startStr, endStr, rangeInfo] = dm.rangeClickCoreFunctionality(config, lo, hi);
        if (config.day.onRangeSelect) {
            config.day.onRangeSelect(startStr, endStr, rangeInfo, clickedEl, config.inputToAttach);
        }

        // CLOSE CALENDAR ON RANGE COMPLETE, IF OPTION IS ACTIVE
        if (config.day.closeOnClickDay) {
            setTimeout(() => {
                this.controller.domManager.closeAllCoreElements(config);
            }, 100);
        }
    }

    onClickDayAction(clickedEl, config, runAllFunctions = true) {
        this.controller.dateManager.clickDayCoreFunctionality(clickedEl, config);

        // HERE ADD THE CUSTOM EVENT LISTENER FROM THE USER
        if (config.day.onClickDay && runAllFunctions) {
            config.day.onClickDay(clickedEl.getAttribute('data-date'), clickedEl, config.inputToAttach);
        }


        // CLOSE CALENDAR ON CLICK, IF OPTION IS ACTIVE
        if (config.day.closeOnClickDay && runAllFunctions) {
            setTimeout(() => {
                this.controller.domManager.closeAllCoreElements(config);
            }, 100);
        }
    }


    // ON POINTER MOVE, FOLLOW LISTENER
    handleMouseMove(event) {
        const ccn = this.controller.ccn;
        const cursorEl = document.querySelector(`.input_${ccn}_outer_wrap .${ccn}_cursor_to_follow`);
        if (!cursorEl) {
            document.removeEventListener('pointermove', this.controller.mouseMoveEventsDelegation);
            return;
        }

        const hoveredPicker = event.target.closest(`.input_${ccn}_outer_wrap`);
        if (!hoveredPicker) return;

        this.handlerMousemoveYear(hoveredPicker, event);
    }

    handlerMousemoveYear(hoveredPicker, event) {
        const ccn = this.controller.ccn;
        const yearContainerEl = event.target.closest(`.${ccn}_years_container`);

        const config = this.controller.configManager.getConfigById(hoveredPicker.id);

        const cursorEl = document.querySelector(`#${config.id} .${ccn}_cursor_to_follow`);
        if (!cursorEl) return;

        cursorEl.style.opacity = '0';
        cursorEl.style.visibility = 'hidden';
        if (!yearContainerEl) return;
        cursorEl.style.opacity = '0.8';
        cursorEl.style.visibility = 'visible';


        const { top, left } = yearContainerEl.getBoundingClientRect();

        const offsetX = event.clientX - left;
        const offsetY = event.clientY - top;

        requestAnimationFrame(() => {
            cursorEl.style.top = `${offsetY}px`;
            cursorEl.style.left = `${offsetX}px`;
        });
    }

    initSelectActionsOnOpenCloseCalendar(targetInput) {
        targetInput.disabled = true;
    }

    setSelectValueQuietly(selectElement, value) {
        const matchingOption = selectElement.querySelector(`option[value="${value}"]`);

        if (matchingOption) {
            Array.from(selectElement.options).forEach(opt => opt.selected = false);

            matchingOption.selected = true;

            selectElement.value = value;

            selectElement.dispatchEvent(new Event('change', { bubbles: true }));

            return true;
        }
        return false;
    }
}