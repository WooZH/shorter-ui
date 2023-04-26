import axios from "@/utils/axios";
import { getContractAddress } from "@/contract";
/**
 * @description: 获取代币的的后台配置信息
 * @param {*} address
 * @param {*} chain_id
 * @return {*}
 */
export function fetchTokenDetail(params) {
  return axios.get("/token/base_info", { params });
}

export function getTokenList() {
  return axios.get(
    `https://cdn.shorter.finance/tokens/${getContractAddress().networkName}/tokenlist.json?ts=${new Date().getTime()}`,
  );
}

export function getTokenTop() {
  return axios.get(
    `https://cdn.shorter.finance/tokens/${getContractAddress().networkName}/top.json?ts=${new Date().getTime()}`,
  );
}
