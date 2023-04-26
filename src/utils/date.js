import dayjs from "@/plugins/dayjs";

export function getDuration(duration, type = 0) {
  const durationObj = dayjs.duration(duration);
  const years = durationObj.years();
  const months = durationObj.months();
  const days = durationObj.days();
  const hours = durationObj.hours();
  const minutes = durationObj.minutes();
  const units = {
    years: ["y", "year"],
    months: ["m", "month"],
    days: ["d", "day"],
    hours: ["h", "hour"],
    minutes: ["m", "minute"],
  };
  let result = "";
  if (years >= 1) {
    result = `${getPlural(years, units["years"][type])} ${getPlural(months, units["months"][type])}`;
    return result;
  }

  if (months >= 1) {
    result = `${getPlural(months, units["months"][type])} ${getPlural(days, units["days"][type])}`;
  } else if (days >= 1) {
    result = `${getPlural(days, units["days"][type])} ${getPlural(hours, units["hours"][type])}`;
  } else if (hours >= 1) {
    result = `${getPlural(hours, units["hours"][type])} ${getPlural(minutes, units["minutes"][type])}`;
  } else if (minutes >= 1) {
    result = `${getPlural(minutes, units["minutes"][type])}`;
  } else {
    result = "<1 minute";
  }

  function getPlural(num, unit) {
    if (num == 0) return "";
    if (num > 1 && type != 0) {
      unit += "s";
    }
    return `${num} ${unit}`;
  }

  return result;
}
