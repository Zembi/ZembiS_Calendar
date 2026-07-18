# ZembiS_Calendar

A vanilla JavaScript (no framework, no runtime dependencies) date-picker calendar widget that attaches itself to an
existing `input`, `textarea`, `select`, or generic element. Distributed as a single bundled script.

> ⚠️ **Under active development.** Expect breaking changes between versions.

## Install

Add these to your page (preferably in `<head>`):

```html
<link rel="stylesheet" href="https://zembi.github.io/ZembiS_Calendar/Assets/CSS/calendar.css">
<script src="https://zembi.github.io/ZembiS_Calendar/Assets/JS/ZembiS_Calendar.js"></script>
```

There is no auto-created global instance — create one yourself after the script loads:

```js
const calendarController = new ZembiS_Calendar();
```

## Quick start

```js
const myCalendar = calendarController.renderCalendar({
    inputToAttach: '.my-date-input',
    inputPlaceholder: 'Pick a date',
    dateFormat: 'DD-MM-YYYY',
});

// myCalendar.id is how you refer to this calendar in the control functions below
console.log(myCalendar.id);
```

`renderCalendar()` returns the calendar's internal config object. It attaches to whatever single element
`inputToAttach` selects — `input`, `textarea`, `select`, or any other element (its `innerText` is used to display the
picked date instead of a `value`).

## Two ways to call the control functions

Every control function below (`disableCalendar`, `enableCalendar`, `setOpenCalendar`, `updateYearLimits`,
`destroyCalendar`) can be called either from the controller with an `id`, or directly on the object
`renderCalendar()` returned — they're equivalent:

```js
calendarController.disableCalendar(myCalendar.id);
myCalendar.disableCalendar();
```

## Config options

| Option | Type | Default | Description |
|---|---|---|---|
| `inputToAttach` | string (selector) | — | **Required.** CSS selector for the element to attach to. |
| `inputPlaceholder` | string | `'Pick a date'` | Placeholder text (not used for `select` elements). |
| `openCalendar` | Date | today | The month/year the calendar opens to. |
| `weekStartDay` | 0–6 | `1` (Monday) | Which weekday (`Date.getDay()` convention, 0 = Sunday) starts each week row. |
| `initDate` | boolean | `false` | If `true`, `openCalendar` is also selected/activated on first render. |
| `extraLanguages` | object | `null` | Keyed by `<html lang="...">` value, e.g. `{ fr: { months, weekDays, today } }`. Only Greek (`el`) and English are built in. |
| `dateFormat` | string | `'DD-MM-YYYY'` | One of `DD-MM-YYYY`, `MM-DD-YYYY`, `YYYY-MM-DD`, `YYYY-DD-MM`, and the same four with `YY` or `/` instead of `-`. |
| `displayPreviousMonth` / `displayNextMonth` | boolean | `true` | Show faded leading/trailing days from adjacent months. |
| `clickable` | boolean | `true` | Master switch — if `false`, nothing in the calendar is clickable. |
| `cursorEffect` | boolean | `true` | Enables the cursor-follow highlight effect in the year picker. |
| `navigation.activeArrows` | boolean | `true` | Show the prev/next month arrows. |
| `navigation.respectMonthLimits` | boolean | `false` | If `true`, arrows/navigation are also blocked at a year's `months` limit boundary, not just at `minYear`/`maxYear`. |
| `navigation.dragToNavigate` | boolean | `true` | Whether the day-grid can be dragged/swiped to change months (see below). Independent of `activeArrows` — a calendar can have swipe-only navigation with the arrows hidden. |
| `navigation.transition` | `'slide'` \| `'none'` \| `'fade'` | `'slide'` | How arrow-click/year-select navigation transitions between months (see below). Dragging always uses its own live-follow motion regardless of this setting. |
| `layout` | `'classic'` \| `'sideArrows'` | `'classic'` | Layout preset — see below. |
| `style.includeFadedDays` | boolean | `true` | Fade in/out adjacent-month day opacity. |
| `style.transitions.fadeDatePicker` / `.fadeYearPicker` / `.fadeMonthPicker` / `.cursorEffectDelay` | integer (ms) | `0` | Transition durations. |
| `style.transitions.monthNavigation` | integer (ms) | `320` | Duration of `navigation.transition`'s `'slide'`/`'fade'` animation. No effect on `'none'` or on dragging, which always live-follows. |
| `year.clickable` | boolean | `true` | Whether the year label opens the year picker. |
| `year.yearLimits` | `[min, max]` | `[today - 100, today + 100]` | Overall selectable year range. |
| `year.globalLimits.months` | `[min, max]` | `[0, 11]` | Allowed months (0-indexed) for every year, unless overridden per year below. |
| `year.globalLimits.days` | `{ [month]: [min, max] }` | full month | Allowed days per month, for every year. |
| `year.limits[year].months` | `[min, max]` | inherits global | Per-year month override. |
| `year.limits[year].days` | `{ [month]: [min, max] }` | inherits global | Per-year, per-month day override. |
| `month.clickable` | boolean | `true` | Whether the month label opens the month picker (the 12 months of the currently displayed year). |
| `day.clickable` | boolean | `true` | Whether days can be clicked/selected at all. |
| `day.reClickable` | boolean | `false` | Whether clicking the already-active day fires the click logic again. |
| `day.closeOnClickDay` | boolean | `true` | Close the calendar after picking a day (or completing a range). |
| `day.displayDateAfterClick` | boolean | `true` | Write the picked date (or `"start - end"` in range mode) into the attached element. |
| `day.onClickDay` | `(dateStr, dayEl, targetEl) => void` | `null` | Fires on single-date selection. |
| `day.myClass` | string | `''` | Extra class name(s) added to every day cell. |
| `day.rangeSelect` | boolean | `false` | Opt in to range selection (see below). |
| `day.rangeMinDays` / `day.rangeStepDays` | integer | `null` | Constrain range length to a stepped sequence (see below). |
| `day.onRangeSelect` | `(startStr, endStr, rangeInfo, dayEl, targetEl) => void` | `null` | Fires when a range is finalized. |
| `time.enabled` | boolean | `false` | Opt in to time-of-day selection (see below). No effect when `day.rangeSelect: true`. |
| `time.use12Hour` | boolean | `false` | `false` shows a 24-hour picker; `true` shows 12-hour with an AM/PM toggle. |
| `time.minuteStep` | integer | `1` | Minute increment shown in the picker (e.g. `15` → `:00`/`:15`/`:30`/`:45`). |
| `time.hourLimits` / `time.minuteLimits` | `[min, max]` | `[0, 23]` / `[0, 59]` | Global bounds — hours/minutes outside the range render disabled. |
| `time.limits[weekday].hourLimits` | `[min, max]` | inherits `time.hourLimits` | Per-weekday hour override. `weekday` is `0`–`6` (`Date.getDay()` convention, same as `weekStartDay` — 0 = Sunday). |
| `time.onTimeChange` | `(valueStr, hour, minute, targetEl) => void` | `null` | Fires when the hour or minute (or AM/PM) is picked. `hour` is always 0–23. |
| `time.onClickTime` | `(isOpen, valueStr, targetEl) => void` | `null` | Fires whenever the time trigger is clicked, both opening and closing the panel. Opening also applies/writes the current time immediately, even if neither wheel has been touched yet. |
| `time.onSelectHour` | `(hour, valueStr, targetEl) => void` | `null` | Fires only when the hour (or AM/PM) changes. `hour` is always 0–23. |
| `time.onSelectMinute` | `(minute, valueStr, targetEl) => void` | `null` | Fires only when the minute changes. |
| `disable.behavior` | `'allowOpenNoAction'` \| `'blockOpen'` | `'allowOpenNoAction'` | How a disabled calendar behaves (see below). |
| `disable.message` | string | `''` | Optional text shown in the loader overlay. |
| `disable.spinner.show` | boolean | `true` | Show the spinner in the loader overlay. |
| `disable.spinner.color` / `disable.overlay.color` | string (CSS color) | theme default | Per-instance color overrides for the loader. |

## Layout presets

```js
calendarController.renderCalendar({ inputToAttach: '.my-date-input', layout: 'sideArrows' });
```

`'classic'` (default) puts the prev/next arrows flanking the month title. `'sideArrows'` pins them as circular
buttons to the card's left/right edges instead, carousel-style. Purely a visual difference — same behavior either
way.

## Navigating months: arrows, click-a-year, click-a-month, and drag/swipe

Clicking an arrow, picking a different year in the year-picker, or picking a different month in the month-picker
slides the day-grid to the new month. The grid can also be dragged or swiped directly — it follows your
finger/mouse in real time, and releasing past 30% of the grid's width commits to that month (finishing the slide);
releasing short of that snaps back. Set `navigation.dragToNavigate: false` to disable dragging on a given calendar
(arrow/year/month navigation still slides normally). Dragging respects the same year/month limits as the arrows —
it won't let you drag toward a month that's out of range. All of this respects the OS/browser's reduced-motion
setting.

Clicking the month name opens a picker of the 12 months in the currently displayed year (set `month.clickable:
false` to disable it) — months outside that year's `months` limit render disabled. Picking a month navigates via
the same pipeline as the arrows/year-picker, so it inherits `navigation.transition` and respects all limits; it
never changes the year — pick a different year from the year-picker for that.

`navigation.transition` controls how arrow/year-select navigation looks: `'slide'` (default, the grid slides in
from the side), `'none'` (instant swap, no animation), or `'fade'` (the old month fades out while the new one fades
in, in place). This only affects arrow/year-click navigation — dragging always live-follows your finger/mouse
regardless of this setting. `style.transitions.monthNavigation` controls how long `'slide'`/`'fade'` take (default
`320` ms).

## Range selection

Set `day.rangeSelect: true` to turn a calendar into a range picker instead of a single-date picker:

```js
calendarController.renderCalendar({
    inputToAttach: '.my-range-input',
    day: {
        rangeSelect: true,
        rangeMinDays: 7,     // every completed range is at least 7 days
        rangeStepDays: 7,    // ...in 7-day increments (7, 14, 21, ...)
        onRangeSelect: (startStr, endStr, rangeInfo) => {
            console.log(startStr, endStr, rangeInfo.days); // rangeInfo: { startDate, endDate, days }
        },
    },
});
```

Click a day to start the range, hover subsequent days to preview it, click again to finalize. A range is always
truncated at the first disabled day in either direction (per your `year` limits). Clicking a third time after a
range is already complete discards it and starts a fresh one.

## Time selection

Set `time.enabled: true` to also let the user pick an hour and minute, combined with the picked date into the
value written to the attached element (`"<date> <time>"`):

```js
calendarController.renderCalendar({
    inputToAttach: '.my-datetime-input',
    time: {
        enabled: true,
        use12Hour: true,   // 12-hour picker with an AM/PM toggle instead of 24-hour
        minuteStep: 15,    // only :00/:15/:30/:45 are selectable
        onTimeChange: (valueStr, hour, minute) => {
            console.log(valueStr, hour, minute); // hour is always 0-23, regardless of use12Hour
        },
    },
});
```

A time trigger (showing the currently selected time) appears below the day-grid — but only once a day has actually
been picked (or `initDate: true` set one on first render); there's no point offering a time before there's a date to
attach it to. Clicking the trigger opens a panel with scrollable hour/minute "wheels" (native-style pickers, like a
phone's date/time picker), plus an AM/PM row below
them when `use12Hour: true`. Scroll (or drag/flick on touch) up and down to change the value — the centered value
is shown larger, the surrounding ones progressively smaller, and scrolling past the top/bottom wraps around
infinitely (e.g. scrolling past 23 lands back on 0). You can also just click a value directly to jump to it. Unlike
the year/month pickers, picking a value does **not** close the panel — there are independent hour/minute (and
AM/PM) values to set, so it stays open until you click the trigger again or click outside the calendar. Opening the
panel (clicking the trigger) immediately applies the currently-active time to the value too, so you don't have to
touch a wheel (or click a day first) just to get a time onto the attached element. Time selection has no effect
when `day.rangeSelect: true` — it's a single-date-only concept, and the panel isn't built at all in that mode.

`onTimeChange` fires on any hour/minute/AM-PM change; `onSelectHour`/`onSelectMinute` are the more granular versions
that fire only for their own wheel (also useful if you want to react differently to each); `onClickTime` fires on
every trigger click (open and close), with its `isOpen` argument telling you which. All four can be used together
— pick whichever granularity you need.

### Time limits

```js
calendarController.renderCalendar({
    inputToAttach: '.my-datetime-input',
    time: {
        enabled: true,
        hourLimits: [8, 20],       // nothing before 8am or after 8pm, any day
        minuteLimits: [0, 45],     // no minute above :45, uniform across every hour
        limits: {
            1: { hourLimits: [9, 17] },  // Monday
            2: { hourLimits: [9, 17] },  // Tuesday
            3: { hourLimits: [9, 17] },  // Wednesday
            4: { hourLimits: [9, 17] },  // Thursday
            5: { hourLimits: [9, 17] },  // Friday
            6: { hourLimits: [10, 14] }, // Saturday - shorter hours
            // Sunday (0) not listed, so it inherits the global hourLimits: [8, 20]
        },
    },
});
```

Hours outside the *currently active date's* weekday range (or the global `hourLimits` for any weekday not listed
in `limits`) render disabled and reject clicks — scrolling past a disabled hour and releasing snaps back to the
nearest enabled one instead of settling on it. `minuteLimits` is always global — it doesn't vary by weekday. If
picking a different day (or toggling AM/PM) makes the currently-selected hour invalid under the new weekday's
range, the hour automatically clamps to the nearest valid one and the value updates immediately.

## Pausing a calendar (disable/enable)

```js
calendarController.disableCalendar(myCalendar.id);          // shows the loader, blocks nav/year/day actions
calendarController.disableCalendar(myCalendar.id, { showLoader: false }); // block silently, no overlay
calendarController.enableCalendar(myCalendar.id);
```

With the default `disable.behavior: 'allowOpenNoAction'`, the calendar still opens as normal while disabled — it just
shows the loader overlay and blocks interaction. Set `disable.behavior: 'blockOpen'` if you'd rather it not open at
all while disabled.

## Programmatic navigation and limits

```js
// Jump an already-rendered calendar to a specific month/year
calendarController.setOpenCalendar(myCalendar.id, new Date(2025, 5, 1));

// Update an already-rendered calendar's year/month/day limits
// (e.g. an end-date picker whose range depends on a linked start-date picker's selection)
calendarController.updateYearLimits(myCalendar.id, { yearLimits: [2024, 2026] });
```

## Removing a calendar

```js
calendarController.destroyCalendar(myCalendar.id);
```

Removes the calendar's DOM and listeners, and frees its attached input so a new calendar can be rendered on it
afterward. The shared mobile overlay element (used by every calendar) is left alone.

## Development

Source lives as separate class files under `Assets/JS/classes/`; `Assets/JS/ZembiS_Calendar.js` is a **generated**
bundle and must never be hand-edited. After changing a source file, rebuild and commit the regenerated bundle:

```
npm run build
```

`index.html` is a manual test console exercising four calendars against different element types and configs
(anchor, button, select, text input with range-select), plus buttons that call the control functions above
directly. Serve the repo root with any static server and open it in a browser to try things out — there is no
automated test suite.
