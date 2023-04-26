import dayjs from "dayjs";
import { useTimezone } from "@/hooks/useTimezone";

const { tz } = useTimezone();

/**number
 * @description: 日期格式化
 * @param {string} date 日期
 * @param {string} formatStr 规则
 * @return {string}
 */
export function formatDate(date, formatStr = "MMM DD, YYYY HH:mm") {
  if (date === "Invalid Date") return "";
  if (!dayjs(date).isValid()) return "";

  let dateVal = dayjs(date);
  let formatResult = dateVal.utcOffset(tz.value).format(formatStr).trim();

  if (formatResult.endsWith(",")) {
    formatResult = formatResult.replace(/,$/g, "");
  }

  return formatResult;
}

export function fromNow(date) {
  if (!dayjs(date).isValid()) return "";

  return dayjs(date).fromNow(true);
}
