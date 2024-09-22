


// window.addEventListener('load', () => {
const dateId1 = calendarController.renderCalendar({
    inputToAttach: '.test1',
    inputPlaceholder: 'Date Time',
    // dateFormat: 'yy-dd-mm',
    startingMonthYear: new Date('2023-8-12'),
    day: {
        myClass: '',
        reClickable: false,
        onClickDay: (date, target) => {
            // console.log(date);
            // console.log(target);
        },
    },
    limits: {
        clickable: true,
    },
    animate: {
        fadeDatePicker: 300,
        fadeYearPicker: 400,
        cursorEffectDelay: 100
    },
});

const dateId2 = calendarController.renderCalendar({
    inputToAttach: '.test2',
    clickable: false,
    limits: {
        clickable: false,
        startFromDate: new Date('2024-8-12'),
        untilDate: new Date('1992-10-2'),
    },
    day: {
        clickable: false
    }
});
// });