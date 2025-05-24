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
        this.eventHandler.setupEventDelegation();
    }

    languageConfiguration(extraLanguages, weekStartDay) {
        const htmlLang = document.querySelector('html').lang;
        switch (htmlLang) {
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

        if (extraLanguages) {
            if (extraLanguages[htmlLang]) {
                this.dateManager.months = extraLanguages[htmlLang].months;
                this.dateManager.weekDays = extraLanguages[htmlLang].weekDays;
                this.dateManager.buttons.currentDate = extraLanguages[htmlLang].today;
            }
        }

        this.dateManager.weekDays = [...this.dateManager.weekDays.slice(weekStartDay), ...this.dateManager.weekDays.slice(0, weekStartDay)];
    }

    // --------------- RENDER FOR INPUT DATE ---------------
    createCalendar({
        inputToAttach = null,
        inputPlaceholder = 'Pick a date',
        openCalendar = new Date(),
        weekStartDay = -1,
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
        day = null
    }) {
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

            if (weekStartDay < 0 || weekStartDay > 6) {
                console.warn('Invalid week start day');
                weekStartDay = 1;
            }

            this.languageConfiguration(extraLanguages, weekStartDay);

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
                rules: {
                    weekStartDay,
                    displayPreviousMonth: this.validatorHandle.validateBoolean(displayPreviousMonth, true),
                    displayNextMonth: this.validatorHandle.validateBoolean(displayNextMonth, true),
                },
                navigation: {
                    activeArrows: this.validatorHandle.validateBoolean(navigation?.activeArrows, true),
                },
                cursorEffect: this.validatorHandle.validateBoolean(cursorEffect, true),
                style: {
                    includeFadedDays: this.validatorHandle.validateBoolean(style?.includeFadedDays, true),
                    transitions: {
                        fadeDatePicker: this.validatorHandle.validateInteger(style?.transitions?.fadeDatePicker, 0),
                        fadeYearPicker: this.validatorHandle.validateInteger(style?.transitions?.fadeYearPicker, 0),
                        cursorEffectDelay: this.validatorHandle.validateInteger(style?.transitions?.cursorEffectDelay, 0),
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
                    onClickDay: this.validatorHandle.validateFunction(day?.onClickDay),
                    myClass: this.validatorHandle.validateString(day?.myClass, ''),
                    // HIDDEN VALUES (NOT FROM CONFIG)
                    handler: {
                        previousDay: null,
                        currentDay: null,
                        activeDate: null,
                    },
                },
            }

            this.savedData.push({ id: config.id, data: [] });
            this.configurations.push(config);

            Calendar_Controller.domReadyPromise.then(() => this.activate(config));

            // return this.configManager.getSavedDataOfCurrentConfigId(config.id);
            return this.configManager.getConfigById(config.id);
        } catch (e) {
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
        } else {
            document.addEventListener('DOMContentLoaded', resolve);
        }
    });
}