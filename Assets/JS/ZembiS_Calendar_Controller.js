
{
    window.ZembiS_Calendar = class {
        #controller;

        constructor(config) {
            this.#controller = new Calendar_Controller();
        }

        renderCalendar(config) {
            return this.#controller.createCalendar(config);
        }
    }
}

const calendarController = new ZembiS_Calendar();