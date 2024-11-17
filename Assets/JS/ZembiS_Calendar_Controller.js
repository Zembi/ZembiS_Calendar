
{
    window.ZembiS_Calendar = class {
        #controller;

        constructor(config) {
            this.#controller = new Calendar_Controller();
        }

        renderCalendar(config) {
            this.#controller.createCalendar(config);
        }
    }

    class Calendar_Controller {
        constructor() {
            this.eventHandler = new EventHandler(this);
            this.domManager = new DOMManager(this);
            this.dateManager = new DateManager(this);
            this.configManager = new ConfigManager(this);
            this.validatorHandle = new ValidatorHandle(this);


            this.ccn = 'calendar_vfz';
            this.flagClassToAvoidDuplicates = this.configManager.generateUniqueIds(30, 'vfzembiSCal_');
            this.downLimit = 100;
            this.upLimit = 100;

            // IMPORTANT TO REMOVE MOUSE EVENT LISTENER IF THERE IS NO CURSOR
            this.mouseMoveEventsDelegation = '';
            this.mousemoveListenerAdded = false;

            // HERE ADD THE CONFIGURATIONS OF EACH INPUT ACTION
            this.savedData = [];
            this.configurations = [];
            this.ensureFirstTimeActions();
        }

        ensureFirstTimeActions() {
            Calendar_Controller.domReadyPromise.then(() => this.firstTimeActions());
        }

        firstTimeActions() {
            this.languageConfiguration();
            this.eventHandler.setupEventDelegation();
        }

        languageConfiguration() {
            switch (document.querySelector('html').lang) {
                case 'el':
                    this.dateManager.months = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
                    this.dateManager.weekDays = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
                    this.dateManager.buttons.currentDate = 'Σήμερα';
                    break;
                default:
                    this.dateManager.months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    this.dateManager.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    this.dateManager.buttons.currentDate = 'Today';
                    break;
            }
        }

        // --------------- RENDER FOR INPUT DATE ---------------
        createCalendar({ inputToAttach = null, inputPlaceholder = 'Pick a date', openCalendar = new Date(), initDate = false, dateFormat = 'DD-MM-YYYY', clickable = true, year = null, month = null, day = null, navigation = null, cursorEffect = true, style = null }) {
            const givenInput = this.validatorHandle.validateString(inputToAttach);

            // PREVENT INPUT TO BE ATTACHED TO TWO A CALENDAR
            const existingConfig = this.configurations.find(c => c.inputToAttach === givenInput);
            if (existingConfig) {
                console.error('This input is already attached to a calendar. Detach it before rendering a new one.');
                return existingConfig;
            }
            try {
                if (!givenInput) {
                    console.error('Invalid input element selector trying to be attached to ZembiS_Calendar');
                    return;
                }

                let processedLimits = {};
                openCalendar = this.validatorHandle.validateDate(openCalendar);

                [processedLimits, openCalendar] = this.configManager.processConfigLimits({ openCalendar, year, month, day });

                // VALIDATE OPTIONS (IF NOT, INIATE DEFAULT VALUES)
                const config = {
                    id: this.configManager.generateUniqueIds(25),
                    inputToAttach: givenInput,
                    inputPlaceholder: this.validatorHandle.validateString(inputPlaceholder, 'Pick a date'),
                    initDate: this.validatorHandle.validateBoolean(initDate, false),
                    dateFormat: this.validatorHandle.validateDateFormat(dateFormat.toUpperCase(), 'DD-MM-YYYY'),
                    clickable: this.validatorHandle.validateBoolean(clickable, true),
                    // PROCESS AND RESOLVE ALL THE LIMITS BEFORE INITIALIZING THE CALENDAR
                    processedLimits,
                    openCalendar,
                    year: {
                        clickable: this.validatorHandle.validateBoolean(year?.clickable, true),
                        // HIDDEN VALUES (NOT FROM CONFIG)
                        handler: {
                            activeYear: openCalendar.getFullYear(),
                        },
                    },
                    month: {
                        clickable: this.validatorHandle.validateBoolean(month?.clickable, true),
                        // HIDDEN VALUES (NOT FROM CONFIG)
                        handler: {
                            activeMonth: openCalendar.getMonth(),
                        },
                    },
                    day: {
                        clickable: this.validatorHandle.validateBoolean(day?.clickable, true),
                        reClickable: this.validatorHandle.validateBoolean(day?.reClickable, false),
                        closeOnClickDay: this.validatorHandle.validateBoolean(day?.closeOnClickDay, true),
                        onClickDay: this.validatorHandle.validateFunction(day?.onClickDay),
                        myClass: this.validatorHandle.validateString(day?.myClass, ''),
                        // HIDDEN VALUES (NOT FROM CONFIG)
                        handler: {
                            previousDay: null,
                            currentDay: null,
                            activeDate: null,
                        },
                    },
                    navigation: {
                        activeArrows: this.validatorHandle.validateBoolean(navigation?.activeArrows, true),
                    },
                    cursorEffect: this.validatorHandle.validateBoolean(cursorEffect, true),
                    style: {

                        transitions: {
                            fadeDatePicker: this.validatorHandle.validateInteger(style?.transitions?.fadeDatePicker, 0),
                            fadeYearPicker: this.validatorHandle.validateInteger(style?.transitions?.fadeYearPicker, 0),
                            cursorEffectDelay: this.validatorHandle.validateInteger(style?.transitions?.cursorEffectDelay, 0),
                        }
                    }
                }

                this.savedData.push({ id: config.id, data: [] });
                this.configurations.push(config);

                Calendar_Controller.domReadyPromise.then(() => this.activate(config));

                return this.configManager.getSavedDataOfCurrentConfigId(config.id)[0];
            }
            catch (e) {
                console.error(e);
                return;
            }
        }


        // EITHER ON CREATE OR UPDATE CALENDAR
        // ACTIVATES THE FUNCTIONALITY (USED FOR BOTH RENDERED AND MODIFIED FUNCTIONS)
        activate(config) {
            // MAKE SURE TO CHECK IF INPUT IS READY FOR USE
            if (this.validatorHandle.validateIfInputIsAcceptable(config)) {
                this.domManager.createOrUpdateInputCalendar(config);
            }
        }



        // DOMCONTENTLOAD CHECKER SO AS TO AVOID MULTIPLE LISTENERS 
        static domReadyPromise = new Promise(resolve => {
            const underDev = true;

            if (!underDev) {
                const href = 'https://zembi.github.io/ZembiS_Calendar/Assets/CSS/calendar.css';
                const id = 'zembiS_Stylesheet_vW3#Dwdw12@##s';

                const linkElements = document.getElementsByTagName('link');
                let isCssLoaded = false;
                for (let i = 0; i < linkElements.length; i++) {
                    if (linkElements[i].rel === 'stylesheet' && linkElements[i].href === href) {
                        linkElements[i].id = id;
                        isCssLoaded = true;
                    }
                }
                if (!isCssLoaded) {
                    console.warn(`The needed css file for the ZembiS_Calendar script, is not included in your code.\nAdd to the head of your page, before the js script the following:\n<link rel="stylesheet" href="https://zembi.github.io/ZembiS_Calendar/Assets/CSS/calendar.css">`);
                    return;
                }
            }

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
            }
            else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });
    }

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

                this._clckHold.isHeld = true;
                this._clckHold.callback.call(this, wrapEl, event);

                const holdCallback = () => {
                    if (this._clckHold.isHeld) {
                        this._clckHold.callback.call(this, wrapEl, event);
                        this._clckHold.activeHoldTimeoutID = setTimeout(holdCallback, 150);
                    }
                };

                this._clckHold.activeHoldTimeoutID = setTimeout(holdCallback, 150);
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
                    config.functionsHandler._calendarClickHandler = null;
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
            this.ClickAndHold(`.input_${this.controller.ccn}_nav_arrow`, this.handlerClickArrowsNav);

            document.addEventListener('click', (event) => {
                this.clickEventsDelegation(event);
            });

            Calendar_Controller.domReadyPromise.then(() => {
                const ccn = this.controller.ccn;
                const observer = new MutationObserver(() => {
                    const cursorEl = document.querySelector(`.input_${ccn}_outer_wrap .${ccn}_cursor_to_follow`);
                    if (cursorEl) {
                        if (!this.controller.mousemoveListenerAdded) {
                            this.controller.mouseMoveEventsDelegation = (event) => {
                                this.handleMouseMove(event);
                            };
                            document.addEventListener('pointermove', this.controller.mouseMoveEventsDelegation);
                            this.controller.mousemoveListenerAdded = true;
                        }
                        observer.disconnect();
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });
            });
        }

        clickEventsDelegation(event) {
            const clickedEl = event.target.closest(`.input_${this.controller.ccn}_outer_wrap`);
            if (!clickedEl) return;

            // EVENT LISTENERS FOR NAVIGATING MONTHS
            // this.handlerClickArrowsNav(clickedEl, event);
            // EVENT LISTENERS FOR NAVIGATING TO YEARS
            this.handlerClickYearToNav(clickedEl, event);
            // EVENT LISTENERS FOR SELECTING YEARS
            this.handlerClickYear(clickedEl, event);
            // EVENT LISTENERS FOR SELECTING DAYS
            this.handlerClickDay(event);
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
            const currentDate = config.openCalendar;
            let currentMonth = currentDate.getMonth();  // GET THE CURRENT MONTH
            let currentYear = currentDate.getFullYear();  // GET THE CURRENT YEAR

            const limits = config.processedLimits;

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

            // ENSURE THE YEAR STAYS WITHIN THE PROCESSED LIMITS
            if (newYear < limits.minYear || newYear > limits.maxYear) return;


            // PROCEED TO UPDATE THE CALENDAR WITH THE NEW MONTH
            const newDate = new Date(newYear, newMonth);
            config.openCalendar = newDate;  // UPDATE THE CALENDAR WITH THE NEW DATE

            // UPDATE VIEW AND RE-RENDER DAYS FOR THE NEW MONTH
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
            if (!yearsWrap.classList.contains(`.${ccn}_close_status`)) {
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

            const pickedNumDay = clickedEl.getAttribute('data-day');

            if (pickedNumDay && parseInt(pickedNumDay, 10) !== -1) {
                const config = this.controller.configManager.getConfigFromClickedEl(clickedEl);

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

        onClickDayAction(clickedEl, config, runAllFunctions = true) {
            this.controller.dateManager.clickDayCoreFunctionality(clickedEl, config);

            // HERE ADD THE CUSTOM EVENT LISTENER FROM THE USER
            if (config.day.onClickDay && runAllFunctions) {
                config.day.onClickDay(clickedEl.getAttribute('data-date'), clickedEl);
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
            cursorEl.style.visibiliy = 'hidden';
            if (!yearContainerEl) return;
            cursorEl.style.opacity = '0.8';
            cursorEl.style.visibiliy = 'visible';


            const { top, left } = yearContainerEl.getBoundingClientRect();

            const offsetX = event.clientX - left;
            const offsetY = event.clientY - top;

            requestAnimationFrame(() => {
                cursorEl.style.top = `${offsetY}px`;
                cursorEl.style.left = `${offsetX}px`;
            });
        }
    }


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
            const month = (config.openCalendar.getMonth()), year = config.openCalendar.getFullYear();

            const countDays = this.controller.dateManager.getNumOfDaysInMonth(month, year);

            let htmlForMonthBody = this.startDaysOfMonthFromCorrectWeekDay(this.controller.dateManager.getFirstDayOfMonth(month, year));

            // ADD CUSTOM CLASS TO DAY
            const customClasses = this.controller.configManager.getCustomDayClasses(config);

            const ccn = this.controller.ccn;
            config.day.handler.previousDay = null;
            config.day.handler.currentDay = null;
            for (let day = 1; day <= countDays; day++) {
                config.day.handler.currentDay = day;

                const currDay = new Date(`${year}-${month}-${day}`);
                const currentMonthCheck = this.controller.dateManager.compareTwoDates(currDay, new Date());
                let currentDayClass = '';
                if (currentMonthCheck) {
                    currentDayClass += ` ${ccn}_current_day`;
                }

                // IF DISABLED MONTH ADD IT HERE
                if (disabledMonth) {
                    currentDayClass += ' ${ccn}_disabled_day';
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
                data = `class="${ccn}_day ${clickableClassData}${customClasses}${currentDayClass}" data-day="${day}" data-date="${formattedDate}" aria-label="${day} ${this.controller.dateManager.monthsForUse[month - 1]} ${year}" ${restData}`;

                htmlForMonthBody += `
                    <span ${data} >
                    ${day}
                        </span>
                `;
            }

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

        startDaysOfMonthFromCorrectWeekDay(firstDayOfMonth) {
            let html = '';
            for (let day = 0; day < firstDayOfMonth; day++) {
                html += `<span class="${this.controller.ccn}_day" data-day="-1"></span> `;
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


    class DateManager {
        constructor(controller) {
            this.controller = controller;

            this.months = [];
            this.monthsForUse = [
                'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
            ];

            this.weekDays = [];
            this.weekDaysForUse = [
                'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
            ];

            this.buttons = {
                currentDate: null
            };
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
            return this.controller.savedData.filter((dataObj) => dataObj.id === id);
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

            // CHECK IF CURRENTYEAR IS WITHIN THE LIMITS AND EXISTS IN PROCESSEDLIMITS.YEARS
            if (currentYear < processedLimits.minYear) {
                currentYear = processedLimits.minYear;
                openCalendar.setFullYear(currentYear);
            }
            else if (currentYear > processedLimits.maxYear) {
                currentYear = processedLimits.maxYear;
                openCalendar.setFullYear(currentYear);
            }

            // IF CURRENTYEAR IS NOT FOUND IN PROCESSEDLIMITS.YEARS, FIND THE NEAREST VALID YEAR
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

            // NOW, GET THE YEAR-SPECIFIC LIMITS FOR THE VALID CURRENTYEAR
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
                    console.error(`Element '${config.inputToAttach}' is already attached to ZembiS_Calendar.`);
                    return false;
                }

                config.inputToAttach = input;
                input.classList.add(this.controller.flagClassToAvoidDuplicates);
                return true;
            }
            console.error(`No element '${config.inputToAttach}' was found, to be attached to ZembiS_Calendar.`);
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
            [min, max] = this.checkMinMaxValues(min, max);

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
            [min, max] = this.checkMinMaxValues(min, max);

            if (max > 11 || min < 0) return null;

            return [min, max];
        }

        validateDayRange(days, currMonth, currYear) {
            if (!days) return null;
            let min = days[0];
            let max = days[1];
            if ((!min && min !== 0) || (!max && max !== 0)) return null;
            [min, max] = this.checkMinMaxValues(min, max);

            if (min < 1) min = 0;

            const maxDefault = this.controller.dateManager.getNumOfDaysInMonth(currMonth, currYear);

            if (max > maxDefault) max = maxDefault;

            return [min, max];
        }

        checkMinMaxValues(min, max) {
            // XOR METHOD
            if (min > max) {
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
    }
}

const calendarController = new ZembiS_Calendar();