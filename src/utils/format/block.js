import dayjs from "dayjs";
import NP from "number-precision";

import { getContractBlockSpeed } from "@/contract";
import { getCurBlockNumber, getBlockInfo } from "../block";

/**
 * @description: 块高度转化成当前时间
 * @param {*} blockNumber
 * @param {*} formatStr
 * @return {*}
 */
export async function blockToTime(blockNumber, formatStr = "MMM DD, YYYY HH:mm") {
  const curBlock = await getCurBlockNumber();

  const blockSpeed = getContractBlockSpeed();
  const duration = (curBlock - blockNumber) * blockSpeed * 1000;
  const now = new Date().getTime();

  const time = dayjs(now - duration).format(formatStr);
  return time;
}

export function blockToTimeSync(blockNumber, formatStr = "MMM DD, YYYY HH:mm") {
  const curBlock = window.blockNumber;
  const blockSpeed = getContractBlockSpeed();

  const duration = (curBlock - blockNumber) * blockSpeed * 1000;
  const now = new Date().getTime();

  const time = dayjs(now - duration).format(formatStr);
  return time;
}

/**
 * @description: 不同块高度相对时长
 * @param {*} startBlock
 * @param {*} endBlock
 * @param {*} formatStr
 * @return {*}
 */
export async function blockToEndTime(startBlock, endBlock, formatStr = "MMM DD, YYYY HH:mm") {
  try {
    const blockSpeed = getContractBlockSpeed();
    const startBlockInfo = await getBlockInfo(startBlock);
    const startTimestamp = startBlockInfo.timestamp;
    const diff = (endBlock - startBlock) * blockSpeed;
    return dayjs((startTimestamp + diff) * 1000).format(formatStr);
  } catch (e) {
    console.error("blockToEndTime error", startBlock, endBlock, e);
    return "";
  }
}

/**
 * @description: 将日期转化为块
 * @param {*} time
 * @return {*}
 */
export async function timeToBlock(time) {
  const now = new Date().getTime();
  const target = new Date(time).getTime();
  const duration = now - target;
  const blockSpeed = getContractBlockSpeed();
  const blockDistance = NP.round(NP.divide(NP.divide(duration, 1000), blockSpeed), 0);
  const curBlock = await getCurBlockNumber();
  const res = curBlock - blockDistance;
  return res < 0 ? 0 : res;
}
