const dateId1 = calendarController.renderCalendar({
    inputToAttach: '.test1',
    inputPlaceholder: 'Date Time',
    openCalendar: new Date('2025-5-5'),
    weekStartDay: 0,
    // initDate: true,
    // extraLanguages: {
    //     'fr': {
    //         months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    //         weekDays: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    //         today: 'aujourd\'hui',
    //     },
    // },
    displayPreviousMonth: true,
    displayNextMonth: true,
    navigation: {
        activeArrows: true
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
        // // Set global month and day limits for all years
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
        onClickDay: (date, target) => {
            // console.log(date);
            // console.log(target);
        },
    },
});

// const dateId2 = calendarController.renderCalendar({
//     inputToAttach: '.test2',
//     clickable: true,
//     openCalendar: new Date('2023-8-12'),
//     initDate: false,
//     year: {
//         yearLimits: [0, 2025],
//     },
//     day: {
//         // clickable: true
//     },
//     style: {
//         transitions: {
//             fadeDatePicker: 300,
//             fadeYearPicker: 400,
//             cursorEffectDelay: 100
//         }
//     },
// });


console.dir(dateId1);