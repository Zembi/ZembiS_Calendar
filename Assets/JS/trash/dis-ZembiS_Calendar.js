
{
    window.ZembiS_Calendar = class {
        // PRIVATE VARIABLES
        #ccn;
        #flagClassToAvoidDuplicates;
        #downLimit;
        #upLimit;
        #acceptedFormats = [
            'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'YYYY-DD-MM',
            'DD-MM-YY', 'MM-DD-YY', 'YY-MM-DD', 'YY-DD-MM',
            'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'YYYY/DD/MM',
            'DD/MM/YY', 'MM/DD/YY', 'YY/MM/DD', 'YY/DD/MM',
        ];

        #months = [];
        #monthsForUse = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        #weekDays = [];

        // DOMCONTENTLOAD CHECKER SO AS TO AVOID MULTIPLE LISTENERS 
        static #domReadyPromise = new Promise(resolve => {
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

        // IMPORTANT TO REMOVE MOUSE EVENT LISTENER IF THERE IS NO CURSOR
        #mouseMoveEventsDelegation;
        #mousemoveListenerAdded = false;

        // HERE ADD THE CONFIGURATIONS OF EACH INPUT ACTION
        #savedData;
        #configurations = [];

        constructor() {
            this.#ccn = 'calendar_vfz';
            this.#flagClassToAvoidDuplicates = this.#generateUniqueIds(30, 'vfzembiSCal_');
            this.#downLimit = 100;
            this.#upLimit = 100;

            this.#mouseMoveEventsDelegation = '';
            this.#savedData = [];
            this.#ensureFirstTimeActions();
        }

        #ensureFirstTimeActions() {
            ZembiS_Calendar.#domReadyPromise.then(() => this.#firstTimeActions());
        }

        #firstTimeActions() {
            this.#languageConfiguration();
            this.#setupEventDelegation();
        }

        #languageConfiguration() {
            switch (document.querySelector('html').lang) {
                case 'el':
                    this.#months = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
                    this.#weekDays = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
                    break;
                case 'en':
                case '':
                    this.#months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    this.#weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    break;
                default:
                    break;
            }
        }


        // --------------- RENDER FOR INPUT DATE ---------------
        renderCalendar({ inputToAttach = null, inputPlaceholder = 'Pick a date', openCalendar = new Date(), initDate = false, dateFormat = 'DD-MM-YYYY', clickable = true, dateLimits = null, year = null, month = null, day = null, navigation = null, style = null, animate = null, cursorEffect = true }) {
            // CORE PROPERTY
            const givenInput = this.#validateString(inputToAttach);

            // PREVENT INPUT TO BE ATTACHED TO TWO A CALENDAR
            const existingConfig = this.#configurations.find(c => c.inputToAttach === givenInput);
            if (existingConfig) {
                console.error('This input is already attached to a calendar. Detach it before rendering a new one.');
                return existingConfig;
            }
            try {
                if (!givenInput) {
                    console.error('Invalid input element selector trying to be attached to ZembiS_Calendar');
                    return;
                }


                const dLimits = this.#validateDateLimits(dateLimits);

                // VALIDATE OPTIONS (IF NOT, INIATE DEFAULT VALUES)
                const config = {
                    id: this.#generateUniqueIds(25),
                    inputToAttach: givenInput,
                    inputPlaceholder: this.#validateString(inputPlaceholder, 'Pick a date'),
                    openCalendar: this.#validateDate(openCalendar),
                    initDate: this.#validateBoolean(initDate, false),
                    dateFormat: this.#validateDateFormat(dateFormat.toUpperCase(), 'DD-MM-YYYY'),
                    clickable: this.#validateBoolean(clickable, true),
                    dateLimits: {
                        ...dLimits
                    },
                    year: {
                        clickable: this.#validateBoolean(year?.clickable, true),
                    },
                    month: {
                        clickable: this.#validateBoolean(month?.clickable, true),
                    },
                    day: {
                        clickable: this.#validateBoolean(day?.clickable, true),
                        reClickable: this.#validateBoolean(day?.reClickable, false),
                        closeOnClickDay: this.#validateBoolean(day?.closeOnClickDay, true),
                        onClickDay: this.#validateFunction(day?.onClickDay),
                        myClass: this.#validateString(day?.myClass, ''),
                    },
                    daysHandler: {
                        previousDay: null,
                        currentDay: null,
                        activeDate: null,
                    },
                    navigation: {
                        visibleArrows: this.#validateBoolean(navigation?.visibleArrows, true),
                    },
                    style: {
                        text: this.#validateString(style?.text, ''),
                    },
                    animate: {
                        fadeDatePicker: this.#validateInteger(animate?.fadeDatePicker, 0),
                        fadeYearPicker: this.#validateInteger(animate?.fadeYearPicker, 0),
                        cursorEffectDelay: this.#validateInteger(animate?.cursorEffectDelay, 0),
                    },
                    cursorEffect: this.#validateBoolean(cursorEffect, true),
                }

                this.#savedData.push({ id: config.id, data: [] });
                this.#configurations.push(config);

                ZembiS_Calendar.#domReadyPromise.then(() => this.#activate(config));

                return this.#getSavedDataOfCurrentConfigId(config.id)[0];
            }
            catch (e) {
                console.error(e);
                return;
            }
        }

        #validateDateLimits(dateLimits) {
            const today = new Date();
            const hundredYearsBack = new Date(today.getFullYear() - this.#downLimit, today.getMonth(), today.getDate());
            const hundredYearsForward = new Date(today.getFullYear() + this.#upLimit, today.getMonth(), today.getDate());

            let startFromDate = this.#validateDate(dateLimits?.startFromDate, hundredYearsBack);
            let untilDate = this.#validateDate(dateLimits?.untilDate, hundredYearsForward);

            if (startFromDate < hundredYearsBack) {
                startFromDate = hundredYearsBack;
            }
            if (untilDate > hundredYearsForward) {
                untilDate = hundredYearsForward;
            }

            // IF INVALID USER LIMITS KEEP THE DEFAULT
            if (startFromDate > untilDate) {
                startFromDate = hundredYearsBack;
                untilDate = hundredYearsForward;
            }

            return {
                startFromDate: startFromDate,
                untilDate: untilDate
            }
        }

        #ifFirefox() {
            return typeof InstallTrigger !== 'undefined';
        }

        // VALIDATOR FUNCTIONS
        #validateDate(date, defaultDate = new Date()) {
            return !isNaN(date?.getTime()) ? date : defaultDate;
        }
        #clampDate(date, min, max) {
            return new Date(Math.max(min, Math.min(max, date)));
        }
        #validateString(string, ifNotValid = null) {
            return typeof string === 'string' || string instanceof String ? string : ifNotValid;
        }
        #validateBoolean(boolean, ifNotValid = false) {
            return typeof boolean === 'boolean' ? boolean : ifNotValid;
        }
        #validateInteger(integer, ifNotValid = null) {
            return Number.isInteger(integer) ? integer : ifNotValid;
        }
        #validateFunction(funct) {
            return typeof funct === "function" ? funct : null;
        }
        #validateDateFormat(givenFormat, defaultFormat = 'DD-MM-YYYY') {
            return this.#acceptedFormats.includes(givenFormat) ? givenFormat : defaultFormat;
        }
        #formatDate(config, day, month, year) {
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

        #validateIfInputIsAcceptable(config) {
            const input = document.querySelector(config.inputToAttach);
            if (input) {
                if (input.classList.contains(this.#flagClassToAvoidDuplicates)) {
                    console.error(`Element '${config.inputToAttach}' is already attached to ZembiS_Calendar.`);
                    return false;
                }

                config.inputToAttach = input;
                input.classList.add(this.#flagClassToAvoidDuplicates);
                return true;
            }
            console.error(`No element '${config.inputToAttach}' was found, to be attached to ZembiS_Calendar.`);
            return false;
        }

        #generateUniqueIds(length, startingIdString = '') {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            let result = startingIdString + letters[Math.floor(Math.random() * letters.length)];

            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (let i = 1; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * chars.length);
                result += chars[randomIndex];
            }
            return result;
        }

        // ACTIVATES THE FUNCTIONALITY (USED FOR BOTH RENDERED AND MODIFIED FUNCTIONS)
        #activate(config) {
            // MAKE SURE TO CHECK IF INPUT IS READY FOR USE
            if (this.#validateIfInputIsAcceptable(config)) {
                this.#createOrUpdateInputCalendar(config);
            }
        }

        #handleInputsBehaviorWithCalendarElement(config) {
            const targetInput = config.inputToAttach;

            if (!config.functionsHandler) {
                config.functionsHandler = {};
            }

            config.functionsHandler._calendarClickHandler = (event) => {
                const isTargetInput = event.target === targetInput;
                const isInsideCalendar = config.coreElements.calendarWrap.contains(event.target);

                if (isTargetInput) {
                    this.#openElement(config.coreElements.calendarWrap);
                    this.#openElement(config.coreElements.calendarInnerWrap);
                    this.#openElement(config.coreElements.mobileLayerWrap);

                    // ADD CALENDAR TO THE CORRECT POSITION, IF NOT MOBILE
                    const rect = targetInput.getBoundingClientRect();
                    config.coreElements.calendarWrap.style.top = `${rect.bottom + window.scrollY}px`;
                    config.coreElements.calendarWrap.style.left = `${rect.left + window.scrollX}px`;
                }
                else if (!isInsideCalendar) {
                    this.#closeAllCoreElements(config);
                }
            };

            // DISPLAY FIELD ON FOCUS AND HIDE IT IF NEEDED - OPTIMIZED CODE AI
            document.addEventListener('click', config.functionsHandler._calendarClickHandler);

            // PREVENT HIDE CALENDAR IF CLICKING INSIDE IT (ITS ELEMENTS) **REMOVED BECAUSE THERE IS ONE LISTENER GENERALLY AND IT WAS IN CONFLICT**
            // calendarWrap.addEventListener('click', (e) => e.stopPropagation());
        }

        #closeAllCoreElements(config) {
            this.#closeElement(config.coreElements.calendarWrap);
            this.#closeElement(config.coreElements.calendarInnerWrap);
            this.#closeElement(config.coreElements.yearsWrap);
            this.#closeElement(config.coreElements.mobileLayerWrap);
        }

        #closeElement(element) {
            if (element) {
                element.classList.add(`${this.#ccn}_close_status`);
            }
        }

        #openElement(element) {
            if (element) {
                element.classList.remove(`${this.#ccn}_close_status`);
            }
        }

        #removePreviousCalendarEventListeners(config) {
            if (config.functionsHandler) {
                if (config.functionsHandler._calendarClickHandler) {
                    document.removeEventListener('click', config.functionsHandler._calendarClickHandler);
                    config.functionsHandler._calendarClickHandler = null;
                }
            }
        }

        // STARTING ACTIONS AFTER RENDER, TO BUILD THE STARTING CORE OF THE CALENDAR 
        #createOrUpdateInputCalendar(config) {
            this.#prepareInputField(config);
            const outerWrap = this.#createOuterWrap(config);

            this.#removePreviousCalendarEventListeners(config);

            const dateLimits = this.#getDateLimits(config);
            config.openCalendar = this.#clampDate(config.openCalendar, dateLimits.minDate, dateLimits.maxDate);

            const wraps = this.#createWrap(outerWrap);
            this.#monthHeader(config, wraps[1]);

            const monthBody = this.#createMonthBody(wraps[1]);
            this.#eachMonthBody(config, monthBody);


            let yearsWrap = null;
            if (config.clickable && config.year.clickable) {
                yearsWrap = this.#createYearsWrap(config, outerWrap);
                const minYear = config.dateLimits.startFromDate.getFullYear();
                const maxYear = config.dateLimits.untilDate.getFullYear();
                this.#createAllYearChoices(config, minYear, maxYear, yearsWrap);
            }


            let mobileLayerWrap = document.querySelector(`${this.#ccn}_overlay_for_mobile`);
            if (!mobileLayerWrap) {
                mobileLayerWrap = this.#createMobileOverlay();
            }

            config.coreElements = {
                calendarWrap: outerWrap,
                calendarInnerWrap: wraps[0],
                yearsWrap,
                mobileLayerWrap
            };

            this.#handleInputsBehaviorWithCalendarElement(config);
        }

        #prepareInputField(config) {
            const typeOfInput = config.inputToAttach.tagName.toLowerCase();
            if (typeOfInput === 'input') {
                config.inputToAttach.type = "text";
                config.inputToAttach.readOnly = true;
                config.inputToAttach.placeholder = config.inputPlaceholder;
            }
        }

        #createOuterWrap(config) {
            const outerWrap = document.createElement('div');
            outerWrap.className = `input_${this.#ccn}_outer_wrap`;
            outerWrap.id = config.id;
            outerWrap.style.transition = `opacity ${config.animate.fadeDatePicker}ms`;
            document.body.appendChild(outerWrap);
            document.body.append(outerWrap);
            this.#closeElement(outerWrap);
            return outerWrap;
        }

        #addCursorFollowInYear(config, yearsContainer) {
            const cursor = document.createElement('span');
            cursor.className = `${this.#ccn}_cursor_to_follow`;
            cursor.style.transition = `
            top ${config.animate.cursorEffectDelay}ms, 
            left ${config.animate.cursorEffectDelay}ms, 
            opacity 0.1s
        `;
            yearsContainer.appendChild(cursor);
        }

        #getDateLimits(config) {
            const today = new Date();
            const fromDate = new Date(today.getFullYear() - this.#downLimit, today.getMonth());
            const untilDate = new Date(today.getFullYear() + this.#upLimit, today.getMonth());
            return {
                minDate: config.dateLimits.startFromDate || fromDate,
                maxDate: config.dateLimits.untilDate || untilDate
            };
        }

        #createWrap(outerWrap) {
            const innerCalendar = document.createElement('div');
            innerCalendar.className = `input_${this.#ccn}_inner_calendar`;
            outerWrap.appendChild(innerCalendar);

            const wrap = document.createElement('div');
            wrap.className = `input_${this.#ccn}_wrap`;
            innerCalendar.appendChild(wrap);
            return [innerCalendar, wrap];
        }

        #createYearsWrap(config, outerWrap) {
            const yearsWrap = document.createElement('div');
            yearsWrap.className = `${this.#ccn}_years_wrap`;
            yearsWrap.style.transition = `
            opacity ${config.animate.fadeYearPicker}ms, 
            visibility ${config.animate.fadeYearPicker}ms, 
            transform ${config.animate.fadeYearPicker}ms
        `;

            outerWrap.appendChild(yearsWrap);

            this.#closeElement(yearsWrap);

            ZembiS_Calendar.#domReadyPromise.then(() => {
                if (this.#ifFirefox() && yearsWrap) {
                    yearsWrap.classList.add('firefox-scroll');
                }
            });

            return yearsWrap;
        }

        #createAllYearChoices(config, min, max, yearsWrap) {
            const yearsContainer = document.createElement('div');
            yearsContainer.className = `${this.#ccn}_years_container`;

            for (let year = min; year <= max; year++) {
                const yearElement = document.createElement('span');
                let activeClass = '';
                if (config.openCalendar.getFullYear() === year) {
                    activeClass = ` ${this.#ccn}_active_year`;
                }
                yearElement.className = `${this.#ccn}_year${activeClass}`;
                yearElement.textContent = year;
                yearElement.setAttribute('data-year', year);

                yearsContainer.appendChild(yearElement);
            }

            if (config.cursorEffect) {
                this.#addCursorFollowInYear(config, yearsContainer);
            }

            yearsWrap.appendChild(yearsContainer);
        }

        #createMobileOverlay() {
            const mobileLayerWrap = document.createElement('div');
            mobileLayerWrap.className = `${this.#ccn}_overlay_for_mobile`;
            document.body.appendChild(mobileLayerWrap);
            this.#closeElement(mobileLayerWrap);
            return mobileLayerWrap;
        }

        #createMonthBody(wrap) {
            const monthBody = document.createElement('div');
            monthBody.className = `${this.#ccn}_month_body`;
            wrap.appendChild(monthBody);
            return monthBody;
        }

        // HANDLES THE FUNCTIONALITY OF THE CALENDAR'S HEADER
        #addNavigationButtons(config, parentLeftArrow, parentRightArrow) {
            const colorOfArrows = 'black';
            const svgRestTag = `version="1.1" id="icons_1_" xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 128 128" style="enable-background:new 0 0 128 128" xml:space="preserve"><style>.st0{display:none}.st1{display:inline}</style><g id="row2_1_"><g id="_x32__4_"><path class="st2" d="M64 .3C28.7.3 0 28.8 0 64s28.7 63.7 64 63.7 64-28.5 64-63.7S99.3.3 64 .3zm0 121C32.2 121.3 6.4 95.7 6.4 64 6.4 32.3 32.2 6.7 64 6.7s57.6 25.7 57.6 57.3c0 31.7-25.8 57.3-57.6 57.3zm22.4-63.7H57.6l12.3-15.2c0-2.2-1.8-3.9-3.9-3.9h-7.1L32 64l26.8 25.5H66c2.2 0 3.9-1.8 3.9-3.9L57.1 69.9h28.6c2.2 0 3.9-1.8 3.9-3.9v-4c0-2.1-1-4.4-3.2-4.4z" id="left_1_"/></g></g></svg>`;


            const leftArrow = document.createElement('a');
            leftArrow.className = `input_${this.#ccn}_nav_arrow input_${this.#ccn}_left_arrow`;
            leftArrow.id = `calendar_${config.id}_left_arrow`;
            leftArrow.name = 'left_arrow';
            leftArrow.innerHTML = `<svg class="input_${this.#ccn}_arrow_image" alt="left_arrow" ${svgRestTag}`;
            parentLeftArrow.appendChild(leftArrow);

            const rightArrow = document.createElement('a');
            rightArrow.className = `input_${this.#ccn}_nav_arrow input_${this.#ccn}_right_arrow`;
            rightArrow.id = `calendar_${config.id}_right_arrow`;
            rightArrow.name = 'right_arrow';
            rightArrow.innerHTML = `<svg class="input_${this.#ccn}_arrow_image" alt="right_arrow" ${svgRestTag}`;
            parentRightArrow.appendChild(rightArrow);
        }

        // TRIGGERS WHEN USER CLICKS ARROWS TO GO TO THE NEXT OR THE PREVIOUS MONTH
        #navigateMonth(config, direction) {
            const currentDate = config.openCalendar;
            const newMonth = currentDate.getMonth() + direction;
            const newYear = currentDate.getFullYear();
            let potentialNewDate = new Date(newYear, newMonth);

            if (config.dateLimits.startFromDate || config.dateLimits.untilDate) {
                const clampedDate = this.#clampDate(
                    potentialNewDate,
                    config.dateLimits.startFromDate ? new Date(config.dateLimits.startFromDate.getFullYear(), config.dateLimits.startFromDate.getMonth()) : potentialNewDate,
                    config.dateLimits.untilDate ? new Date(config.dateLimits.untilDate.getFullYear(), config.dateLimits.untilDate.getMonth()) : potentialNewDate
                );
                potentialNewDate = clampedDate;
            }

            // const lett = new Date();
            console.log(config.openCalendar);
            console.log(currentDate);
            console.log(potentialNewDate);
            // if (config.openCalendar === currentDate) return;

            config.openCalendar = potentialNewDate;

            this.#removeDayEventListener(config);

            const calendarElement = config.coreElements.calendarWrap;
            const monthBody = calendarElement.querySelector(`.${this.#ccn}_month_body`);
            const header = calendarElement.querySelector(`.${this.#ccn}_month_header_title_wrap`);

            if (monthBody) {
                this.#eachMonthBody(config, monthBody);
            }
            if (header) {
                const month = this.#months[config.openCalendar.getMonth()];
                const year = config.openCalendar.getFullYear();

                header.innerHTML = this.#returnMonthYear(config, month, year);
            }
        }

        #removeDayEventListener(config) {
            const calendarBody = document.querySelector(`#${config.id} .${this.#ccn}_month_body`);

            if (calendarBody) {
                // REMOVE PREVIOUSLY calendarBody ENTIRELY (AND ITS ATTACHED LISTENERS), THE RE-RENDER THE MONTH
                calendarBody.innerHTML = '';
                calendarBody.dataset.listenerAdded = "";
            }
        }

        #returnMonthYear(config, month, year) {
            let clickableYear = '';
            if (config.clickable && config.year.clickable) {
                clickableYear = `${this.#ccn}_clickable`;
            }

            return `
            <div class="${this.#ccn}_month_header_title">
                <span aria-label="${month} ${year}">${month}</span>
            </div>
            <div class="${this.#ccn}_year_header_title_wrap">
                <span class="${this.#ccn}_year_header_title ${clickableYear}" id="calendar_${config.id}_year" aria-label="Year input" data-min="${year - this.#downLimit}" data-max="${year + this.#upLimit}">${year}</span>
            </div>
        `;
        }

        #monthHeader(config, parentEl) {
            const wrap = document.createElement('div');
            wrap.className = `${this.#ccn}_month_header_wrap`;
            parentEl.appendChild(wrap);

            const month = this.#months[config.openCalendar.getMonth()];
            const year = config.openCalendar.getFullYear();

            wrap.innerHTML += `
            <div class="${this.#ccn}_month_header_title_outer_wrap">
                <div id="calendar_${config.id}_left_arrow_parent" class="${this.#ccn}_header_left_arrow_wrap"></div>
                <div class="${this.#ccn}_month_header_title_wrap">
                    ${this.#returnMonthYear(config, month, year)}
                </div>
                <div id="calendar_${config.id}_right_arrow_parent" class="${this.#ccn}_header_right_arrow_wrap"></div>
            </div>
        `;

            if (config.clickable && config.navigation.visibleArrows) {
                const leftArrowParent = document.getElementById(`calendar_${config.id}_left_arrow_parent`);
                const rightArrowParent = document.getElementById(`calendar_${config.id}_right_arrow_parent`);
                this.#addNavigationButtons(config, leftArrowParent, rightArrowParent);
            }

            this.#staticWeekDaysHeaderOfMonth(wrap);
        }

        #removeGreekTones(text) {
            const normalizedText = text.normalize("NFD");
            return normalizedText.replace(/[\u0300-\u036f]/g, "");
        }

        #staticWeekDaysHeaderOfMonth(parentEl) {
            const monthHeader = document.createElement('div');
            monthHeader.className = `${this.#ccn}_month_header`;
            parentEl.appendChild(monthHeader);

            let htmlForMonthHeader = '';
            for (let weekDay = 0; weekDay < 7; weekDay++) {
                const weekDayStr = this.#weekDays[weekDay];
                let weekDaysDisplayed = weekDayStr.substring(0, 2);
                weekDaysDisplayed = this.#removeGreekTones(weekDaysDisplayed);

                htmlForMonthHeader += `
                <span class="${this.#ccn}_day_header" aria-label="${weekDayStr}">
                    ${weekDaysDisplayed}
                </span>`;
            }
            monthHeader.innerHTML = htmlForMonthHeader;
        }

        #getCustomDayClasses(config) {
            let customClass = '';
            const classes = config.day.myClass.split(' ');
            classes.forEach((eachClass) => {
                if (eachClass !== '') {
                    customClass += ` ${eachClass}`;
                }
            });
            return customClass;
        }

        // RE RENDERS WHEN CHANGING MONTHS
        #eachMonthBody(config, parentEl) {
            const month = (config.openCalendar.getMonth() + 1), year = config.openCalendar.getFullYear();

            const countDays = this.#getNumOfDaysInMonth(month, year);

            let htmlForMonthBody = this.#startDaysOfMonthFromCorrectWeekDay(this.#getFirstDayOfMonth(month, year));

            const customClasses = this.#getCustomDayClasses(config);

            config.daysHandler.previousDay = null;
            config.daysHandler.currentDay = null;
            for (let day = 1; day <= countDays; day++) {
                config.daysHandler.currentDay = day;

                const currentMonthCheck = this.#compareTwoDates(new Date(`${year}-${month}-${day}`), new Date());
                let currentDayClass = '';
                if (currentMonthCheck) {
                    currentDayClass += ` ${this.#ccn}_current_day`;
                }

                let data = '';
                let clickableClassData = '';
                let restData = '';

                if (config.clickable && config.day.clickable) {
                    clickableClassData = `${this.#ccn}_clickable`;
                    restData = `aria-checked="false"`;
                }

                const formattedDate = this.#formatDate(config, day, month, year);
                data = `class="${this.#ccn}_day ${clickableClassData}${customClasses}${currentDayClass}" data-day="${day}" data-date="${formattedDate}" aria-label="${day} ${this.#monthsForUse[month - 1]} ${year}" ${restData}`;

                htmlForMonthBody += `
            <span ${data} >
            ${day}
                </span> `;
            }

            parentEl.innerHTML = htmlForMonthBody;


            // ADD ACTIVE TO CURRENT DATE IF CALENDAR IS OPENED TO THAT DATE (OTHERWISE ON RE RENDER THE ACTIVE DATE WILL NOT DISPLAY IT)
            if (config.daysHandler.activeDate) {
                const activeYear = config.daysHandler.activeDate.getFullYear();
                const activeMonth = config.daysHandler.activeDate.getMonth() + 1;
                const activeDay = config.daysHandler.activeDate.getDate();
                const formattedActiveDate = this.#formatDate(config, activeDay, activeMonth, activeYear);
                const initDateElement = document.querySelector(`#${config.id} [data-date="${formattedActiveDate}"]`);
                if (initDateElement) {
                    this.#onClickDayAction(initDateElement, config, false);
                }
            }


            // ONLY USE FOR THE INIT CONSTRUCTION
            if (config.initDate) {
                const day = config.openCalendar.getDate();
                const formattedDate = this.#formatDate(config, day, month, year);
                const initDateElement = document.querySelector(`#${config.id} [data-date="${formattedDate}"]`)
                this.#onClickDayAction(initDateElement, config, false);
                config.initDate = false;
            }
        }

        #getCurrentDay(d, m, y) {
            return new Date(y, m, d).getDay();
        }

        #getFirstDayOfMonth(m, y) {
            return new Date(y, m, 1).getDay();
        }

        #getNumOfDaysInMonth(m, y) {
            return new Date(y, m, 0).getDate();
        }

        #startDaysOfMonthFromCorrectWeekDay(firstDayOfMonth) {
            let html = '';
            for (let day = 0; day < firstDayOfMonth; day++) {
                html += `<span class="${this.#ccn}_day" data-day="-1"></span> `;
            }
            return html;
        }

        #compareTwoDates(date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                date1.getMonth() === date2.getMonth() &&
                date1.getDate() === date2.getDate();
        }

        // THIS IS IMPORTANT TO ENSURE THAT NO DUPLICATE LISTENERS WILL BE ADDED
        #setupEventDelegation() {
            document.addEventListener('click', (event) => {
                this.#clickEventsDelegation(event);
            });

            ZembiS_Calendar.#domReadyPromise.then(() => {
                const observer = new MutationObserver(() => {
                    const cursorEl = document.querySelector(`.input_${this.#ccn}_outer_wrap .${this.#ccn}_cursor_to_follow`);
                    if (cursorEl) {
                        if (!this.#mousemoveListenerAdded) {
                            this.#mouseMoveEventsDelegation = (event) => {
                                this.#handleMouseMove(event);
                            };
                            document.addEventListener('pointermove', this.#mouseMoveEventsDelegation);
                            this.#mousemoveListenerAdded = true;
                        }
                        observer.disconnect();
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
        #clickEventsDelegation(event) {
            const clickedEl = event.target.closest(`.input_${this.#ccn}_outer_wrap`);
            if (!clickedEl) return;

            // EVENT LISTENERS FOR NAVIGATING MONTHS
            this.#handlerClickArrowsNav(clickedEl, event);
            // EVENT LISTENERS FOR NAVIGATING TO YEARS
            this.#handlerClickYearToNav(clickedEl, event);
            // EVENT LISTENERS FOR CHOSING YEARS
            this.#handlerClickYear(clickedEl, event);
            // EVENT LISTENERS FOR SELECTING DAYS
            this.#handlerClickDay(event);
        }
        #handleMouseMove(event) {
            const cursorEl = document.querySelector(`.input_${this.#ccn}_outer_wrap .${this.#ccn}_cursor_to_follow`);
            if (!cursorEl) {
                document.removeEventListener('pointermove', this.#mouseMoveEventsDelegation);
                return;
            }

            const hoveredPicker = event.target.closest(`.input_${this.#ccn}_outer_wrap`);
            if (!hoveredPicker) return;

            this.#handlerMousemoveYear(hoveredPicker, event);
        }

        #getConfigFromClickedEl(clickedEl) {
            const calendarId = clickedEl.closest(`.input_${this.#ccn}_outer_wrap`).id;
            return this.#getConfigById(calendarId);
        }
        #getConfigById(id) {
            return this.#configurations.find(cfg => cfg.id === id);
        }

        #handlerMousemoveYear(hoveredPicker, event) {
            const yearContainerEl = event.target.closest(`.${this.#ccn}_years_container`);

            const config = this.#getConfigById(hoveredPicker.id);

            const cursorEl = document.querySelector(`#${config.id} .${this.#ccn}_cursor_to_follow`);
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

        #handlerClickArrowsNav(clickedEl, event) {
            const clickedAnArrow = event.target.closest(`.input_${this.#ccn}_nav_arrow`);
            if (!clickedAnArrow) return;

            const config = this.#getConfigById(clickedEl.id);

            let navDirection = -1;
            if (clickedAnArrow.name === 'right_arrow') {
                navDirection = 1;
            }

            this.#navigateMonth(config, navDirection);
        }

        #handlerClickYearToNav(clickedEl, event) {
            const clickedYear = event.target.closest(`.${this.#ccn}_year_header_title.${this.#ccn}_clickable`);
            if (!clickedYear) return;

            const config = this.#getConfigById(clickedEl.id);

            const yearsWrap = document.querySelector(`#${config.id} .${this.#ccn}_years_wrap`);

            if (!yearsWrap) return;

            const currentYearEl = yearsWrap.querySelector(`[data-year='${config.openCalendar.getFullYear()}']`);

            // ALWAYS SCROLL INTO CURRENT CHOSEN YEAR VIEW
            yearsWrap.classList.toggle(`${this.#ccn}_close_status`);
            // IF RENDER, SCROLL INTO VIEW
            if (!yearsWrap.classList.contains(`.${this.#ccn}_close_status`)) {
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

        #handlerClickYear(clickedEl, event) {
            const clickedYearWrap = event.target.closest(`.${this.#ccn}_years_wrap`);
            if (!clickedYearWrap) return;

            const clickedYear = event.target.closest(`.${this.#ccn}_year`);
            if (!clickedYear) return;

            const config = this.#getConfigById(clickedEl.id);

            const currentYear = config.openCalendar.getFullYear();
            const targetYear = clickedYear.getAttribute('data-year');
            const navDirection = (targetYear - currentYear) * 12;

            if (navDirection) {
                this.#navigateMonth(config, navDirection);
            }
            clickedYearWrap.classList.toggle(`${this.#ccn}_close_status`);

            const activeClass = `${this.#ccn}_active_year`;
            clickedYearWrap.querySelector(`.${activeClass}`).classList.remove(activeClass);
            clickedYear.classList.add(activeClass);
        }

        #handlerClickDay(event) {
            const clickedEl = event.target.closest(`.${this.#ccn}_day.${this.#ccn}_clickable`);
            if (!clickedEl) return;

            const pickedNumDay = clickedEl.getAttribute('data-day');

            if (pickedNumDay && parseInt(pickedNumDay, 10) !== -1) {
                const config = this.#getConfigFromClickedEl(clickedEl);

                if (config.daysHandler.currentDay !== clickedEl.getAttribute('data-day')) {
                    // CORE FUNCTIONALITY
                    this.#onClickDayAction(clickedEl, config);
                }
                else {
                    if (config.day.reClickable) {
                        // CORE FUNCTIONALITY
                        this.#onClickDayAction(clickedEl, config);
                    }
                }
            }
        }

        #onClickDayAction(clickedEl, config, runAllFunctions = true) {
            this.#clickDayCoreFunctionality(clickedEl, config);

            // HERE ADD THE CUSTOM EVENT LISTENER FROM THE USER
            if (config.day.onClickDay && runAllFunctions) {
                config.day.onClickDay(clickedEl.getAttribute('data-date'), clickedEl);
            }


            // CLOSE CALENDAR ON CLICK, IF OPTION IS ACTIVE
            if (config.day.closeOnClickDay && runAllFunctions) {
                setTimeout(() => {
                    this.#closeAllCoreElements(config);
                }, 100);
            }
        }

        #clickDayCoreFunctionality(clickedEl, config) {
            if (config.inputToAttach.hasAttribute('value')) {
                config.inputToAttach.value = clickedEl.getAttribute('data-date');
            }
            else {
                config.inputToAttach.innerText = clickedEl.getAttribute('data-date');
            }
            this.#configureActiveDay(clickedEl, config);
        }

        #configureActiveDay(clickedEl, config) {
            config.daysHandler.previousDay = config.daysHandler.currentDay;
            const previousClickedEl = document.querySelector(`#${config.id} [data-day="${config.daysHandler.previousDay}"].${this.#ccn}_day.${this.#ccn}_clickable`);
            if (previousClickedEl) {
                previousClickedEl.classList.remove(`${this.#ccn}_active_day`);
                previousClickedEl.setAttribute('aria-checked', 'false');
            }

            config.daysHandler.currentDay = clickedEl.getAttribute('data-day');
            clickedEl.classList.add(`${this.#ccn}_active_day`);
            clickedEl.setAttribute('aria-checked', 'true');

            const currentActiveDate = new Date(config.openCalendar.getFullYear(), config.openCalendar.getMonth(), config.daysHandler.currentDay);
            config.daysHandler.activeDate = currentActiveDate;
        }

        #getSavedDataOfCurrentConfigId(id) {
            return this.#savedData.filter((dataObj) => dataObj.id === id);
        }



        modifyCalendar({ id = null, openCalendar = null, dateFormat = null, clickable = null, dateLimits = null, day = null, animate = null }) {
            // CHECK IF ID EXISTS IN this.#configurations ARRAY
            const givenId = this.#validateString(id);
            try {
                if (!givenId) {
                    console.error('Invalid ID trying to be modified!');
                    return;
                }

                const config = this.#getConfigById(givenId);
                if (!config) {
                    console.error(`No calendar found with ID '${givenId}'`);
                    return;
                }

                // const today = new Date();
                // const hundredYearsBack = new Date(today.getFullYear() - this.#downLimit, today.getMonth(), today.getDate());
                // const hundredYearsForward = new Date(today.getFullYear() + this.#upLimit, today.getMonth(), today.getDate());

                // // VALIDATE NEW VALUES OR KEEP THE EXISTING ONES IF INVALID
                // let startFromDate = this.#validateDate(dateLimits?.startFromDate, config.dateLimits.startFromDate);
                // let untilDate = this.#validateDate(dateLimits?.untilDate, config.dateLimits.untilDate);

                // // ENSURE LIMITS ARE WITHIN BOUNDS
                // startFromDate = this.#clampDate(startFromDate, hundredYearsBack, hundredYearsForward);
                // untilDate = this.#clampDate(untilDate, hundredYearsBack, hundredYearsForward);

                // // AVOID StartFromDate BEING AFTER untilDate
                // if (startFromDate > untilDate) {
                //     startFromDate = config.dateLimits.startFromDate;
                //     untilDate = config.dateLimits.untilDate;
                // }

                // // VALIDATE NEW VALUES OR KEEP THE EXISTING ONES IF INVALID
                // const updatedLimits = dateLimits ? {
                //     startFromDate: this.#validateDate(dateLimits?.startFromDate, config.dateLimits.startFromDate),
                //     untilDate: this.#validateDate(dateLimits?.untilDate, config.dateLimits.untilDate),
                // } : config.dateLimits;

                // UPDATE CONFIGURATION WITH NEW VALUES
                config.openCalendar = this.#validateDate(openCalendar, config.openCalendar);
                config.dateFormat = this.#validateDateFormat(dateFormat.toUpperCase(), config.dateFormat);
                config.clickable = this.#validateBoolean(clickable, config.clickable);
                // NO UPDATE FOR CURSOR AS IT IS IMPORTANT TO INITIATE THE FUNCTIONALITY SO AS TO DECIDE IF WE WILL LOAD THE MOUSE EVENT LISTENER
                // config.dateLimits = updatedLimits;
                config.day = {
                    myClass: this.#validateString(day?.myClass, config.day.myClass),
                    clickable: this.#validateBoolean(day?.clickable, config.day.clickable),
                    onClickDay: this.#validateFunction(day?.onClickDay, config.day.onClickDay),
                };
                config.animate = {
                    fadeDatePicker: this.#validateInteger(animate?.fadeDatePicker, config.animate.fadeDatePicker),
                    fadeYearPicker: this.#validateInteger(animate?.fadeYearPicker, config.animate.fadeYearPicker),
                };

                // RE-RENDER THE CALENDAR WITH UPDATED CONFIGURATION
                ZembiS_Calendar.#domReadyPromise.then(() => this.#update(config));

                return this.#getSavedDataOfCurrentConfigId(givenId);
            }
            catch (e) {
                console.error(e);
                return;
            }
        }

        #update(config) {
            // FIND AND REMOVE OLD ELEMENTS
            const calendarElement = document.getElementById(config.id);
            if (calendarElement) {
                calendarElement.remove();
            }

            this.#createOrUpdateInputCalendar(config);
        }
    }
}

const calendarController = new ZembiS_Calendar();