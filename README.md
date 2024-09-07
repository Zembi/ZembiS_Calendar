# Custom Calendar (Under development)

### ⚠️ BE AWARE! THERE WILL BE A LOT OF UPDATES TO THIS CODE (ADDITIONS AND OPTIMIZATIONS)

## Version History

### v1.1 - Optimized wtih new features
<hr>
<ul>
    <li><strong>Optimization</strong>: Uses only one event listener for all days, improving performance.</li>
    <li><strong>New Feature</strong>: You can now modify an existing calendar with the modifyCalendar method.</li>
</ul>

<strong>Example: Optimized Event Listener</strong>

In this version, the code has been optimized to use a single event listener for all days, instead of attaching a listener to each day individually.

<strong>Example: Modifying an Existing Calendar</strong>

To modify a previously rendered calendar, use the modifyCalendar method like this:

```
calendarController.modifyCalendar({
    // ID OF THE CALENDAR YOU WANT TO MODIFY
    id: 'yourCalendarId',

    // NEW STARTING MONTH/YEAR
    startingMonthYear: new Date('2025-01-01'),
    primaryColor: 'blue',  // New primary color
    secondaryColor: 'yellow',  // New secondary color

    // NEW OPTION LIMITS
    limits: {
        clickable: true,,
        startFromDate: new Date('2000-01-01'),
        untilDate: new Date('2050-01-01')
    },

    // NEW DAY OPTIONS 
    day: {
        myClass: 'your Classes here',
        clickable: true,
        onClickDay: function(date, element) {
            console.log(date);
            console.log(element);
        }
    }
});
```

<hr>

### v1.0 - Initialization of Calendar

The initial release of the custom calendar.

#### How to Include

Add the following script tag to your HTML (preferably in the head section):

```
<script src="https://zembi.github.io/ZembiS_Calendar/Assets/JS/ZembiS_Calendar.js"></script>
```

#### Core Object

The core object is automatically included with the script, so you don’t need to create it:

```
const calendarController = new ZembiS_Calendar();
```

#### How to Render the Calendar

To render the calendar, use the following method:

```
// AVAILABLE OPTIONS CURRENTLY
calendarController.renderCalendar({
    inputToAttach: '.yourSelector',

    // MAKE SURE IT IS BETWEEN THE LIMITS - OTHERWISE DEFAULT IS TODAY
    currentMonthYear: new Date('2008-09-09'),

    primaryColor: 'purple',
    secondaryColor: 'red',

    // OPTION LIMITS
    limits: {
        clickable: true,,
        startFromDate: new Date('1998-09-09') /* ADD YOUR OWN LIMIT - MAX MINUS 100 YEARS FROM TODAY */,
        untilDate: new Date('2028-09-09') /* ADD YOUR OWN LIMIT - MAX PLUS 100 YEARS FROM TODAY */,
    },

    // DAY OPTIONS
    day: {
        myClass: 'your Classes here',
        clickable: true,
        onClickDay: function(date, element) {
            console.log(date);
            console.log(element);
        }
    }
});
```

<hr>

## Future Updates

Stay tuned for more updates and optimizations in future versions!

<hr>

