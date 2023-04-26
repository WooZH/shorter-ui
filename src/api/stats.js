import axios from "@/utils/axios";
import { getContractAddress } from "@/contract";

/**
 * @description: 获取池子图表数据
 * @param {*}
 * flag: {
 *  true deposit
 *  false borrow
 * }
 */
export function getPoolStats() {
  return axios.get(
    `https://cdn.shorter.finance/stats/${getContractAddress().networkName}/pool.json?ts=${new Date().getTime()}`,
  );
}

export function getMyStats(user, days) {
  return axios.get(getContractAddress().apiUrl + "/stats/user?user=" + user + "&days=" + days);
}

export function getLiquidationStats() {
  return axios.get(
    `https://cdn.shorter.finance/stats/${getContractAddress().networkName}/liquidation.json?ts=${new Date().getTime()}`,
  );
}
