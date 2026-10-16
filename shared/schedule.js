/**
 * D2L Dark Mode — Schedule
 * What an auto dark mode schedule means, for the service worker (which
 * applies it) and the options page (which displays it). Pure: times in,
 * answers out. A schedule is { start: 'HH:MM', end: 'HH:MM' } in local time.
 */

(function () {
  'use strict';

  var DAY = 24 * 60;

  function minutesOf(hhmm) {
    var parts = (hhmm || '00:00').split(':');
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  }

  function minuteOfDay(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  /** Whether the schedule says dark at `date`. Start is inclusive, end exclusive. */
  function isDarkAt(schedule, date) {
    var s = minutesOf(schedule.start);
    var e = minutesOf(schedule.end);
    var cur = minuteOfDay(date);
    // Same start and end: an enabled schedule with no gap, so dark all day
    if (s === e) return true;
    return s < e ? (cur >= s && cur < e) : (cur >= s || cur < e);
  }

  /** How many minutes a day the schedule is dark (1440 for same start and end). */
  function durationMinutes(schedule) {
    var s = minutesOf(schedule.start);
    var e = minutesOf(schedule.end);
    return e > s ? e - s : DAY - s + e;
  }

  /** Timestamp (ms) of the most recent start or end time at or before `date`. */
  function lastSwitchBefore(schedule, date) {
    var now = date.getTime();
    var best = -Infinity;
    [minutesOf(schedule.start), minutesOf(schedule.end)].forEach(function (mins) {
      // That time of day today, or else yesterday (setHours handles DST shifts)
      for (var back = 0; back <= 1; back++) {
        var d = new Date(date.getTime());
        d.setDate(d.getDate() - back);
        d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
        if (d.getTime() <= now) {
          best = Math.max(best, d.getTime());
          break;
        }
      }
    });
    return best;
  }

  self.D2LSchedule = {
    minutesOf: minutesOf,
    isDarkAt: isDarkAt,
    durationMinutes: durationMinutes,
    lastSwitchBefore: lastSwitchBefore,
  };
})();
