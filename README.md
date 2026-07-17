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
| `style.includeFadedDays` | boolean | `true` | Fade in/out adjacent-month day opacity. |
| `style.transitions.fadeDatePicker` / `.fadeYearPicker` / `.cursorEffectDelay` | integer (ms) | `0` | Transition durations. |
| `year.clickable` | boolean | `true` | Whether the year label opens the year picker. |
| `year.yearLimits` | `[min, max]` | `[today - 100, today + 100]` | Overall selectable year range. |
| `year.globalLimits.months` | `[min, max]` | `[0, 11]` | Allowed months (0-indexed) for every year, unless overridden per year below. |
| `year.globalLimits.days` | `{ [month]: [min, max] }` | full month | Allowed days per month, for every year. |
| `year.limits[year].months` | `[min, max]` | inherits global | Per-year month override. |
| `year.limits[year].days` | `{ [month]: [min, max] }` | inherits global | Per-year, per-month day override. |
| `month.clickable` | boolean | `true` | Reserved for future month-level interaction. |
| `day.clickable` | boolean | `true` | Whether days can be clicked/selected at all. |
| `day.reClickable` | boolean | `false` | Whether clicking the already-active day fires the click logic again. |
| `day.closeOnClickDay` | boolean | `true` | Close the calendar after picking a day (or completing a range). |
| `day.displayDateAfterClick` | boolean | `true` | Write the picked date (or `"start - end"` in range mode) into the attached element. |
| `day.onClickDay` | `(dateStr, dayEl, targetEl) => void` | `null` | Fires on single-date selection. |
| `day.myClass` | string | `''` | Extra class name(s) added to every day cell. |
| `day.rangeSelect` | boolean | `false` | Opt in to range selection (see below). |
| `day.rangeMinDays` / `day.rangeStepDays` | integer | `null` | Constrain range length to a stepped sequence (see below). |
| `day.onRangeSelect` | `(startStr, endStr, rangeInfo, dayEl, targetEl) => void` | `null` | Fires when a range is finalized. |
| `disable.behavior` | `'allowOpenNoAction'` \| `'blockOpen'` | `'allowOpenNoAction'` | How a disabled calendar behaves (see below). |
| `disable.message` | string | `''` | Optional text shown in the loader overlay. |
| `disable.spinner.show` | boolean | `true` | Show the spinner in the loader overlay. |
| `disable.spinner.color` / `disable.overlay.color` | string (CSS color) | theme default | Per-instance color overrides for the loader. |

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
(anchor, button, select, text input with range-select), plus three buttons that call the control functions above
directly. Serve the repo root with any static server and open it in a browser to try things out — there is no
automated test suite.
