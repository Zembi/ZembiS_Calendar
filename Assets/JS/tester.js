


const dateId1 = calendarController.renderCalendar({
    inputToAttach: '.test1',
    inputPlaceholder: 'Date Time',
    openCalendar: new Date('1998-7-12'),
    // initDate: true,
    year: {
        yearLimits: [2023, 2022],
        // // Set global month and day limits for all years
        globalLimits: {
            months: [5, 11], // Allow all months globally
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
                months: [0, 11],  // Allow only January to July for 2023
                days: {
                    // 1: [5, 1],  // In February 2023: Allow days 1 to 28
                    8: [1, 6],  // In March 2023: Allow days 1 to 15
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
                months: [1, 12],  // Allow all months in 2024
                days: {
                    1: [1, 29]   // In February 2024: Allow days 1 to 29 (leap year)
                    // Add limits for other months in 2024 if needed
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
    navigation: {
        activeArrows: true
    },
    style: {
        transitions: {
            fadeDatePicker: 300,
            fadeYearPicker: 400,
            cursorEffectDelay: 100
        }
    },
});

// const dateId2 = calendarController.renderCalendar({
//     inputToAttach: '.test2',
//     clickable: true,
//     openCalendar: new Date('2023-8-12'),
//     initDate: false,
//     day: {
//         // clickable: true
//     }
// });

