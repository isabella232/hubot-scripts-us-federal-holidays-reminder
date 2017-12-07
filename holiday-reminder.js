const moment = require('moment-timezone');
const scheduler = require('node-schedule');
const holidays = require('@18f/us-federal-holidays');

const REPORTING_TIME = process.env.HUBOT_HOLIDAY_REMINDER_TIME || '15:00';
const TIMEZONE = process.env.HUBOT_HOLIDAY_REMINDER_TIMEZONE || 'America/New_York';
const CHANNEL = process.env.HUBOT_HOLIDAY_REMINDER_CHANNEL || 'general';

function hasRunAlready(date, robot) {
  return (date.format('YYYY-M-D') === robot.brain.get('LAST_HOLIDAY_REPORT_DATE'));
}

function isWeekend(date) {
  const today = date.format('dddd');
  return (today === 'Saturday' || today === 'Sunday');
}

function isReportingTime(date) {
  const reportingTime = moment(REPORTING_TIME, 'HH:mm');
  return (date.hours() === reportingTime.hours() && date.minutes() === reportingTime.minutes());
}

function getNextWeekday(date) {
  const targetDate = moment(date).add(1, 'day');
  while (targetDate.format('dddd') === 'Saturday' || targetDate.format('dddd') === 'Sunday') {
    targetDate.add(1, 'day');
  }
  return targetDate;
}

function holidayForDate(date) {
  const dateString = date.format('YYYY-M-D');
  const possibleHolidays = holidays.allForYear(date.format('YYYY')).filter(holiday => holiday.dateString === dateString);

  if (possibleHolidays.length) {
    return possibleHolidays[0];
  }
  return false;
}

function timerTick(robot, now, internalFunctions) {
  if (internalFunctions.isWeekend(now) || !internalFunctions.isReportingTime(now) || internalFunctions.hasRunAlready(now)) {
    return;
  }
  robot.brain.set('LAST_HOLIDAY_REPORT_DATE', now.format('YYYY-M-D'));

  const nextWeekday = internalFunctions.getNextWeekday(now);
  const upcomingHoliday = internalFunctions.holidayForDate(nextWeekday);

  if (upcomingHoliday) {
    robot.messageRoom(CHANNEL, `@here Remember that *${nextWeekday.format('dddd')}* is a federal holiday for the observation of *${upcomingHoliday.name}*!`);
  }
}

module.exports = (robot) => {
  scheduler.scheduleJob('0 0 * * * 1-5', () => {
    timerTick(robot, moment().tz(TIMEZONE), { isReportingTime, hasRunAlready, getNextWeekday, holidayForDate });
  });
};

// Expose for testing
module.exports.timerTick = timerTick;
module.exports.isWeekend = isWeekend;
module.exports.isReportingTime = isReportingTime;
module.exports.hasRunAlready = hasRunAlready;
module.exports.getNextWeekday = getNextWeekday;
module.exports.holidayForDate = holidayForDate;
