/*
 * @Date: 2021-11-16 15:38:59
 * @LastEditTime: 2022-01-12 15:11:12
 */
import tokenJson from "@/abis/VoteRewardModel.json";
import { outContract, getContractAddress } from "@/contract";
import * as Transfer from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.VoteRewardModel) {
    console.log("voteRewardModel Address not found in getContract");
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.VoteRewardModel, flag);
  return contract;
}

/**
 * @description: 投票失败奖励
 * @param {*}
 * @return {*}
 */
export async function poolFailureReward(account) {
  try {
    const contract = await getContract();
    let pendingReward = await contract.pendingReward(account);
    return Transfer.receiveAmount(pendingReward, 18);
  } catch (error) {
    console.log("poolFailureReward-pendingReward");
  }
}
