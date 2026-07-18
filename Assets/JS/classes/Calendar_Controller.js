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

        // HERE ADD THE CONFIGURATIONS OF EACH INPUT ACTION
        this.savedData = [];
        this.configurations = [];
        this.ensureFirstTimeActions();
    }

    ensureFirstTimeActions() {
        Calendar_Controller.domReadyPromise.then(() => this.firstTimeActions());
    }

    firstTimeActions() {
        this.eventHandler.setupEventDelegation();
    }

    // COMPUTES AND RETURNS THIS CALENDAR INSTANCE'S OWN LANGUAGE DATA (NOT SHARED STATE - EACH CALENDAR MAY BE
    // CONFIGURED WITH A DIFFERENT weekStartDay/extraLanguages, SO THIS MUST NOT MUTATE THE SHARED dateManager)
    languageConfiguration(extraLanguages, weekStartDay) {
        const htmlLang = document.querySelector('html').lang;
        let months, weekDays, todayButtonText;

        switch (htmlLang) {
            case 'el':
                months = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
                weekDays = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
                todayButtonText = 'Σήμερα';
                break;
            default:
                months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                todayButtonText = 'Today';
                break;
        }

        if (extraLanguages && extraLanguages[htmlLang]) {
            months = extraLanguages[htmlLang].months;
            weekDays = extraLanguages[htmlLang].weekDays;
            todayButtonText = extraLanguages[htmlLang].today;
        }

        weekDays = [...weekDays.slice(weekStartDay), ...weekDays.slice(0, weekStartDay)];

        return { months, weekDays, todayButtonText };
    }

    // --------------- RENDER FOR INPUT DATE ---------------
    createCalendar({
        inputToAttach = null,
        inputPlaceholder = 'Pick a date',
        openCalendar = new Date(),
        weekStartDay = null,
        initDate = false,
        extraLanguages = null,
        dateFormat = 'DD-MM-YYYY',
        displayPreviousMonth = false,
        displayNextMonth = false,
        clickable = true,
        navigation = null,
        cursorEffect = true,
        style = null,
        year = null,
        month = null,
        day = null,
        time = null,
        disable = null,
        layout = 'classic'
    }) {
        const givenInput = this.validatorHandle.validateString(inputToAttach);

        // PREVENT INPUT TO BE ATTACHED TO TWO A CALENDAR
        const existingConfig = this.configurations.find(c => c.inputToAttach === givenInput);
        if (existingConfig) {
            console.error('VFZ_Calendar: This input is already attached to a calendar. Detach it before rendering a new one.');
            return existingConfig;
        }

        try {
            if (!givenInput) {
                console.error('VFZ_Calendar: Invalid input element selector trying to be attached to ZembiS_Calendar');
                return;
            }

            if (weekStartDay === null) {
                // NOT PROVIDED BY THE CALLER - DEFAULT TO MONDAY, NO WARNING NEEDED
                weekStartDay = 1;
            }
            else if (weekStartDay < 0 || weekStartDay > 6) {
                console.warn('VFZ_Calendar: Invalid week start day');
                weekStartDay = 1;
            }

            const language = this.languageConfiguration(extraLanguages, weekStartDay);

            let processedLimits = {};
            openCalendar = this.validatorHandle.validateDate(openCalendar);

            [processedLimits, openCalendar] = this.configManager.processConfigLimits({ openCalendar, year, month, day });

            const minuteStep = this.validatorHandle.validateInteger(time?.minuteStep, 1);
            const timeProcessedLimits = this.configManager.processTimeLimits(time);

            // CLAMP THE INITIAL activeHour/activeMinute AGAINST openCalendar'S OWN WEEKDAY - MIRRORS HOW
            // processConfigLimits ALREADY CLAMPS openCalendar ITSELF AGAINST YEAR/MONTH/DAY LIMITS, SO THE VERY
            // FIRST RENDER RESPECTS time.limits WITHOUT NEEDING A DAY CLICK TO TRIGGER THE CLAMP
            const initialWeekdayHourLimits = timeProcessedLimits.weekdayLimits[openCalendar.getDay()].hourLimits;
            const initialActiveHour = Math.max(initialWeekdayHourLimits[0], Math.min(initialWeekdayHourLimits[1], openCalendar.getHours()));
            const initialActiveMinute = Math.max(timeProcessedLimits.minuteLimits[0], Math.min(timeProcessedLimits.minuteLimits[1], Math.floor(openCalendar.getMinutes() / minuteStep) * minuteStep));

            // VALIDATE OPTIONS (IF NOT, INIATE DEFAULT VALUES)
            const config = {
                id: this.configManager.generateUniqueIds(25),
                inputToAttach: givenInput,
                inputPlaceholder: this.validatorHandle.validateString(inputPlaceholder, 'Pick a date'),
                initDate: this.validatorHandle.validateBoolean(initDate, false),
                dateFormat: this.validatorHandle.validateDateFormat(dateFormat.toUpperCase(), 'DD-MM-YYYY'),
                clickable: this.validatorHandle.validateBoolean(clickable, true),
                // CSS-ONLY LAYOUT PRESET - SAME DOM/JS FOR EVERY VALUE, JUST A CLASS ON THE OUTER WRAP (SEE
                // DOMManager.createOuterWrap) THAT calendar.css USES TO REPOSITION THE NAV ARROWS
                layout: ['classic', 'sideArrows'].includes(layout) ? layout : 'classic',
                // HIDDEN VALUE (NOT FROM CONFIG) - SET VIA disableCalendar()/enableCalendar()
                disabled: false,
                disable: {
                    // 'allowOpenNoAction': STILL OPENS, SHOWS THE LOADER, BLOCKS NAV/YEAR/DAY ACTIONS
                    // 'blockOpen': THE CALENDAR CAN'T BE OPENED AT ALL WHILE DISABLED
                    behavior: ['allowOpenNoAction', 'blockOpen'].includes(disable?.behavior) ? disable.behavior : 'allowOpenNoAction',
                    message: this.validatorHandle.validateString(disable?.message, ''),
                    spinner: {
                        show: this.validatorHandle.validateBoolean(disable?.spinner?.show, true),
                        color: this.validatorHandle.validateString(disable?.spinner?.color, null),
                    },
                    overlay: {
                        color: this.validatorHandle.validateString(disable?.overlay?.color, null),
                    },
                },
                // THIS CALENDAR INSTANCE'S OWN MONTH/WEEKDAY NAMES AND "TODAY" LABEL (NOT SHARED ACROSS INSTANCES)
                language,
                // PROCESS AND RESOLVE ALL THE LIMITS BEFORE INITIALIZING THE CALENDAR
                processedLimits,
                openCalendar,
                rules: {
                    weekStartDay,
                    displayPreviousMonth: this.validatorHandle.validateBoolean(displayPreviousMonth, true),
                    displayNextMonth: this.validatorHandle.validateBoolean(displayNextMonth, true),
                },
                navigation: {
                    activeArrows: this.validatorHandle.validateBoolean(navigation?.activeArrows, true),
                    respectMonthLimits: this.validatorHandle.validateBoolean(navigation?.respectMonthLimits, false),
                    // WHETHER THE DAY-GRID CAN BE DRAGGED/SWIPED TO NAVIGATE MONTHS - INDEPENDENT OF activeArrows
                    // (E.G. A MOBILE-FIRST CALENDAR MIGHT HIDE THE ARROWS AND RELY ON SWIPE ALONE)
                    dragToNavigate: this.validatorHandle.validateBoolean(navigation?.dragToNavigate, true),
                    // HOW ARROW-CLICK/YEAR-SELECT NAVIGATION VISUALLY TRANSITIONS BETWEEN MONTHS. DRAG-TO-NAVIGATE
                    // ALWAYS USES ITS OWN LIVE-FOLLOW MOTION REGARDLESS OF THIS SETTING - THAT'S INHERENT TO THE
                    // GESTURE ITSELF, NOT SOMETHING THIS OPTION CONTROLS.
                    transition: ['slide', 'none', 'fade'].includes(navigation?.transition) ? navigation.transition : 'slide',
                },
                // HIDDEN VALUES (NOT FROM CONFIG) - TRACKS AN IN-FLIGHT MONTH SLIDE/DRAG (SEE DOMManager.slideToMonth)
                slide: {
                    active: false,
                    dragging: false,
                },
                cursorEffect: this.validatorHandle.validateBoolean(cursorEffect, true),
                style: {
                    includeFadedDays: this.validatorHandle.validateBoolean(style?.includeFadedDays, true),
                    transitions: {
                        fadeDatePicker: this.validatorHandle.validateInteger(style?.transitions?.fadeDatePicker, 0),
                        fadeYearPicker: this.validatorHandle.validateInteger(style?.transitions?.fadeYearPicker, 0),
                        fadeMonthPicker: this.validatorHandle.validateInteger(style?.transitions?.fadeMonthPicker, 0),
                        cursorEffectDelay: this.validatorHandle.validateInteger(style?.transitions?.cursorEffectDelay, 0),
                        // HOW LONG (MS) navigation.transition's 'slide'/'fade' MODES TAKE - SHARED BY BOTH SINCE
                        // THEY BOTH DRIVE THE SAME --calendar-slide-duration CSS VARIABLE (SEE
                        // DOMManager.createOuterWrap, WHICH WRITES THIS AS AN INLINE OVERRIDE SCOPED TO THIS
                        // CALENDAR'S OWN OUTER WRAP). HAS NO EFFECT ON 'none' OR ON DRAG, WHICH ALWAYS
                        // LIVE-FOLLOWS REGARDLESS OF ANY TRANSITION SETTING.
                        monthNavigation: this.validatorHandle.validateInteger(style?.transitions?.monthNavigation, 320),
                    }
                },
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
                    displayDateAfterClick: this.validatorHandle.validateBoolean(day?.displayDateAfterClick, true),
                    onClickDay: this.validatorHandle.validateFunction(day?.onClickDay),
                    myClass: this.validatorHandle.validateString(day?.myClass, ''),
                    rangeSelect: this.validatorHandle.validateBoolean(day?.rangeSelect, false),
                    rangeMinDays: this.validatorHandle.validateInteger(day?.rangeMinDays, null),
                    rangeStepDays: this.validatorHandle.validateInteger(day?.rangeStepDays, this.validatorHandle.validateInteger(day?.rangeMinDays, null)),
                    onRangeSelect: this.validatorHandle.validateFunction(day?.onRangeSelect),
                    // HIDDEN VALUES (NOT FROM CONFIG)
                    handler: {
                        previousDay: null,
                        currentDay: null,
                        activeDate: null,
                        rangeStart: null,
                        rangeEnd: null,
                        rangeState: 'idle',
                    },
                },
                time: {
                    // TURNS ON THE WHOLE FEATURE - THE TIME TRIGGER/PANEL AND VALUE COMPOSITION (SEE
                    // DateManager.buildFullValueString). NEVER BUILT WHEN day.rangeSelect IS ON - TIME IS
                    // A SINGLE-DATE CONCEPT, THERE'S NO PER-ENDPOINT TIME IN RANGE MODE.
                    enabled: this.validatorHandle.validateBoolean(time?.enabled, false),
                    use12Hour: this.validatorHandle.validateBoolean(time?.use12Hour, false),
                    minuteStep,
                    // FIRES ON ANY HOUR/MINUTE/PERIOD CHANGE - onSelectHour/onSelectMinute BELOW ARE THE MORE
                    // GRANULAR VERSIONS THAT FIRE ONLY FOR THEIR OWN WHEEL; onClickTime FIRES SEPARATELY WHEN
                    // THE TRIGGER ITSELF IS CLICKED (WHICH ALSO APPLIES THE CURRENT VALUE EVEN IF NEITHER WHEEL
                    // WAS EVER TOUCHED - SEE EventHandler.handlerClickTimeToNav)
                    onTimeChange: this.validatorHandle.validateFunction(time?.onTimeChange),
                    onClickTime: this.validatorHandle.validateFunction(time?.onClickTime),
                    onSelectHour: this.validatorHandle.validateFunction(time?.onSelectHour),
                    onSelectMinute: this.validatorHandle.validateFunction(time?.onSelectMinute),
                    // RESOLVED ONCE HERE (NOT A THIRD year-STYLE NESTING LEVEL) - GLOBAL hourLimits/minuteLimits
                    // PLUS AN OPTIONAL PER-WEEKDAY hourLimits OVERRIDE, KEYED BY Date.getDay() (SEE
                    // ConfigManager.processTimeLimits)
                    processedLimits: timeProcessedLimits,
                    // HIDDEN VALUES (NOT FROM CONFIG) - ALWAYS INITIALIZED FROM openCalendar, MIRRORING
                    // year.handler.activeYear/month.handler.activeMonth. activeMinute IS FLOOR-SNAPPED TO
                    // THE NEAREST VALID STEP, MATCHING THE EXISTING rangeMinDays/rangeStepDays FLOOR-SNAP
                    // CONVENTION (NOT ROUND-TO-NEAREST), THEN BOTH ARE CLAMPED AGAINST time.limits (SEE ABOVE).
                    handler: {
                        activeHour: initialActiveHour,
                        activeMinute: initialActiveMinute,
                    },
                },
            }

            // INSTANCE-STYLE CONVENIENCE METHODS - PURE DELEGATION TO THE CONTROLLER METHODS OF THE SAME NAME,
            // SO `cal.disableCalendar()` AND `calendarController.disableCalendar(cal.id)` ARE EQUIVALENT.
            // NAMED TO MATCH THE CONTROLLER METHODS EXACTLY (NOT E.G. `disable`) TO AVOID COLLIDING WITH THE
            // EXISTING `config.disable` SETTINGS SUB-OBJECT ({behavior, message, spinner, overlay})
            config.disableCalendar = (options) => this.disableCalendar(config.id, options);
            config.enableCalendar = () => this.enableCalendar(config.id);
            config.setOpenCalendar = (date) => this.setOpenCalendar(config.id, date);
            config.updateYearLimits = (year) => this.updateYearLimits(config.id, year);
            config.destroyCalendar = () => this.destroyCalendar(config.id);

            this.savedData.push({ id: config.id, data: [] });
            this.configurations.push(config);

            Calendar_Controller.domReadyPromise.then(() => this.activate(config));

            // return this.configManager.getSavedDataOfCurrentConfigId(config.id);
            return this.configManager.getConfigById(config.id);
        } catch (e) {
            console.error(`VFZ_Calendar: ${e}`);
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

    // RESET AN UNFINISHED RANGE SELECTION - JUMPING THE VIEW OR CHANGING LIMITS INVALIDATES ITS CONTEXT
    // (A COMPLETED RANGE IS LEFT UNTOUCHED - THAT'S A CONFIRMED USER CHOICE, NOT IN-PROGRESS STATE)
    resetInProgressRangeIfAny(config) {
        if (config.day.handler.rangeState === 'selecting') {
            config.day.handler.rangeState = 'idle';
            config.day.handler.rangeStart = null;
        }
    }

    // PROGRAMMATICALLY NAVIGATE AN ALREADY-RENDERED CALENDAR TO A SPECIFIC MONTH/YEAR
    setOpenCalendar(id, date) {
        const config = this.configManager.getConfigById(id);
        if (!config) {
            console.error(`VFZ_Calendar: No calendar found with ID '${id}'`);
            return;
        }

        let newDate = this.validatorHandle.validateDate(date, config.openCalendar);
        newDate = this.configManager.modifyOpenCalendarIfNeedItAfterLimits(config.processedLimits, newDate);
        config.openCalendar = newDate;

        this.resetInProgressRangeIfAny(config);

        this.eventHandler.rerenderMonthAndHeader(config);
    }

    // UPDATE THE YEAR/MONTH/DAY LIMITS OF AN ALREADY-RENDERED CALENDAR (E.G. A LINKED START/END-DATE PICKER PAIR)
    updateYearLimits(id, year) {
        const config = this.configManager.getConfigById(id);
        if (!config) {
            console.error(`VFZ_Calendar: No calendar found with ID '${id}'`);
            return;
        }

        const [processedLimits, openCalendar] = this.configManager.processConfigLimits({ openCalendar: config.openCalendar, year, month: null, day: null });
        config.processedLimits = processedLimits;
        config.openCalendar = openCalendar;

        this.resetInProgressRangeIfAny(config);

        this.eventHandler.rerenderMonthAndHeader(config);
        this.domManager.rebuildYearsPicker(config);
    }

    // PAUSE INTERACTION ON AN ALREADY-RENDERED CALENDAR (E.G. WHILE AN ASYNC SAVE IS IN FLIGHT)
    // options.showLoader (default true) TOGGLES THE VISUAL SPINNER OVERLAY - INTERACTION IS BLOCKED EITHER WAY
    disableCalendar(id, options = {}) {
        const config = this.configManager.getConfigById(id);
        if (!config) {
            console.error(`VFZ_Calendar: No calendar found with ID '${id}'`);
            return;
        }

        config.disabled = true;
        this.domManager.setLoaderVisible(config, this.validatorHandle.validateBoolean(options.showLoader, true));
    }

    enableCalendar(id) {
        const config = this.configManager.getConfigById(id);
        if (!config) {
            console.error(`VFZ_Calendar: No calendar found with ID '${id}'`);
            return;
        }

        config.disabled = false;
        this.domManager.setLoaderVisible(config, false);
    }

    // PERMANENTLY TEARS DOWN A CALENDAR: REMOVES ITS DOM, LISTENERS, AND TRACKED STATE.
    // THE SHARED mobileLayerWrap IS DELIBERATELY LEFT ALONE - OTHER CALENDARS MAY STILL USE IT.
    // THE ATTACHED INPUT IS FREED (FLAG CLASS + readOnly/disabled RESET) SO IT CAN BE RE-ATTACHED AFTERWARD.
    destroyCalendar(id) {
        const config = this.configManager.getConfigById(id);
        if (!config) {
            console.error(`VFZ_Calendar: No calendar found with ID '${id}'`);
            return;
        }

        this.eventHandler.removePreviousCalendarEventListeners(config);

        if (config.coreElements?.calendarWrap) {
            config.coreElements.calendarWrap.remove();
        }

        const input = config.inputToAttach;
        input.classList.remove(this.flagClassToAvoidDuplicates);
        const tagName = input.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
            input.readOnly = false;
        }
        else if (tagName === 'select' || tagName === 'button') {
            input.disabled = false;
        }

        this.configurations = this.configurations.filter(c => c.id !== id);
        this.savedData = this.savedData.filter(d => d.id !== id);
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
                console.warn(`VFZ_Calendar: The needed css file for the ZembiS_Calendar script, is not included in your code.\nAdd to the head of your page, before the js script the following:\n<link rel="stylesheet" href="https://zembi.github.io/ZembiS_Calendar/Assets/CSS/calendar.css">`);
                return;
            }
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', resolve);
        }
    });
}

// PUBLIC ENTRY POINT - THE ONLY THING CONSUMERS SHOULD TOUCH
{
    window.ZembiS_Calendar = class {
        #controller;

        constructor(config) {
            this.#controller = new Calendar_Controller();
        }

        renderCalendar(config) {
            return this.#controller.createCalendar(config);
        }

        disableCalendar(id, options) {
            return this.#controller.disableCalendar(id, options);
        }

        enableCalendar(id) {
            return this.#controller.enableCalendar(id);
        }

        setOpenCalendar(id, date) {
            return this.#controller.setOpenCalendar(id, date);
        }

        updateYearLimits(id, year) {
            return this.#controller.updateYearLimits(id, year);
        }

        destroyCalendar(id) {
            return this.#controller.destroyCalendar(id);
        }
    }
}