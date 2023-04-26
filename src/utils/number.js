function getMidNum(str, start, len) {
  if (start + len > 0) {
    return +str.substr(start < 0 ? 0 : start, start < 0 ? start + len : len);
  } else {
    return 0;
  }
}

function pushZero(str, max) {
  const len = str.length;
  const diff = max - len;
  if (!str) str = 0;
  if (len < max) {
    if (str.includes(".")) {
      for (let i = 0; i < diff; i++) {
        str += "0";
      }
    } else {
      str += ".";
      for (let i = 0; i < diff - 1; i++) {
        str += "0";
      }
    }
    return str;
  } else {
    return str;
  }
}

export const bigNumCompare = (numA, numB) => {
  if (!numA || !numB) return 0;
  const inputA = Number(numA);
  const inputB = Number(numB);
  if (inputA.toFixed(0) !== inputB.toFixed(0)) {
    const diff = inputA.toFixed(0) - inputB.toFixed(0);
    if (diff > 0) {
      return 1;
    } else {
      return -1;
    }
  }
  let back = 0;
  const maxLength = Math.max(numA.length, numB.length);
  let max = Math.ceil(Math.max(numA.length, numB.length) / 15);
  const a = pushZero(numA, maxLength);
  const b = pushZero(numB, maxLength);
  for (let i = max; i > 0; i--) {
    let num1 = getMidNum(a, a.length - i * 15, 15);
    let num2 = getMidNum(b, b.length - i * 15, 15);
    let cur = num1 - num2;
    if (cur < 0) {
      back = -1;
      break;
    } else if (cur > 0) {
      back = 1;
      break;
    }
  }
  return back;
};
