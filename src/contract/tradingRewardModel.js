/*
 * @Date: 2022-01-17 16:16:17
 * @LastEditTime: 2022-04-08 18:06:16
 */

import tokenJson from "@/abis/TradingRewardModel.json";
import { outContract, getContractAddress } from "@/contract";
import * as Transfer from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.TradingRewardModel) {
    console.log("TradingRewardModel Address not found in getContract");
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.TradingRewardModel, flag);
  return contract;
}

/**
 * @description: 个人待领取
 * @param {*} account
 * @return {*}
 */
export async function fetchPendingReward(account) {
  try {
    const contract = await getContract();
    const { rewards } = await contract.pendingReward(account);
    return Transfer.receiveAmount(rewards, 18);
  } catch (error) {
    console.log(error, "pendingReward");
  }
}
