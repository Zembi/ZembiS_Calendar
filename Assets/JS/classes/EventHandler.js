class EventHandler {
    constructor(controller) {
        this.controller = controller;

        // DRAG-TO-NAVIGATE STATE - LIVES HERE (NOT PER-CONFIG) SINCE ONLY ONE POINTER GESTURE CAN BE
        // PHYSICALLY ACTIVE AT A TIME REGARDLESS OF HOW MANY CALENDARS EXIST ON THE PAGE
        this._activeDrag = null;
        this._suppressNextClick = false;

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
            // SUPPRESSES THE SYNTHESIZED click THAT FOLLOWS A REAL/ATTEMPTED DRAG (SET IN handlePointerUp) -
            // WITHOUT THIS, A DRAG WHOSE RELEASE POINT ENDS UP OUTSIDE calendarWrap WOULD LOOK LIKE A GENUINE
            // "CLICK OUTSIDE" AND CLOSE THE CALENDAR, REGARDLESS OF closeOnClickDay
            if (this._suppressNextClick) return;

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

            // scroll DOESN'T BUBBLE, SO THESE WERE ATTACHED DIRECTLY TO THE WHEEL COLUMNS THEMSELVES (SEE
            // attachWheelScrollListeners) RATHER THAN THE DOCUMENT-LEVEL DELEGATED PATTERN EVERYTHING ELSE USES
            const ccn = this.controller.ccn;
            const timeWrap = config.coreElements?.timeWrap;
            if (config.functionsHandler._hoursWheelScroll && timeWrap) {
                const hoursContainer = timeWrap.querySelector(`.${ccn}_hours_container`);
                if (hoursContainer) hoursContainer.removeEventListener('scroll', config.functionsHandler._hoursWheelScroll);
                config.functionsHandler._hoursWheelScroll = null;
            }
            if (config.functionsHandler._minutesWheelScroll && timeWrap) {
                const minutesContainer = timeWrap.querySelector(`.${ccn}_minutes_container`);
                if (minutesContainer) minutesContainer.removeEventListener('scroll', config.functionsHandler._minutesWheelScroll);
                config.functionsHandler._minutesWheelScroll = null;
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

        // DRAG-TO-NAVIGATE MONTHS - POINTER EVENTS UNIFY MOUSE+TOUCH IN ONE CODE PATH
        document.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
        document.addEventListener('pointermove', (event) => this.handlePointerMove(event), { passive: false });
        ['pointerup', 'pointercancel'].forEach(type => {
            document.addEventListener(type, (event) => this.handlePointerUp(event));
        });

        // YEAR-PICKER CURSOR-FOLLOW EFFECT - A NORMAL ALWAYS-ON DELEGATED LISTENER LIKE THE OTHERS ABOVE.
        // handlerMousemoveYear ALREADY SCOPES TO WHICHEVER CALENDAR IS CURRENTLY HOVERED AND NO-OPS CORRECTLY
        // IF THAT CALENDAR HAS NO cursor_to_follow ELEMENT, SO NO SPECIAL SETUP/TEARDOWN IS NEEDED HERE
        document.addEventListener('pointermove', (event) => this.handleMouseMove(event));
    }

    clickEventsDelegation(event) {
        // SUPPRESSES THE SYNTHESIZED click THAT FOLLOWS A REAL DRAG (SET IN handlePointerUp) - A FLAG CHECK,
        // NOT A DOM CHANGE, SO IT CAN NEVER DETACH event.target BEFORE OTHER LISTENERS FOR THIS SAME CLICK RUN.
        // DELIBERATELY DOESN'T RESET THE FLAG HERE - _calendarClickHandler (A SEPARATE, PER-CALENDAR click
        // LISTENER) ALSO NEEDS TO SEE IT FOR THIS SAME EVENT; handlePointerUp CLEARS IT ON THE NEXT TICK INSTEAD
        if (this._suppressNextClick) return;

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
        // EVENT LISTENERS FOR NAVIGATING TO MONTHS
        this.handlerClickMonthToNav(clickedEl, event);
        // EVENT LISTENERS FOR SELECTING MONTHS
        this.handlerClickMonth(clickedEl, event);
        // EVENT LISTENERS FOR NAVIGATING TO / SELECTING TIME
        this.handlerClickTimeToNav(clickedEl, event);
        this.handlerClickHour(clickedEl, event);
        this.handlerClickMinute(clickedEl, event);
        this.handlerClickPeriod(clickedEl, event);
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
        if (!config || config.disabled || config.slide?.active || !config.day.rangeSelect || config.day.handler.rangeState !== 'selecting') return;

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

    // DRAG-TO-NAVIGATE: POINTERDOWN JUST RECORDS THE START POSITION - NOTHING MOVES YET, SO A PLAIN TAP STILL
    // FALLS THROUGH TO THE ORDINARY click-TO-SELECT PATH UNTOUCHED
    handlePointerDown(event) {
        const viewportEl = event.target.closest(`.${this.controller.ccn}_month_body_viewport`);
        if (!viewportEl) return;

        const outerWrapEl = event.target.closest(`.input_${this.controller.ccn}_outer_wrap`);
        const config = outerWrapEl ? this.controller.configManager.getConfigById(outerWrapEl.id) : null;
        if (!config || config.disabled || !config.clickable || !config.navigation.dragToNavigate) return;
        if (config.slide.active) return; // DON'T START A NEW GESTURE WHILE ONE IS ALREADY ANIMATING
        if (this._activeDrag) return; // DON'T LET A STRAY SECOND POINTERDOWN (E.G. A SECOND TOUCH) STOMP ONE IN PROGRESS

        this._activeDrag = {
            config,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            viewportEl,
            resolvedAxis: false,
            dragging: false,
            // TRUE THE MOMENT THE POINTER MOVES PAST THE TAP SLOP, REGARDLESS OF WHETHER THE GESTURE GOES ON TO
            // BE ACCEPTED AS A SLIDE OR REJECTED (VERTICAL / DISABLED DIRECTION) - SEE handlePointerUp
            movedPastSlop: false,
        };
    }

    handlePointerMove(event) {
        const drag = this._activeDrag;
        if (!drag || event.pointerId !== drag.pointerId) return;

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        if (!drag.resolvedAxis) {
            if (Math.hypot(dx, dy) < 10) return; // TAP-VS-DRAG SLOP

            drag.resolvedAxis = true;
            drag.movedPastSlop = true;

            if (Math.abs(dy) >= Math.abs(dx)) {
                // VERTICAL WINS - LET THE PAGE SCROLL NATIVELY, THIS GESTURE ISN'T A SLIDE. DELIBERATELY DON'T
                // NULL this._activeDrag HERE - IT NEEDS TO STAY ALIVE (JUST INERT) SO handlePointerUp STILL SEES
                // movedPastSlop=true AND SUPPRESSES THE TRAILING click INSTEAD OF LETTING IT SELECT/CLOSE
                // WHATEVER HAPPENS TO BE UNDER THE RELEASE POINT
                return;
            }

            const direction = dx < 0 ? 1 : -1; // DRAG LEFT = GO TO NEXT MONTH
            const { prevAvailable, nextAvailable } = this.controller.configManager.computeNavAvailability(drag.config);
            if (direction === 1 ? !nextAvailable : !prevAvailable) {
                // CAN'T DRAG TOWARD A DISABLED DIRECTION - NO VISUAL MOVEMENT FOR THIS GESTURE, BUT (LIKE THE
                // VERTICAL-REJECTION CASE ABOVE) DELIBERATELY DON'T NULL this._activeDrag - IT MUST STAY ALIVE
                // SO handlePointerUp STILL SEES movedPastSlop=true AND SUPPRESSES THE TRAILING click
                return;
            }

            drag.dragging = true;
            drag.direction = direction;
            this.controller.domManager.pinMonthBodyViewportWidth(drag.config);
            drag.widthPx = drag.viewportEl.getBoundingClientRect().width;

            const [targetMonth, targetYear] = this.controller.dateManager.findTargetMonth(drag.config.openCalendar, direction);
            drag.targetMonth = targetMonth;
            drag.targetYear = targetYear;

            // OPTIMISTICALLY SHOW THE TARGET MONTH/YEAR IN THE HEADER, IN SYNC WITH THE PEEK GRID - REVERTED IN
            // handlePointerUp IF THE DRAG ENDS UP CANCELLED (RELEASED SHORT OF THE COMMIT THRESHOLD)
            const headerEl = drag.config.coreElements.calendarWrap.querySelector(`.${this.controller.ccn}_month_header_title_wrap`);
            if (headerEl) {
                headerEl.innerHTML = this.controller.domManager.buildMonthYearHtml(drag.config, targetMonth, targetYear);
            }

            const track = drag.config.coreElements.monthBodyTrack;
            drag.track = track;

            const peek = document.createElement('div');
            peek.className = `${this.controller.ccn}_month_body`;
            peek.innerHTML = this.controller.domManager.buildMonthBodyHtml(drag.config, targetMonth, targetYear, false);
            if (direction === 1) {
                track.appendChild(peek);
            } else {
                track.insertBefore(peek, track.firstChild);
            }
            drag.peekEl = peek;

            drag.basePx = direction === 1 ? 0 : -drag.widthPx;
            track.style.transition = 'none';
            track.style.transform = `translateX(${drag.basePx}px)`;

            drag.config.slide.active = true;
            drag.config.slide.dragging = true;
            drag.config.coreElements.calendarWrap.classList.add(`${this.controller.ccn}_dragging`);
        }

        if (drag.dragging) {
            event.preventDefault(); // SAFE NOW - ONLY AFTER HORIZONTAL-DOMINANCE IS CONFIRMED, NEVER PRE-EMPTIVELY
            drag.pendingClientX = event.clientX;
            if (!drag.rafScheduled) {
                drag.rafScheduled = true;
                requestAnimationFrame(() => this._applyDragFrame(drag));
            }
        }
    }

    _applyDragFrame(drag) {
        drag.rafScheduled = false;
        if (this._activeDrag !== drag) return; // GESTURE ENDED BEFORE THIS FRAME RAN

        const rawDx = drag.pendingClientX - drag.startX;
        const clamped = Math.max(-drag.widthPx, Math.min(drag.widthPx, rawDx));
        const px = Math.max(-drag.widthPx, Math.min(0, drag.basePx + clamped));
        drag.track.style.transform = `translateX(${px}px)`;
        drag.lastPx = px;
    }

    handlePointerUp(event) {
        const drag = this._activeDrag;
        if (!drag || event.pointerId !== drag.pointerId) return;
        this._activeDrag = null;

        if (drag.movedPastSlop) {
            // THE POINTER MOVED MEANINGFULLY AWAY FROM THE PRESS POINT - EVEN IF THE GESTURE NEVER BECAME (OR
            // WAS REJECTED AS) A MONTH-SLIDE, SUPPRESS THE click THE BROWSER SYNTHESIZES RIGHT AFTER THIS
            // pointerup, SO A FAILED/REJECTED DRAG ATTEMPT CAN'T ACCIDENTALLY SELECT (OR, VIA THE SEPARATE
            // "CLICK OUTSIDE CLOSES" LISTENER, CLOSE) WHATEVER HAPPENS TO BE UNDER THE RELEASE POINT.
            // SET (NOT RESET) HERE - BOTH clickEventsDelegation AND THE PER-CALENDAR _calendarClickHandler NEED
            // TO SEE IT TRUE FOR THIS SAME CLICK EVENT, REGARDLESS OF WHICH ONE RUNS FIRST, SO IT'S CLEARED ON
            // THE NEXT TICK INSTEAD OF BEING CONSUMED BY WHICHEVER LISTENER CHECKS IT FIRST
            this._suppressNextClick = true;
            setTimeout(() => { this._suppressNextClick = false; }, 0);
        }

        if (!drag.dragging) return; // PLAIN TAP OR A REJECTED GESTURE - NOTHING ELSE TO CLEAN UP

        const traveled = Math.abs((drag.lastPx ?? drag.basePx) - drag.basePx);
        const commit = drag.widthPx > 0 && (traveled / drag.widthPx) >= 0.30;
        const targetPx = commit
            ? (drag.direction === 1 ? -drag.widthPx : 0)
            : (drag.direction === 1 ? 0 : -drag.widthPx);

        drag.track.style.transition = `transform var(--calendar-slide-duration) var(--calendar-slide-easing)`;
        drag.track.style.transform = `translateX(${targetPx}px)`;

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;

            drag.config.coreElements.calendarWrap.classList.remove(`${this.controller.ccn}_dragging`);

            if (commit) {
                this.controller.domManager._finalizeSlide(drag.config, drag.targetMonth, drag.targetYear, drag.track);
            } else {
                drag.track.style.transition = 'none';
                drag.peekEl.remove();
                drag.track.style.transform = 'translateX(0px)';
                this.controller.domManager.unpinMonthBodyViewportWidth(drag.config);

                // REVERT THE OPTIMISTIC HEADER PREVIEW - config.openCalendar IS STILL THE ORIGINAL MONTH/YEAR HERE
                // SINCE A CANCELLED DRAG NEVER COMMITS, SO returnMonthYear CORRECTLY RENDERS THE ORIGINAL AGAIN
                const headerEl = drag.config.coreElements.calendarWrap.querySelector(`.${this.controller.ccn}_month_header_title_wrap`);
                if (headerEl) {
                    headerEl.innerHTML = this.controller.domManager.returnMonthYear(drag.config);
                }

                drag.config.slide.active = false;
                drag.config.slide.dragging = false;
            }
        };
        drag.track.addEventListener('transitionend', finish, { once: true });
        setTimeout(finish, 600); // SAFETY NET IN CASE transitionend NEVER FIRES
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

    // TRIGGERS WHEN USER CLICKS ARROWS TO GO TO THE NEXT OR THE PREVIOUS MONTH. RETURNS WHETHER IT ACTUALLY
    // NAVIGATED (false ON A LIMITS REJECTION OR A slideToMonth RE-ENTRANCY BAIL) - CALLERS THAT DO SOMETHING
    // CONDITIONAL ON SUCCESS (E.G. handlerClickYear) MUST CHECK THIS RATHER THAN ASSUMING IT ALWAYS SUCCEEDED
    navigateMonth(config, direction) {
        const [newMonth, newYear] = this.controller.dateManager.findTargetMonth(config.openCalendar, direction);
        const limits = config.processedLimits;

        // ENSURE THE YEAR STAYS WITHIN THE PROCESSED LIMITS
        if (newYear < limits.minYear || newYear > limits.maxYear) return false;

        // OPTIONALLY ENSURE THE MONTH STAYS WITHIN THAT YEAR'S PROCESSED LIMITS
        if (config.navigation.respectMonthLimits) {
            const yearLimits = limits.years[newYear];
            if (!yearLimits || newMonth < yearLimits.months.minMonth || newMonth > yearLimits.months.maxMonth) return false;
        }

        // PROCEED TO SLIDE TO THE NEW MONTH - slideToMonth OWNS THE config.openCalendar ASSIGNMENT AT FINALIZE TIME
        return this.controller.domManager.slideToMonth(config, direction);
    }

    // INSTANT (NON-ANIMATED) TARGETED RE-RENDER OF THE HEADER + DAY-GRID FOR WHATEVER config.openCalendar
    // CURRENTLY IS - USED BY THE PROGRAMMATIC setOpenCalendar/updateYearLimits PUBLIC FUNCTIONS, WHICH
    // DELIBERATELY DON'T ANIMATE (ARBITRARY JUMPS, NOT A DIRECTIONAL "NEXT/PREV" NAVIGATION). ARROW-CLICK/
    // YEAR-SELECT NAVIGATION GOES THROUGH DOMManager.slideToMonth INSTEAD (SEE navigateMonth).
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
        this.controller.domManager.syncActiveYearChip(config);
        this.controller.domManager.rebuildMonthsPicker(config);
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

        const currentMonth = config.openCalendar.getMonth();
        const currentYear = config.openCalendar.getFullYear();
        const targetYear = parseInt(clickedYear.getAttribute('data-year'), 10);

        // IF THE CURRENTLY-VIEWED MONTH ISN'T ALLOWED IN THE TARGET YEAR, SNAP TO THE NEAREST MONTH THAT IS,
        // RATHER THAN LETTING navigateMonth SILENTLY REJECT THE WHOLE JUMP
        let targetMonth = currentMonth;
        if (config.navigation.respectMonthLimits) {
            const yearLimits = config.processedLimits.years[targetYear];
            if (yearLimits) {
                const { minMonth, maxMonth } = yearLimits.months;
                targetMonth = Math.max(minMonth, Math.min(maxMonth, currentMonth));
            }
        }

        const navDirection = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);

        // ONLY MARK THE CHIP ACTIVE AND CLOSE THE PICKER IF NAVIGATION ACTUALLY HAPPENED (OR WASN'T NEEDED) -
        // OTHERWISE THE CHIP WOULD SHOW AS SELECTED WHILE THE CALENDAR SILENTLY STAYS ON THE OLD MONTH/YEAR
        const navigated = navDirection ? this.navigateMonth(config, navDirection) : true;
        if (!navigated) return;

        // MARK THE CLICKED CHIP ACTIVE IMMEDIATELY (RATHER THAN VIA syncActiveYearChip/config.openCalendar) SINCE
        // FOR 'slide'/'fade' TRANSITIONS config.openCalendar ISN'T ACTUALLY UPDATED UNTIL THE ANIMATION'S
        // transitionend FIRES, WHICH WOULD OTHERWISE DELAY THE HIGHLIGHT BEHIND THE CLICK
        const activeClass = `${ccn}_active_year`;
        const currentActive = clickedYearWrap.querySelector(`.${activeClass}`);
        if (currentActive) currentActive.classList.remove(activeClass);
        clickedYear.classList.add(activeClass);
        setTimeout(() => {
            clickedYearWrap.classList.toggle(`${ccn}_close_status`);
        }, 100);
    }

    // CORE EVENT LISTENER FOR NAVIGATING TO MONTHS - NO SCROLL-INTO-VIEW NEEDED (UNLIKE handlerClickYearToNav)
    // SINCE THE MONTHS PANEL ALWAYS HOLDS EXACTLY 12 CHIPS, ALL VISIBLE AT ONCE
    handlerClickMonthToNav(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedMonth = event.target.closest(`.${ccn}_month_header_title.${ccn}_clickable`);
        if (!clickedMonth) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        const monthsWrap = document.querySelector(`#${config.id} .${ccn}_months_wrap`);
        if (!monthsWrap) return;

        monthsWrap.classList.toggle(`${ccn}_close_status`);
    }

    // CORE EVENT LISTENER FOR SELECTING MONTHS - ONLY EVER NAVIGATES WITHIN THE CURRENTLY ACTIVE YEAR (NO YEAR
    // CROSS-TALK - CHANGING YEAR REMAINS THE YEAR PICKER'S JOB)
    handlerClickMonth(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedMonthWrap = event.target.closest(`.${ccn}_months_wrap`);
        if (!clickedMonthWrap) return;

        const clickedMonth = event.target.closest(`.${ccn}_month_choice`);
        if (!clickedMonth) return;
        if (clickedMonth.classList.contains(`${ccn}_disabled_month`)) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        const currentMonth = config.openCalendar.getMonth();
        const targetMonth = parseInt(clickedMonth.getAttribute('data-month'), 10);

        const direction = targetMonth - currentMonth;

        const navigated = direction ? this.navigateMonth(config, direction) : true;
        if (!navigated) return;

        // MARK THE CLICKED CHIP ACTIVE IMMEDIATELY (RATHER THAN VIA A REBUILD/config.openCalendar) - SAME REASON
        // AS handlerClickYear ABOVE: FOR 'slide'/'fade' TRANSITIONS config.openCalendar ISN'T ACTUALLY UPDATED
        // UNTIL THE ANIMATION'S transitionend FIRES, WHICH WOULD OTHERWISE DELAY THE HIGHLIGHT BEHIND THE CLICK
        const activeClass = `${ccn}_active_month`;
        const currentActive = clickedMonthWrap.querySelector(`.${activeClass}`);
        if (currentActive) currentActive.classList.remove(activeClass);
        clickedMonth.classList.add(activeClass);
        setTimeout(() => {
            clickedMonthWrap.classList.toggle(`${ccn}_close_status`);
        }, 100);
    }

    // CORE EVENT LISTENER FOR NAVIGATING TO TIME - ALSO APPLIES/WRITES THE CURRENTLY-ACTIVE TIME AS SOON AS THE
    // PANEL IS OPENED, SO THE COMBINED DATE+TIME VALUE SHOWS UP EVEN IF THE USER NEVER TOUCHES AN HOUR/MINUTE
    // WHEEL (AND EVEN IF NO DAY HAS BEEN CLICKED YET - buildFullValueString ALREADY FALLS BACK TO
    // config.openCalendar FOR THE DATE PART IN THAT CASE). applyTimeChange (WHICH ALSO RE-FIRES onTimeChange AND
    // RE-WRITES THE VALUE) ONLY RUNS ON OPEN, SINCE NOTHING CHANGES ON CLOSE - BUT onClickTime ITSELF STILL
    // FIRES BOTH WAYS, WITH isOpen TELLING THE CONSUMER WHICH ONE HAPPENED.
    handlerClickTimeToNav(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedTrigger = event.target.closest(`.${ccn}_time_trigger`);
        if (!clickedTrigger) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        const timeWrap = document.querySelector(`#${config.id} .${ccn}_time_wrap`);
        if (!timeWrap) return;

        const isNowClosed = timeWrap.classList.toggle(`${ccn}_close_status`);
        const isOpen = !isNowClosed;

        const fullValue = isOpen ? this.applyTimeChange(config) : this.controller.dateManager.buildFullValueString(config);

        if (config.time.onClickTime) {
            config.time.onClickTime(isOpen, fullValue, config.inputToAttach);
        }
    }

    // UPDATES THE TIME TRIGGER LABEL AND WRITES THE COMBINED DATE+TIME VALUE - SHARED BY handlerClickTimeToNav/
    // handlerClickHour/handlerClickMinute/handlerClickPeriod/settleWheelColumn SINCE ALL OF THEM END WITH THE
    // SAME "RECOMPUTE AND WRITE" STEP. RETURNS THE COMPUTED VALUE SO CALLERS CAN PASS IT TO THEIR OWN MORE
    // SPECIFIC CALLBACKS (onClickTime/onSelectHour/onSelectMinute) WITHOUT RECOMPUTING IT.
    applyTimeChange(config) {
        const ccn = this.controller.ccn;

        const trigger = document.querySelector(`#${config.id} .${ccn}_time_trigger`);
        const timeStr = this.controller.dateManager.formatTime(config, config.time.handler.activeHour, config.time.handler.activeMinute);
        if (trigger) trigger.textContent = timeStr;

        const fullValue = this.controller.dateManager.buildFullValueString(config);
        if (config.day.displayDateAfterClick) {
            this.controller.dateManager.writeValueToAttachedElement(config, fullValue);
        }
        // KEPT IN SYNC WITH DateManager.clickDayCoreFunctionality, WHICH ALSO SETS THIS UNCONDITIONALLY (NOT
        // GATED BY displayDateAfterClick) ON A DAY CLICK - WITHOUT THIS, PICKING A TIME AFTER ALREADY PICKING A
        // DAY LEFT THIS ATTRIBUTE STALE AT WHATEVER TIME WAS ACTIVE AT THE LAST DAY CLICK
        config.inputToAttach.setAttribute('data-active-date', fullValue);

        if (config.time.onTimeChange) {
            config.time.onTimeChange(fullValue, config.time.handler.activeHour, config.time.handler.activeMinute, config.inputToAttach);
        }

        return fullValue;
    }

    // CONTINUOUS, INDEX-BASED (NOT getBoundingClientRect-BASED) MAGNIFICATION - EVERY CHIP HAS THE SAME FIXED
    // --calendar-time-wheel-row-height, SO "HOW FAR IS CHIP j FROM THE CENTERED ROW" IS PURE ARITHMETIC ON
    // scrollTop/rowHeight, NO FORCED LAYOUT READS PER CHIP. ONLY CHIPS WITHIN ±4 ROWS OF CENTER ARE TOUCHED
    // (PLENTY WIDER THAN THE 5 VISIBLE ROWS) - iterATING EVERY CHIP IN A 300-ITEM MINUTE WHEEL ON EVERY SCROLL
    // FRAME WOULD BE WASTEFUL FOR NO VISUAL BENEFIT, SINCE ANYTHING FURTHER OUT IS CLIPPED ANYWAY.
    updateWheelMagnification(container, rowHeight) {
        const centeredIndexFloat = container.scrollTop / rowHeight;
        const children = container.children;
        const from = Math.max(0, Math.floor(centeredIndexFloat - 4));
        const to = Math.min(children.length - 1, Math.ceil(centeredIndexFloat + 4));

        for (let j = from; j <= to; j++) {
            const distanceRows = Math.abs(j - centeredIndexFloat);
            const scale = Math.min(1.35, Math.max(0.7, 1.35 - distanceRows * 0.2));
            const opacity = Math.min(1, Math.max(0.35, 1 - distanceRows * 0.25));
            children[j].style.transform = `scale(${scale})`;
            children[j].style.opacity = opacity;
        }
    }

    // RUNS ONCE SCROLLING HAS SETTLED (DEBOUNCED IN attachWheelScrollListeners, NEVER MID-GESTURE, SO A LIVE
    // NATIVE MOMENTUM FLICK IS NEVER INTERRUPTED): SILENTLY JUMPS BACK TO THE HOME (MIDDLE) COPY IF THE USER
    // SCROLLED INTO A BUFFER COPY (THE "INFINITE WRAP" TRICK), THEN COMMITS THE NOW-CENTERED VALUE THE SAME WAY
    // A CLICK WOULD.
    settleWheelColumn(config, container, kind, rowHeight) {
        const ccn = this.controller.ccn;
        const totalItems = container.children.length;
        const itemsPerCopy = totalItems / DOMManager.WHEEL_COPIES;

        let nearestIndex = Math.round(container.scrollTop / rowHeight);
        nearestIndex = Math.max(0, Math.min(totalItems - 1, nearestIndex));

        const copyIndex = Math.floor(nearestIndex / itemsPerCopy);
        if (copyIndex !== DOMManager.WHEEL_HOME_COPY_INDEX) {
            const copyShift = DOMManager.WHEEL_HOME_COPY_INDEX - copyIndex;
            container.scrollTop += copyShift * itemsPerCopy * rowHeight;
            nearestIndex += copyShift * itemsPerCopy;
        }

        let chip = container.children[nearestIndex];
        if (!chip) return;

        // A CLICK ON A DISABLED CHIP IS SIMPLY REJECTED (handlerClickHour/handlerClickMinute BAIL BEFORE EVER
        // CALLING THIS), BUT SCROLLING CAN PHYSICALLY LAND ON A DISABLED VALUE THAT A CLICK COULD NEVER REACH -
        // SNAP TO THE NEAREST ENABLED CHIP WITHIN THE SAME (HOME) COPY INSTEAD OF COMMITTING A DISABLED VALUE.
        // ACCEPTED EDGE CASE: IF THE ENTIRE HOME COPY IS DISABLED (E.G. A WEEKDAY WITH hourLimits EXCLUDING EVERY
        // HOUR), NOTHING VALID EXISTS TO SNAP TO, SO THE ORIGINAL (DISABLED) CHIP IS COMMITTED AS A LAST RESORT.
        const disabledClass = kind === 'hour' ? `${ccn}_disabled_hour` : `${ccn}_disabled_minute`;
        if (chip.classList.contains(disabledClass)) {
            const homeCopyStart = DOMManager.WHEEL_HOME_COPY_INDEX * itemsPerCopy;
            const homeCopyEnd = homeCopyStart + itemsPerCopy;
            let snapIndex = null;
            for (let offset = 1; offset < itemsPerCopy && snapIndex === null; offset++) {
                const upIndex = nearestIndex + offset;
                const downIndex = nearestIndex - offset;
                if (upIndex < homeCopyEnd && !container.children[upIndex].classList.contains(disabledClass)) {
                    snapIndex = upIndex;
                }
                else if (downIndex >= homeCopyStart && !container.children[downIndex].classList.contains(disabledClass)) {
                    snapIndex = downIndex;
                }
            }
            if (snapIndex !== null) {
                nearestIndex = snapIndex;
                container.scrollTop = nearestIndex * rowHeight;
                chip = container.children[nearestIndex];
            }
        }

        if (kind === 'hour') {
            config.time.handler.activeHour = this.resolveHourValueFromChip(config, chip);
            const activeClass = `${ccn}_active_hour`;
            const current = container.querySelector(`.${activeClass}`);
            if (current) current.classList.remove(activeClass);
            chip.classList.add(activeClass);

            const fullValue = this.applyTimeChange(config);
            if (config.time.onSelectHour) {
                config.time.onSelectHour(config.time.handler.activeHour, fullValue, config.inputToAttach);
            }
        }
        else {
            config.time.handler.activeMinute = parseInt(chip.getAttribute('data-minute'), 10);
            const activeClass = `${ccn}_active_minute`;
            const current = container.querySelector(`.${activeClass}`);
            if (current) current.classList.remove(activeClass);
            chip.classList.add(activeClass);

            const fullValue = this.applyTimeChange(config);
            if (config.time.onSelectMinute) {
                config.time.onSelectMinute(config.time.handler.activeMinute, fullValue, config.inputToAttach);
            }
        }
    }

    // ATTACHES THE PER-COLUMN scroll LISTENERS (scroll DOESN'T BUBBLE, SO THIS CAN'T GO THROUGH THE DOCUMENT-
    // LEVEL DELEGATED-CLICK PATTERN EVERYTHING ELSE USES - EACH WHEEL NEEDS ITS OWN LISTENER, STORED IN
    // config.functionsHandler FOR CLEANUP LIKE THIS CODEBASE'S OTHER NON-DELEGATED PER-INSTANCE LISTENERS).
    // EACH SCROLL EVENT rAF-THROTTLES A CONTINUOUS MAGNIFICATION UPDATE AND DEBOUNCES A "HAS SCROLLING SETTLED"
    // CHECK THAT COMMITS THE VALUE.
    attachWheelScrollListeners(config, hoursContainer, minutesContainer) {
        if (!config.functionsHandler) config.functionsHandler = {};

        const rowHeight = parseFloat(getComputedStyle(hoursContainer).getPropertyValue('--calendar-time-wheel-row-height'));

        const makeScrollHandler = (container, kind) => {
            let rafPending = false;
            let settleTimeout = null;

            return () => {
                if (!rafPending) {
                    rafPending = true;
                    requestAnimationFrame(() => {
                        this.updateWheelMagnification(container, rowHeight);
                        rafPending = false;
                    });
                }

                clearTimeout(settleTimeout);
                settleTimeout = setTimeout(() => {
                    this.settleWheelColumn(config, container, kind, rowHeight);
                }, 120);
            };
        };

        config.functionsHandler._hoursWheelScroll = makeScrollHandler(hoursContainer, 'hour');
        config.functionsHandler._minutesWheelScroll = makeScrollHandler(minutesContainer, 'minute');

        hoursContainer.addEventListener('scroll', config.functionsHandler._hoursWheelScroll, { passive: true });
        minutesContainer.addEventListener('scroll', config.functionsHandler._minutesWheelScroll, { passive: true });

        // MAGNIFY THE INITIAL CENTERED VALUE RIGHT AWAY, BEFORE ANY SCROLL EVENT HAS HAPPENED
        this.updateWheelMagnification(hoursContainer, rowHeight);
        this.updateWheelMagnification(minutesContainer, rowHeight);
    }

    // data-hour12 IS THE DISPLAYED NUMERAL (1-12), NOT A RESOLVED 24H VALUE - RESOLVES IT AGAINST THE CURRENTLY
    // ACTIVE AM/PM HALF (SEE createTimeChoices'S COMMENT ON WHY IT'S STORED THIS WAY). SHARED BY handlerClickHour
    // AND settleWheelColumn SINCE BOTH NEED TO TURN "WHICH HOUR CHIP" INTO A REAL 24H VALUE THE SAME WAY.
    resolveHourValueFromChip(config, chipEl) {
        if (config.time.use12Hour) {
            const hour12 = parseInt(chipEl.getAttribute('data-hour12'), 10);
            const isPM = config.time.handler.activeHour >= 12;
            return (hour12 % 12) + (isPM ? 12 : 0);
        }
        return parseInt(chipEl.getAttribute('data-hour'), 10);
    }

    // SCROLLS THE GIVEN CHIP TO DEAD-CENTER IN ITS WHEEL - COLLAPSES TO AN INSTANT JUMP UNDER
    // prefers-reduced-motion:reduce, MIRRORING HOW --calendar-slide-duration COLLAPSES FOR THE MONTH SLIDE
    scrollWheelChipToCenter(chipEl) {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        chipEl.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    }

    // CORE EVENT LISTENER FOR SELECTING AN HOUR - DOES NOT CLOSE THE PANEL (UNLIKE handlerClickYear/
    // handlerClickMonth) SINCE PICKING AN HOUR DOESN'T COMPLETE THE INTERACTION - THE USER STILL LIKELY WANTS TO
    // PICK A MINUTE. THE PANEL ONLY CLOSES VIA handlerClickTimeToNav OR THE EXISTING CLICK-OUTSIDE BEHAVIOR.
    // IMMEDIATE STATE UPDATE/FEEDBACK HAPPENS RIGHT AWAY (NOT WAITING FOR THE SCROLL-SETTLE DEBOUNCE) - THE
    // scrollWheelChipToCenter CALL BELOW WILL ALSO RE-TRIGGER THE SETTLE HANDLER ONCE IT FINISHES, WHICH JUST
    // HARMLESSLY RECOMPUTES THE SAME VALUE ALREADY SET HERE.
    handlerClickHour(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedTimeWrap = event.target.closest(`.${ccn}_time_wrap`);
        if (!clickedTimeWrap) return;

        const clickedHour = event.target.closest(`.${ccn}_hour_choice`);
        if (!clickedHour) return;
        if (clickedHour.classList.contains(`${ccn}_disabled_hour`)) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        config.time.handler.activeHour = this.resolveHourValueFromChip(config, clickedHour);

        const activeClass = `${ccn}_active_hour`;
        const currentActive = clickedTimeWrap.querySelector(`.${ccn}_hours_container .${activeClass}`);
        if (currentActive) currentActive.classList.remove(activeClass);
        clickedHour.classList.add(activeClass);

        const fullValue = this.applyTimeChange(config);
        if (config.time.onSelectHour) {
            config.time.onSelectHour(config.time.handler.activeHour, fullValue, config.inputToAttach);
        }
        this.scrollWheelChipToCenter(clickedHour);
    }

    // CORE EVENT LISTENER FOR SELECTING A MINUTE - SAME NO-AUTO-CLOSE REASONING AS handlerClickHour
    handlerClickMinute(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedTimeWrap = event.target.closest(`.${ccn}_time_wrap`);
        if (!clickedTimeWrap) return;

        const clickedMinute = event.target.closest(`.${ccn}_minute_choice`);
        if (!clickedMinute) return;
        if (clickedMinute.classList.contains(`${ccn}_disabled_minute`)) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        config.time.handler.activeMinute = parseInt(clickedMinute.getAttribute('data-minute'), 10);

        const activeClass = `${ccn}_active_minute`;
        const currentActive = clickedTimeWrap.querySelector(`.${ccn}_minutes_container .${activeClass}`);
        if (currentActive) currentActive.classList.remove(activeClass);
        clickedMinute.classList.add(activeClass);

        const fullValue = this.applyTimeChange(config);
        if (config.time.onSelectMinute) {
            config.time.onSelectMinute(config.time.handler.activeMinute, fullValue, config.inputToAttach);
        }
        this.scrollWheelChipToCenter(clickedMinute);
    }

    // CORE EVENT LISTENER FOR TOGGLING AM/PM - ONLY EVER MATCHES ANYTHING ON A use12Hour CALENDAR, SINCE THE
    // PERIOD TOGGLE IS ONLY BUILT FOR THOSE (SEE createTimeChoices). FLIPS activeHour BY ±12 WITHOUT TOUCHING THE
    // HOUR CHIPS THEMSELVES - THEY'RE KEYED OFF activeHour % 12, WHICH THIS NEVER CHANGES.
    handlerClickPeriod(clickedEl, event) {
        const ccn = this.controller.ccn;
        const clickedTimeWrap = event.target.closest(`.${ccn}_time_wrap`);
        if (!clickedTimeWrap) return;

        const clickedPeriod = event.target.closest(`.${ccn}_period_choice`);
        if (!clickedPeriod) return;

        const config = this.controller.configManager.getConfigById(clickedEl.id);

        const targetIsPM = clickedPeriod.getAttribute('data-period') === 'PM';
        config.time.handler.activeHour = (config.time.handler.activeHour % 12) + (targetIsPM ? 12 : 0);

        const activeClass = `${ccn}_active_period`;
        const currentActive = clickedTimeWrap.querySelector(`.${ccn}_period_container .${activeClass}`);
        if (currentActive) currentActive.classList.remove(activeClass);
        clickedPeriod.classList.add(activeClass);

        // TOGGLING AM/PM CHANGES THE UNDERLYING 24H activeHour EVEN THOUGH THE DISPLAYED NUMERAL DOESN'T -
        // COUNTS AS AN HOUR CHANGE FROM THE CONSUMER'S PERSPECTIVE, SO onSelectHour FIRES HERE TOO
        const fullValue = this.applyTimeChange(config);
        if (config.time.onSelectHour) {
            config.time.onSelectHour(config.time.handler.activeHour, fullValue, config.inputToAttach);
        }

        // THE SAME data-hour12 CHIP NOW RESOLVES TO A DIFFERENT REAL HOUR, SO ITS DISABLED STATUS CAN FLIP -
        // IF THE (JUST-TOGGLED) activeHour TURNS OUT TO BE DISABLED UNDER THE ACTIVE WEEKDAY'S hourLimits, THIS
        // CLAMPS IT AND RE-FIRES applyTimeChange/onSelectHour AGAIN WITH THE CLAMPED VALUE - A RARE DOUBLE-FIRE
        // EDGE CASE (AM/PM TOGGLE LANDING EXACTLY OUT OF RANGE) ACCEPTED FOR SIMPLICITY
        this.controller.domManager.refreshHourWheelDisabledState(config);
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

        // THE CLICKED DAY MAY HAVE A DIFFERENT WEEKDAY THAN WHATEVER WAS ACTIVE BEFORE, SO THE HOUR WHEEL'S
        // DISABLED SET (WEEKDAY-DEPENDENT) NEEDS RE-EVALUATING - ALSO COVERS THE initDate PATH SINCE THAT ALSO
        // ROUTES THROUGH THIS SAME FUNCTION (SEE DOMManager.createMonthBody). THE TIME TRIGGER ITSELF IS HIDDEN
        // UNTIL A DAY IS ACTIVE (SEE DOMManager.createTimeTriggerRow) - REVEAL IT NOW THAT ONE IS.
        if (config.time.enabled) {
            this.controller.domManager.refreshHourWheelDisabledState(config);
            this.controller.domManager.openElement(config.coreElements.timeTriggerWrap);
        }

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
        const hoveredPicker = event.target.closest(`.input_${this.controller.ccn}_outer_wrap`);
        if (!hoveredPicker) return;

        this.handlerMousemoveYear(hoveredPicker, event);
        this.handlerMousemoveMonth(hoveredPicker, event);
    }

    handlerMousemoveYear(hoveredPicker, event) {
        const ccn = this.controller.ccn;
        const yearContainerEl = event.target.closest(`.${ccn}_years_container`);

        const config = this.controller.configManager.getConfigById(hoveredPicker.id);

        // SCOPED TO .years_wrap (NOT JUST #config.id) SINCE THE MONTHS PANEL HAS ITS OWN, SEPARATE
        // .cursor_to_follow ELEMENT SHARING THE SAME CLASS UNDER THE SAME CALENDAR ID
        const cursorEl = document.querySelector(`#${config.id} .${ccn}_years_wrap .${ccn}_cursor_to_follow`);
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

    handlerMousemoveMonth(hoveredPicker, event) {
        const ccn = this.controller.ccn;
        const monthContainerEl = event.target.closest(`.${ccn}_months_container`);

        const config = this.controller.configManager.getConfigById(hoveredPicker.id);

        const cursorEl = document.querySelector(`#${config.id} .${ccn}_months_wrap .${ccn}_cursor_to_follow`);
        if (!cursorEl) return;

        cursorEl.style.opacity = '0';
        cursorEl.style.visibility = 'hidden';
        if (!monthContainerEl) return;
        cursorEl.style.opacity = '0.8';
        cursorEl.style.visibility = 'visible';

        const { top, left } = monthContainerEl.getBoundingClientRect();

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