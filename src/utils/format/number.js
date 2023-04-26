import NP from "number-precision";

/**
 * @description: 纯数量格式化
 * @param {number} num 数字
 * @param {number} decimal 小数
 * @param {boolean} unit 是否带单位
 * @return {number}
 */
export function formatNum(num, decimal = 2, unit = false) {
  if (num == null) return num;

  if (typeof num === "string") {
    if (Number.isNaN(Number.parseFloat(num))) return num;
    if (num === "0.0") return num;

    num = Number.parseFloat(num);
  }

  if (typeof num !== "number") return num;

  if (num === 0) return 0;

  if (unit) {
    const unitResult = getFormatUnit(num);
    const result = addThousandsSep(dealDecimals(unitResult.number, decimal)) + unitResult.unit;
    return result;
  } else {
    const result = addThousandsSep(dealDecimals(num, decimal));
    return result;
  }
}

/*
 * 1.2345678 => 1.2345
 * 1234.567 => 1,234.56
 * 0.0000001234567 => 0.0{6}1234
 */
export function formatPlainNum(price) {
  if (!price) return price;

  if (typeof price === "string") {
    price = price * 1;
  }

  if (typeof price === "number") {
    if (price >= 100) {
      return addThousandsSep(dealDecimals(price, 2));
    }

    if (price >= 1) {
      return dealDecimals(price, 4);
    }

    if (price > 0) {
      return replaceZero(price);
    }
  }

  return price;
}

export function addThousandsSep(num) {
  if (num == undefined) return "";

  let parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/**
 * @description: 金额规则
 * @param {*} num 金额
 * @param {*} unit 单位分隔符
 * @return {*}
 */
export function toAmount(num, unit = true) {
  if (typeof num === "string") {
    if (Number.isNaN(Number.parseFloat(num))) return num;
    num = Number.parseFloat(num);
  }
  if (typeof num !== "number") return num;

  if (num === 0) return 0;

  const target = Math.abs(num);

  if (target >= 0.01) {
    return formatNum(num, 2, unit);
  }

  if (target >= 0.0001 && target < 0.01) {
    return formatNum(num, 3);
  }

  if (target < 0.0001) {
    return 0;
  }

  return num;
}

/**
 * @description: 百分比转化
 * @param {*} percent
 * @return {*}
 */
export function toPercent(percent) {
  percent = Math.abs(percent);
  if (percent * 1 === 0) return "0";
  if (percent * 1 < 0.01) return "< 0.01";
  return formatNum(percent * 1);
}

/**
 * @description: 将科学记数法转化正常计数
 * @param {*} num
 * @return {*} string
 */
export function toNonExponential(num) {
  if (typeof num === "string") {
    if (Number.isNaN(Number.parseFloat(num))) return num;
    if (!num.includes(e)) return num;
    num = Number.parseFloat(num);
  }
  if (typeof num !== "number") return num;
  if (!String(num).includes("e")) return String(num);

  const m = num.toExponential().match(/\d(?:\.(\d*))?e([+-]\d+)/);
  const fixedDig = Math.max(0, (m[1]?.length || 0) - m[2]);

  return num.toFixed(fixedDig);
}

export function toQuantity(amount, price = 1) {
  if (!amount * 1) return 0;

  try {
    if (price * 1 < 0.1) {
      return formatNum(amount, 0);
    } else {
      let target = NP.divide(1, price * 1);
      let precision = getAccuracy(target, 0);
      return formatNum(amount, precision);
    }
  } catch (error) {
    console.log("toQuantity", error);
  }
}

/*
 * 1456 => 2
 * 0.00012 => 7
 */
function getAccuracy(number, length = 3) {
  if (number * 1 === 0) return 0;
  if (number * 1 >= 1) return 2;

  try {
    number = String(toNonExponential(number));
    let target = number.split(".")[1];
    let index = target.search(/[1-9]/);
    index = index + length + 1;

    return index;
  } catch (error) {
    console.log(error, number, "length");
    return 0;
  }
}

/*
 * (0.1234567, 4) => 0.1234
 */
export function dealDecimals(value, decimals) {
  const number = toNonExponential(value);
  const isDealPoint = number.split(".");

  if (isDealPoint?.length === 2) {
    const integer = isDealPoint[0];
    const point = isDealPoint[1];

    if (point?.length) {
      const subDecimalsNum = decimals ? decimals * 1 + 1 : 0;
      const maxLength = subDecimalsNum + integer.length;
      return number.substring(0, maxLength);
    }
  }

  return number;
}

/*
 * 0.0000001234567 => 0.0{6}1234
 */
export function replaceZero(price) {
  if (!price) return price;

  const number = toNonExponential(price);
  const isDealPoint = number.split(".");

  if (isDealPoint?.length === 2) {
    const index = isDealPoint[1].search(/[1-9]/);
    const head = `${isDealPoint[0]}.0{${index}}`;
    if (index === 0) {
      const noZeroHead = `${isDealPoint[0]}.`;
      return noZeroHead + isDealPoint[1].substring(index, index + 4);
    }
    const result = head + isDealPoint[1].substring(index, index + 4);
    return result;
  }
  return number;
}

/*
 * 10000 => { number: 10, unit: 'k', pow: 1000 }
 */
export function getFormatUnit(num) {
  let result = +num;

  const units = ["", "K", "M", "B", "T"];
  let unitIndex;
  if (num < 10 ** 4) {
    //nothing
    unitIndex = 0;
  } else if (num < 10 ** 7) {
    //K
    unitIndex = 1;
  } else if (num < 10 ** 10) {
    //M
    unitIndex = 2;
  } else if (num < 10 ** 13) {
    //B
    unitIndex = 3;
  } else {
    //T
    unitIndex = 4;
  }

  const powNum = Math.pow(1000, unitIndex);
  result = NP.divide(result, powNum);

  return {
    number: result,
    unit: units[unitIndex],
    pow: powNum,
  };
}

/*
 * 0.1230000 => 0.123
 */
export function trimZeroOfMantissa(num) {
  const numStr = `${num}`;
  if (numStr === "0") return numStr;

  return numStr.replace(/\.?0*$/, "");
}
