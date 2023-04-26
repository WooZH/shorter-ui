import { ethers } from "ethers";
import { dealDecimals } from "./format";

export function receiveAmount(amount, tokenDecimals = 18) {
  let inNumber = transBigNumber(amount);
  if (isNaN(inNumber)) return inNumber;
  if (inNumber * 1 === 0) return "0";
  let outAmount = ethers.utils.formatUnits(inNumber, tokenDecimals);
  if (tokenDecimals * 1 > 18) return dealDecimals(outAmount, 18);

  const regexp = /(?:\.0*|(\.\d+?)0+)$/;
  outAmount = outAmount.replace(regexp, "$1");
  return outAmount;
}

/**
 * @description: 大数据处理使用ethers
 * @param {*} amount
 * @param {*} tokenDecimals
 * @return {*}
 */
export function toAmount(amount, tokenDecimals = 18) {
  if (!amount * 1) return 0;
  amount = String(amount);
  const parsedVal = ethers.utils.parseUnits(amount, tokenDecimals);
  return parsedVal;
}

/**
 * @description: Bignumber => 10进制字符串
 * @param {*} object
 * @return {*}
 */
export function transBigNumber(object) {
  let isBig = ethers.BigNumber.isBigNumber(object);
  if (isBig) return object.toString();
  return object;
}
