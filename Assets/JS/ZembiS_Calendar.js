


class ZembiS_Calendar {
    // PRIVATE VARIABLES
    #ccn;
    #flagClassToAvoidDuplicates;
    #downLimit;
    #upLimit;

    #months = [];
    #monthsForUse = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    #weekDays = [];
    #weekDaysForUse = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // HERE ADD THE CONFIGURATIONS OF EACH INPUT ACTION
    #savedData;
    #configurations = [];

    static #isCssLoaded = false;

    constructor() {
        this.#ccn = 'calendar_vfz';
        this.#flagClassToAvoidDuplicates = this.#generateUniqueIds(30, 'vfzembiSCal_');
        this.#downLimit = 100;
        this.#upLimit = 100;

        this.#savedData = [];
        this.#ensureFirstTimeActions();

        this.#setupEventDelegation();
    }

    #ensureFirstTimeActions() {
        const action = () => this.#firstTimeActions();

        // USE THIS PRIVATE STATIC VARIABLE THAT WILL BE USED TO AVOID MULTIPLE DOMContentLoaded EVENTS TO RUN AND SO TO REDUCE THE AMOUNT OF EVENT CALLS
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            action();
        }
        else {
            // DOCUMENT STILL LOADING SO USE EVENT LISTENER AS A LAST OPTION
            document.addEventListener('DOMContentLoaded', action);
        };
    }

    #firstTimeActions() {
        this.#includeCssFile('./Assets/CSS/calendar.css', 'zembiS_Stylesheet_vW3#Dwdw12@##s');
        this.#languageConfiguration();
    }

    #includeCssFile(urlOfFile, id) {
        if (!document.getElementById(id) && !ZembiS_Calendar.#isCssLoaded) {
            const style = document.createElement('link');
            style.rel = 'stylesheet';
            style.id = id;
            style.href = urlOfFile;
            document.head.appendChild(style);

            ZembiS_Calendar.#isCssLoaded = true;
        }
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
    renderCalendar({ inputToAttach = null, startingMonthYear = new Date(), primaryColor = 'white', secondaryColor = 'grey', limits = null, day = null }) {
        // CORE PROPERTY
        const givenInput = this.#validateString(inputToAttach);
        try {
            if (!givenInput) {
                console.error('Invalid input element selector trying to be attached to ZembiS_Calendar');
                return;
            }

            const today = new Date();
            const hundredYearsBack = new Date(today.getFullYear() - this.#downLimit, today.getMonth(), today.getDate());
            const hundredYearsForward = new Date(today.getFullYear() + this.#upLimit, today.getMonth(), today.getDate());

            let startFromDate = this.#validateDate(limits?.startFromDate, hundredYearsBack);
            let untilDate = this.#validateDate(limits?.untilDate, hundredYearsForward);

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


            // VALIDATE OPTIONS (IF NOT, INIATE DEFAULT VALUES)
            const config = {
                id: this.#generateUniqueIds(25),
                inputToAttach: givenInput,
                currentMonthYear: this.#validateDate(startingMonthYear),
                primaryColor: this.#validateString(primaryColor, 'white'),
                secondaryColor: this.#validateString(secondaryColor, 'grey'),
                // OPTION LIMITS
                limits: {
                    clickable: this.#validateBoolean(limits?.clickable, true),
                    startFromDate,
                    untilDate,
                },
                day: {
                    myClass: this.#validateString(day?.myClass, ''),
                    clickable: this.#validateBoolean(day?.clickable, false),
                    onClickDay: this.#validateFunction(day?.onClickDay),
                }
            }

            this.#savedData.push({ id: config.id, data: [] });
            this.#configurations.push(config);

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                this.#activate(config);
            }
            else {
                // DOCUMENT STILL LOADING SO USE EVENT LISTENER AS A LAST OPTION
                document.addEventListener('DOMContentLoaded', () => this.#activate(config));
            }

            return this.#getSavedDataOfCurrentConfigId(config.id)[0];
        }
        catch (e) {
            console.error(e);
            return;
        }
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
    #validateFunction(funct) {
        return typeof funct === "function" ? funct : null;
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

    // ACTIVATES THE FUNCTIONALITY
    #activate(config) {
        // MAKE SURE TO CHECK IF INPUT IS READY FOR USE
        if (this.#validateIfInputIsAcceptable(config)) {
            this.#createOrUpdateInputCalendar(config);
        }
    }

    #handleInputsBehaviorWithCalendarElement(targetInput, calendarWrap) {
        // DISPLAY FIELD ON FOCUS AND HIDE IT IF NEEDED - OPTIMIZED CODE AI
        document.addEventListener('click', (e) => {
            const isTargetInput = e.target === targetInput;
            const isInsideCalendar = calendarWrap.contains(e.target);

            if (isTargetInput) {
                calendarWrap.style.display = 'block';
                const rect = targetInput.getBoundingClientRect();
                calendarWrap.style.top = `${rect.bottom + window.scrollY}px`;
                calendarWrap.style.left = `${rect.left + window.scrollX}px`;
            }
            else if (!isInsideCalendar) {
                calendarWrap.style.display = 'none';
            }
        });

        // PREVENT HIDE CALENDAR IF CLICKING INSIDE IT (ITS ELEMENTS) **REMOVED BECAUSE THERE IS ONE LISTENER GENERALLY**
        // calendarWrap.addEventListener('click', (e) => e.stopPropagation());
    }

    // STARTING ACTIONS AFTER RENDER, TO BUILD THE STARTING CORE OF THE CALENDAR 
    #createOrUpdateInputCalendar(config) {
        this.#prepareInputField(config);
        const outerWrap = this.#createOuterWrap(config);
        this.#handleInputsBehaviorWithCalendarElement(config.inputToAttach, outerWrap);

        const dateLimits = this.#getDateLimits(config);
        config.currentMonthYear = this.#clampDate(config.currentMonthYear, dateLimits.minDate, dateLimits.maxDate);

        const wrap = this.#createWrap(outerWrap);
        this.#monthHeader(config, wrap);

        const monthBody = this.#createMonthBody(wrap);
        this.#eachMonthBody(config, monthBody);
    }

    #prepareInputField(config) {
        config.inputToAttach.type = "text";
        config.inputToAttach.readOnly = true;
    }

    #createOuterWrap(config) {
        const outerWrap = document.createElement('div');
        outerWrap.className = `input_${this.#ccn}_outer_wrap`;
        outerWrap.id = config.id;
        document.body.appendChild(outerWrap);
        config.inputToAttach.parentNode.insertBefore(outerWrap, config.inputToAttach.nextSibling);
        return outerWrap;
    }

    #getDateLimits(config) {
        const today = new Date();
        const fromDate = new Date(today.getFullYear() - this.#downLimit, today.getMonth());
        const untilDate = new Date(today.getFullYear() + this.#upLimit, today.getMonth());
        return {
            minDate: config.limits.startFromDate || fromDate,
            maxDate: config.limits.untilDate || untilDate
        };
    }

    #createWrap(outerWrap) {
        const wrap = document.createElement('div');
        wrap.className = `input_${this.#ccn}_wrap`;
        outerWrap.appendChild(wrap);
        return wrap;
    }

    #createMonthBody(wrap) {
        const monthBody = document.createElement('div');
        monthBody.className = `${this.#ccn}_month_body`;
        wrap.appendChild(monthBody);
        return monthBody;
    }


    // HANDLES THE FUNCTIONALITY OF THE CALENDAR'S HEADER
    #addNavigationButtons(config, parentLeftArrow, parentRightArrow) {
        const leftArrow = document.createElement('a');
        leftArrow.className = `input_${this.#ccn}_left_arrow`;
        leftArrow.id = `calendar_${config.id}_left_arrow`;
        leftArrow.innerHTML = `<img src="./Assets/Images/arrow.png" class="input_${this.#ccn}_arrow_image"/>`;
        parentLeftArrow.appendChild(leftArrow);

        const rightArrow = document.createElement('a');
        rightArrow.className = `input_${this.#ccn}_right_arrow`;
        rightArrow.id = `calendar_${config.id}_right_arrow`;
        rightArrow.innerHTML = `<img src="./Assets/Images/arrow.png" class="input_${this.#ccn}_arrow_image"/>`;
        parentRightArrow.appendChild(rightArrow);


        // EVENT LISTENERS FOR NAVIGATING MONTHS
        leftArrow.addEventListener('click', () => this.#navigateMonth(config, -1));
        rightArrow.addEventListener('click', () => this.#navigateMonth(config, 1));
    }

    // TRIGGERS WHEN USER CLICKS ARROWS TO GO TO THE NEXT OR THE PREVIOUS MONTH
    #navigateMonth(config, direction) {
        const currentDate = config.currentMonthYear;
        const newMonth = currentDate.getMonth() + direction;
        const newYear = currentDate.getFullYear();
        const potentialNewDate = new Date(newYear, newMonth);

        if (config.limits.startFromDate || config.limits.untilDate) {
            const clampedDate = this.#clampDate(
                potentialNewDate,
                config.limits.startFromDate ? new Date(config.limits.startFromDate.getFullYear(), config.limits.startFromDate.getMonth()) : potentialNewDate,
                config.limits.untilDate ? new Date(config.limits.untilDate.getFullYear(), config.limits.untilDate.getMonth()) : potentialNewDate
            );
            config.currentMonthYear = clampedDate;
        }
        else {
            config.currentMonthYear = potentialNewDate;
        }

        this.#removeDayEventListener(config);

        const calendarElement = document.getElementById(config.id);
        const monthBody = calendarElement.querySelector(`.${this.#ccn}_month_body`);
        const header = calendarElement.querySelector(`.${this.#ccn}_month_header_title_wrap`);

        if (monthBody) {
            this.#eachMonthBody(config, monthBody);
        }
        if (header) {
            header.innerHTML = `
                <div class="${this.#ccn}_month_header_title">
                    <span>${this.#months[config.currentMonthYear.getMonth()]}</span>
                </div>
                <div class="${this.#ccn}_year_header_title">
                    <span>${config.currentMonthYear.getFullYear()}</span>
                </div>
            `;
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

    #returnMonthYear(month, year) {
        return `
            <div class="${this.#ccn}_month_header_title">${month}</div>
            <div class="${this.#ccn}_year_header_title">${year}</div>`;
    }

    #monthHeader(config, parentEl) {
        const wrap = document.createElement('div');
        wrap.className = `${this.#ccn}_month_header_wrap`;
        parentEl.appendChild(wrap);

        let month = this.#months[config.currentMonthYear.getMonth()];
        let year = config.currentMonthYear.getFullYear();

        wrap.innerHTML += `
            <div class="${this.#ccn}_month_header_title_outer_wrap">
                <div id="calendar_${config.id}_left_arrow_parent" class="${this.#ccn}_header_left_arrow_wrap"></div>
                <div class="${this.#ccn}_month_header_title_wrap">
                    ${this.#returnMonthYear(month, year)}
                </div>
                <div id="${config.id}_navigation_right_arrow" class="${this.#ccn}_header_right_arrow_wrap"></div>
            </div>
        `;

        if (config.limits.clickable) {
            let leftArrowParent = document.getElementById(`calendar_${config.id}_left_arrow_parent`);
            let rightArrowParent = document.getElementById(`${config.id}_navigation_right_arrow`);
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
            let weekDaysDisplayed = this.#weekDays[weekDay].substring(0, 2);
            weekDaysDisplayed = this.#removeGreekTones(weekDaysDisplayed);

            htmlForMonthHeader += `
                <div class="${this.#ccn}_day_header">
                    ${weekDaysDisplayed}
                </div>`;
        }
        monthHeader.innerHTML = htmlForMonthHeader;
    }

    #getCustomDayClasses(config) {
        let customClass = '';
        let classes = config.day.myClass.split(' ');
        classes.forEach((eachClass) => {
            if (eachClass !== '') {
                customClass += ` ${eachClass}`;
            }
        });
        return customClass;
    }

    #eachMonthBody(config, parentEl) {
        let month = config.currentMonthYear.getMonth(), year = config.currentMonthYear.getFullYear();

        // const currentDay = this.#getCurrentDay();
        const countDays = this.#getNumOfDaysInMonth(month, year);

        let htmlForMonthBody = this.#startDaysOfMonthFromCorrectWeekDay(this.#getFirstDayOfMonth(month, year));

        const customClasses = this.#getCustomDayClasses(config);

        for (let day = 1; day <= countDays; day++) {
            let data = `
                <div class="${this.#ccn}_day${customClasses}" data-day="${day}">
                    ${day}
                </div>`;

            if (config.day.clickable) {
                data = `
                    <div class="${this.#ccn}_day_clickable${customClasses}" data-day="${day}" data-date="${year}-${month}-${day}" aria-label="${day} ${this.#monthsForUse[month]} ${year}" aria-checked="false">
                        ${day}
                    </div>`;
            }

            htmlForMonthBody += data;
        }

        parentEl.innerHTML = htmlForMonthBody;
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
            html += `<div class="${this.#ccn}_day" data-day="-1"></div>`;
        }
        return html;
    }

    // THIS IS IMPORTANT TO ENSURE THAT NO DUPLICATE LISTENERS WILL BE ADDED
    #setupEventDelegation(config = null) {
        document.addEventListener('click', (event) => {
            this.#handlerClickDay(event, config);
        });
    }
    #getConfigForDay(clickedEl) {
        const calendarId = clickedEl.closest(`.input_${this.#ccn}_outer_wrap`).id;
        return this.#configurations.find(cfg => cfg.id === calendarId);
    }
    #getConfigById(id) {
        return this.#configurations.find(cfg => cfg.id === id);
    }

    #handlerClickDay(event, config = null) {
        const clickedEl = event.target.closest(`.${this.#ccn}_day_clickable`);

        if (!clickedEl) return;

        const pickedNumDay = clickedEl.getAttribute('data-day');
        if (pickedNumDay && parseInt(pickedNumDay, 10) !== -1) {
            config = config ? config : this.#getConfigForDay(clickedEl);
            // HERE ADD THE CUSTOM EVENT LISTENER
            if (config.day.onClickDay) {
                config.day.onClickDay(clickedEl.getAttribute('data-date'), clickedEl);
            }
        }
    }


    #getSavedDataOfCurrentConfigId(id) {
        return this.#savedData.filter((dataObj) => dataObj.id === id);
    }



    modifyCalendar({ id = null, startingMonthYear = null, primaryColor = null, secondaryColor = null, limits = null, day = null }) {
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

            const today = new Date();
            const hundredYearsBack = new Date(today.getFullYear() - this.#downLimit, today.getMonth(), today.getDate());
            const hundredYearsForward = new Date(today.getFullYear() + this.#upLimit, today.getMonth(), today.getDate());

            // VALIDATE NEW VALUES OR KEEP THE EXISTING ONES IF INVALID
            let startFromDate = this.#validateDate(limits?.startFromDate, config.limits.startFromDate);
            let untilDate = this.#validateDate(limits?.untilDate, config.limits.untilDate);

            // ENSURE LIMITS ARE WITHIN BOUNDS
            startFromDate = this.#clampDate(startFromDate, hundredYearsBack, hundredYearsForward);
            untilDate = this.#clampDate(untilDate, hundredYearsBack, hundredYearsForward);

            // AVOID StartFromDate BEING AFTER untilDate
            if (startFromDate > untilDate) {
                startFromDate = config.limits.startFromDate;
                untilDate = config.limits.untilDate;
            }

            // VALIDATE NEW VALUES OR KEEP THE EXISTING ONES IF INVALID
            const updatedLimits = limits ? {
                clickable: this.#validateBoolean(limits?.clickable, config.limits.clickable),
                startFromDate: this.#validateDate(limits?.startFromDate, config.limits.startFromDate),
                untilDate: this.#validateDate(limits?.untilDate, config.limits.untilDate),
            } : config.limits;

            // UPDATE CONFIGURATION WITH NEW VALUES
            config.currentMonthYear = this.#validateDate(startingMonthYear, config.currentMonthYear);
            config.primaryColor = this.#validateString(primaryColor, config.primaryColor);
            config.secondaryColor = this.#validateString(secondaryColor, config.secondaryColor);
            config.limits = updatedLimits;
            config.day = {
                myClass: this.#validateString(day?.myClass, config.day.myClass),
                clickable: this.#validateBoolean(day?.clickable, config.day.clickable),
                onClickDay: this.#validateFunction(day?.onClickDay, config.day.onClickDay),
            };

            // RE-RENDER THE CALENDAR WITH UPDATED CONFIGURATION
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                this.#update(config);
            }
            else {
                // DOCUMENT STILL LOADING SO USE EVENT LISTENER AS A LAST OPTION
                document.addEventListener('DOMContentLoaded', () => this.#update(config));
            }

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


const calendarController = new ZembiS_Calendar();


