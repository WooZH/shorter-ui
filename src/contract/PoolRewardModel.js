/*
 * @Date: 2021-10-28 14:42:59
 * @LastEditTime: 2022-04-12 15:08:47
 */
import tokenJson from "../abis/PoolRewardModel.json";
import { outContract, getContractAddress } from "@/contract";
import * as Transfer from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.PoolRewardModel) {
    console.log("PoolRewardModel Address not found in getContract");
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.PoolRewardModel, flag);
  return contract;
}

export async function getPendingIpistrs(poolId, account) {
  try {
    const contract = await getContract();
    // update ABI
    let rewards = await contract.pendingPoolReward(account, poolId);
    return Transfer.receiveAmount(rewards, 18);
  } catch (error) {
    console.log("getPendingIpistrs in userInfoByPool", error);
  }
}

/**
 * @description: 获取池合约的所有分配点
 * @param {*}
 * @return {*}
 */
export async function totalAllocPoint() {
  const contract = await getContract();
  let result = await contract.totalAllocWeight();
  return Transfer.transBigNumber(result);
}

/**
 * @description: 池子相关回报参数
 * @param {*} poolId
 * @return {*}
 */
export async function getPoolRewardMap(poolId) {
  const contract = await getContract();
  let result = await contract.poolInfoMap(poolId);
  return {
    accIPISTRPerShare: Transfer.transBigNumber(result.accIPISTRPerShare),
    allocPoint: Transfer.transBigNumber(result.allocPoint),
    multiplier: Transfer.transBigNumber(result.multiplier),
    lastRewardBlock: Transfer.transBigNumber(result.lastRewardBlock),
  };
}
// ipistrPerBlock
/**
 * @description: 池子ipistr
 * @param {*} poolId
 * @return {*}
 */
export async function getPoolIpistrPerBlock() {
  const contract = await getContract();
  let result = await contract.ipistrPerBlock();
  return result;
}
