/**
 * @description: 长文本省略中间部分
 * @param {string} str 文本内容
 * @param {number} start 保留文本头部长度
 * @param {number} end 保留文本尾部长度
 * @return {string}
 */
export function ellipsisStr(str, start = 6, end = 4) {
  if (typeof str === "string") {
    return str.slice(0, start) + "..." + str.slice(-end);
  }
  return str;
}

