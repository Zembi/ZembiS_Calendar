



const dateId1 = calendarController.renderCalendar({
    inputToAttach: '.test1',
    inputPlaceholder: 'Date Time',
    primaryColor: 'red',
    startingMonthYear: new Date('2023-8-12'),
    day: {
        myClass: '',
        clickable: true,
        reClickable: false,
        onClickDay: (date, target) => {
            // console.log(date);
            // console.log(target);
        },
    }
});

const dateId2 = calendarController.renderCalendar({
    inputToAttach: '.test2',
    primaryColor: 'red',
    secondaryColor: 'red',
    limits: {
        clickable: false,
        startFromDate: new Date('2024-8-12'),
        untilDate: new Date('1992-10-2'),
    },
});

calendarController.modifyCalendar({
    id: dateId2.id,
    limits: {
        clickable: true,
    },
    day: {
        clickable: true
    }
});


// calendarController.modifyCalendar({
//     id: dateId2.id,
//     limits: {
//         clickable: true,
//     },
//     day: {
//         clickable: true
//     }
// });
