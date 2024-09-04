# Custom Calendar (Under development)

BE AWARE! THERE WILL BE A LOT OF UPDATES TO THIS CODE (ADDITIONS AND OPTIMIZATIONS)

Include this line in your code(where ever, prefferably header) and you are ready to go:
https://zembi.github.io/ZembiS_Calendar/Assets/JS/ZembiS_Calendar.js


This is the core object (don't create this - already exists in the script you attach your code):
```
const calendarController = new ZembiS_Calendar();
```
and how you activate the calendar to your code:
```
// AVAILABLE OPTIONS CURRENTLY
calendarController.renderDateInput({
    inputToAttach: '.yourSelector',
    currentMonthYear: new Date('2008-09-09') /* MAKE SURE IT IS INSIDE THE LIMITS - OTHERWISE DEFAULT IS TODAY */,
    primaryColor: 'purple',
    secondaryColor: 'red',
    // OPTION LIMITS
    limits: {
        clickable: true,,
        startFromDate: new Date('1998-09-09') /* ADD YOUR OWN LIMIT - MAX MINUS 100 YEARS FROM TODAY */,
        untilDate: new Date('2028-09-09') /* ADD YOUR OWN LIMIT - MAX PLUS 100 YEARS FROM TODAY */,
    },
    day: {
        myClass: 'your Classes here',
        clickable: true,
        onClickDay: function(date, element) {

        }
    }
});
```
