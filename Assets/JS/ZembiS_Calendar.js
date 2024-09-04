


class ZembiS_Calendar {
    // PRIVATE VARIABLES
    #ccn = 'calendar_vfz';
    #flagClassToAvoidDuplicates = 'vfzembiSCal@date_input_activated';
    #downLimit = 1;
    #upLimit = 1;

    #months = [];
    #monthsForUse = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    #weekDays = [];
    #weekDaysForUse = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // HERE ADD THE CONFIGURATIONS OF EACH INPUT ACTION
    #configurations = [];

    static #isCssLoaded = false;

    constructor() {
        this.savedData = [];
        this.#ensureFirstTimeActions();
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
    renderDateInput({ inputToAttach = null, startingMonthYear = new Date(), primaryColor = 'white', secondaryColor = 'grey', limits = null, day = null }) {
        // CORE PROPERTY
        const givenInput = this.#validateString(inputToAttach);
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
            id: this.#generateUniqueIds(15),
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

        console.log(config);

        this.savedData.push({ calendarId: config.id, data: [] });
        this.#configurations.push(config);


        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            this.#activate(config);
        }
        else {
            // DOCUMENT STILL LOADING SO USE EVENT LISTENER AS A LAST OPTION
            document.addEventListener('DOMContentLoaded', () => this.#activate(config));
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

    #setupEventDelegation(config) {
        const escapedId = CSS.escape(config.id);
        const selector = `#${escapedId} .${this.#ccn}_month_body`;
        console.log("Selector used for setupEventDelegation:", selector);

        const calendarBody = document.querySelector(`#${config.id} .${this.#ccn}_month_body`);

        if (calendarBody) {
            calendarBody.addEventListener('click', (event) => {
                const day = event.target.closest(`.${this.#ccn}_day_clickable`);
                if (day && config.day.onClickDay) {
                    event.preventDefault();
                    config.day.onClickDay(day.getAttribute('data-date'), day);
                }
            });
        }
        else {
            console.warn(`Element with selector '${selector}' not found.`);
        }
    }

    #generateUniqueIds(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            result += chars[randomIndex];
        }
        return result;
    }

    // ACTIVATES THE FUNCTIONALITY
    #activate(config) {
        // MAKE SURE TO CHECK IF INPUT IS READY FOR USE
        if (this.#validateIfInputIsAcceptable(config)) {
            this.#createInputCalendar(config);
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

        // PREVENT HIDE CALENDAR IF CLICKING INSIDE IT (ITS ELEMENTS)
        calendarWrap.addEventListener('click', (e) => e.stopPropagation());
    }

    #createInputCalendar(config) {
        // MAKE SURE FIELD IS TYPE OF TEXT FIRST
        config.inputToAttach.type = "text";
        config.inputToAttach.readOnly = true;

        const outerWrap = document.createElement('div');
        outerWrap.className = `input_${this.#ccn}_outer_wrap`;
        outerWrap.id = config.id;
        document.body.appendChild(outerWrap);

        // ADD DATE FIELD AFTER INPUT
        config.inputToAttach.parentNode.insertBefore(outerWrap, config.inputToAttach.nextSibling);

        // ADD THE EVENT OF SHOWING/HIDING THE CALENDAR
        this.#handleInputsBehaviorWithCalendarElement(config.inputToAttach, outerWrap);

        // CHECK ONCE BEFORE CREATING THAT THE LIMITS ARE BEING RESPECTED
        const today = new Date();

        const fromDate = new Date(today.getFullYear() - this.#downLimit, today.getMonth());
        const untilDate = new Date(today.getFullYear() + this.#upLimit, today.getMonth());

        let minDate = config.limits.startFromDate || fromDate;
        let maxDate = config.limits.untilDate || untilDate;

        if (config.limits.startFromDate && config.limits.untilDate) {
            if (config.limits.startFromDate > config.limits.untilDate) {
                minDate = fromDate;
                maxDate = untilDate;
            }
        }

        config.currentMonthYear = this.#clampDate(config.currentMonthYear, minDate, maxDate);


        // CONTINUE WITH THE CALENDAR'S STRUCTURE
        const wrap = document.createElement('div');
        wrap.className = `input_${this.#ccn}_wrap`;
        outerWrap.appendChild(wrap);

        this.#monthHeader(config, wrap);

        const monthBody = document.createElement('div');
        monthBody.className = `${this.#ccn}_month_body`;
        wrap.appendChild(monthBody);
        this.#eachMonthBody(config, monthBody);
    }

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
        } else {
            config.currentMonthYear = potentialNewDate;
        }

        this.#removeDayEventListeners(config);

        const calendarElement = document.getElementById(config.id);
        const monthBody = calendarElement.querySelector(`.${this.#ccn}_month_body`);
        const header = calendarElement.querySelector(`.${this.#ccn}_month_header_title_wrap`);

        if (monthBody) {
            this.#eachMonthBody(config, monthBody);
        }
        if (header) {
            header.innerHTML = `
                <div class="${this.#ccn}_month_header_title">
                    <span>${this.#monthsForUse[config.currentMonthYear.getMonth()]}</span>
                </div>
                <div class="${this.#ccn}_year_header_title">
                    <span>${config.currentMonthYear.getFullYear()}</span>
                </div>
            `;
        }
    }
    #removeDayEventListeners(config) {
        const days = document.querySelectorAll(`#${config.id} .${this.#ccn}_day_clickable`);

        days.forEach(day => {
            // REMOVE ALL EVENT LISTENERS
            const newDay = day.cloneNode(true);
            day.parentNode.replaceChild(newDay, day);
        });

        this.#setupEventDelegation(config);
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

        let month = this.#monthsForUse[config.currentMonthYear.getMonth()];
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

    #staticWeekDaysHeaderOfMonth(parentEl) {
        const monthHeader = document.createElement('div');
        monthHeader.className = `${this.#ccn}_month_header`;
        parentEl.appendChild(monthHeader);

        let htmlForMonthHeader = '';
        for (let weekDay = 0; weekDay < 7; weekDay++) {
            htmlForMonthHeader += `
                <div class="${this.#ccn}_day_header">
                    ${this.#weekDays[weekDay].substring(0, 2)}
                </div>`;
        }
        monthHeader.innerHTML = htmlForMonthHeader;
    }

    #eachMonthBody(config, parentEl) {
        let currentMonthYear = config.currentMonthYear, clickable = config.day.clickable;
        let month = currentMonthYear.getMonth(), year = currentMonthYear.getFullYear();

        // const currentDay = this.#getCurrentDay();
        const countDays = this.#getNumOfDaysInMonth(month, year);

        let htmlForMonthBody = this.#startDaysOfMonthFromCorrectWeekDay(this.#getFirstDayOfMonth(month, year));
        for (let day = 1; day <= countDays; day++) {
            let data = day;

            if (clickable) {
                data = `
                    <a class="${this.#ccn}_day_clickable" data-date="${year}-${month}-${day}" aria-label="${day} ${this.#monthsForUse[month]} ${year}" aria-checked="false">
                        ${day}
                    </a>`;
            }

            let customClass = '';
            let classes = config.day.myClass.split(' ');
            classes.forEach((eachClass) => {
                if (eachClass !== '') {
                    customClass += ` ${eachClass}`;
                }
            });

            htmlForMonthBody += `
                <div class="${this.#ccn}_day${customClass}" data-day="${day}">
                    ${data}
                </div>`;
        }

        parentEl.innerHTML = htmlForMonthBody;

        if (clickable) {
            this.#addEventsToDays(config);
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
            html += `<div class="${this.#ccn}_day" data-day="-1"></div>`;
        }
        return html;
    }


    #addEventsToDays(config) {
        while (!document.getElementById(`${config.id}`)) {
            const days = document.querySelectorAll(`#${config.id} .${this.#ccn}_day_clickable`);

            days.forEach(day => {
                day.addEventListener('click', (event) => {
                    event.preventDefault();

                    if (config.day.onClickDay) {
                        config.day.onClickDay(day.getAttribute('data-date'), day);
                    }
                });
            });
        }
    }
}


const calendarController = new ZembiS_Calendar();


calendarController.renderDateInput({
    inputToAttach: '.test1',
    primaryColor: 'red',
    startingMonthYear: new Date('2023-8-12'),
    day: {
        myClass: '',
        clickable: true,
        onClickDay: (date, target) => {
            console.log(date);
            // console.log(target);
        },
    }
});

calendarController.renderDateInput({
    inputToAttach: '.test2',
    primaryColor: 'red',
    secondaryColor: 'red',
    limits: {
        clickable: false,
        startFromDate: new Date('2024-8-12'),
        untilDate: new Date('1992-10-2'),
    },
});

