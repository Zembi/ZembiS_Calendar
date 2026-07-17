const calendarController = new ZembiS_Calendar();

const dateId1 = calendarController.renderCalendar({
    inputToAttach: '.test1',
    inputPlaceholder: 'Date Time',
    openCalendar: new Date('2025-5-5'), // IF initDate: true THEN IT WILL BE THE ACTIVE DATE, OTHERWISE IT WILL JUST OPEN TO TO THIS MONTH - YEAR (IF LIMITS APPROVE IT) 
    weekStartDay: 1,
    initDate: true,
    extraLanguages: {
        'fr': {
            months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
            weekDays: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
            today: 'aujourd\'hui',
        },
    },
    displayPreviousMonth: true,
    // displayNextMonth: true,
    navigation: {
        activeArrows: true,
        respectMonthLimits: true
    },
    // cursorEffect: true,
    style: {
        includeFadedDays: true,
        transitions: {
            fadeDatePicker: 300,
            fadeYearPicker: 400,
            cursorEffectDelay: 100
        }
    },
    year: {
        yearLimits: [2021, 2025],
        // Set global month and day limits for all years
        globalLimits: {
            months: [0, 11], // Allow all months globally
            days: {
                0: [1, 2],  // January: 1-31 days
                1: [1, 3],  // February: 1-28 days (non-leap year, can override per year)
                3: [4, 1],  // March: 1-31 days
                // Define limits for other months similarly...
            }
        },
        // Set specific year-based limits (overrides global limits)
        limits: {
            2021: {
                months: [7, 10],  // Allow only January to July for 2021
                days: {
                    1: [5, 1],  // In February 2021: Allow days 1 to 5
                    8: [1, 6],  // In September 2021: Allow days 1 to 6
                    // Define limits for other months if needed...
                }
            },
            2023: {
                months: [5, 0],  // Allow only January to July for 2023
                days: {
                    1: [1, 28],  // In February 2023: Allow days 1 to 28
                    2: [1, 15],  // In March 2023: Allow days 1 to 15
                    3: [0, 0]
                    // Define limits for other months if needed...
                }
            },
            2025: {
                months: [0, 5],
                days: {
                    0: [1, 3],
                    1: [4, 27]   // In February 2025: Allow days 1 to 27 (leap year)
                    // Add limits for other months in 2025 if needed
                }
            }
        }
    },
    day: {
        myClass: '',
        reClickable: false,
        closeOnClickDay: false,
        onClickDay: (date, targetDay, targetCalendarEl) => {
            // console.log(date);
            // console.log(target);
        },
    },
});

const dateId2 = calendarController.renderCalendar({
    inputToAttach: '.test2',
    clickable: true,
    openCalendar: new Date('2023-8-12'),
    initDate: false,
    year: {
        yearLimits: [0, 2025],
    },
    day: {
        // clickable: true
    },
    style: {
        transitions: {
            fadeDatePicker: 300,
            fadeYearPicker: 400,
            cursorEffectDelay: 100
        }
    },
    day: {
        myClass: '',
        reClickable: true,
        closeOnClickDay: true,
        displayDateAfterClick: false,
        onClickDay: (date, targetDay, targetCalendarEl) => {
            // console.log(date);
            // console.log(target);
            targetCalendarEl.setAttribute('data-helper', date);
        },
    },
});


const dateId3 = calendarController.renderCalendar({
    inputToAttach: '.test3',
    clickable: true,
    openCalendar: new Date('2025-5-5'),
    initDate: false,
    year: {
        yearLimits: [0, 2025],
    },
    day: {
        // clickable: true
    },
    style: {
        transitions: {
            fadeDatePicker: 300,
            fadeYearPicker: 400,
            cursorEffectDelay: 100
        }
    },
    day: {
        myClass: '',
        reClickable: true,
        closeOnClickDay: true,
        displayDateAfterClick: false,
        onClickDay: (date, targetDay, targetCalendarEl) => {
            // console.log(date);
            // console.log(target);
        },
    },
});

const dateId4 = calendarController.renderCalendar({
    inputToAttach: '.test4',
    clickable: true,
    openCalendar: new Date(),
    initDate: false,
    year: {
        yearLimits: [2024, 2027],
        limits: {
            2026: {
                months: [0, 11],
                days: {
                    6: [10, 25], // JULY 2026: ONLY DAYS 10-25 AVAILABLE, TO MANUALLY VERIFY RANGE TRUNCATION AT A DISABLED-DAY BOUNDARY
                },
            },
        },
    },
    day: {
        rangeSelect: true,
        rangeMinDays: 7,
        rangeStepDays: 7,
        closeOnClickDay: true,
        displayDateAfterClick: true,
        onRangeSelect: (startDateStr, endDateStr, rangeInfo, clickedEl, targetCalendarEl) => {
            console.log('Range selected:', startDateStr, '-', endDateStr, rangeInfo);
        },
    },
    disable: {
        behavior: 'allowOpenNoAction',
        message: 'Loading available dates...',
        spinner: {
            show: true,
        },
        overlay: {
            color: 'rgba(255, 255, 255, 0.75)',
        },
    },
});

(function() {
    // MANUAL TEST: disableCalendar/enableCalendar WITH LOADER - CALENDAR 4 USES behavior:'allowOpenNoAction',
    // SO IT SHOULD STILL OPEN NORMALLY (SHOWING THE SPINNER + MESSAGE OVERLAY) WHILE DISABLED, WITH
    // DAY/NAV/YEAR CLICKS BLOCKED UNTIL enableCalendar() RUNS 2S LATER
    document.querySelector('.test-disable-toggle-4').addEventListener('click', () => {
        calendarController.disableCalendar(dateId4.id);
        setTimeout(() => {
            calendarController.enableCalendar(dateId4.id);
        }, 2000);
    });

    // MANUAL TEST: setOpenCalendar - SHOULD JUMP WITHOUT A FULL REBUILD (TRY THIS WHILE CALENDAR 1 IS OPEN)
    document.querySelector('.test-jump-1').addEventListener('click', () => {
        calendarController.setOpenCalendar(dateId1.id, new Date(2024, 5, 1));
    });

    // MANUAL TEST: updateYearLimits - DAY-GRID LIMITS AND THE YEAR-PICKER LIST SHOULD BOTH SHRINK TO 2022-2024
    document.querySelector('.test-shrink-limits-2').addEventListener('click', () => {
        calendarController.updateYearLimits(dateId2.id, { yearLimits: [2022, 2024] });
    });

    // MANUAL TEST: destroyCalendar, CALLED INSTANCE-STYLE (dateId3.destroyCalendar()) TO EXERCISE BOTH
    // CALLING CONVENTIONS - EQUIVALENT TO calendarController.destroyCalendar(dateId3.id). CALENDAR 3'S
    // DOM/LISTENERS SHOULD BE GONE, AND ITS SELECT SHOULD BE RE-ATTACHABLE AFTERWARDS
    document.querySelector('.test-destroy-3').addEventListener('click', () => {
        dateId3.destroyCalendar();
    });

})();