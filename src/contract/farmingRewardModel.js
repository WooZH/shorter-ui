import { outContract, getContractAddress } from "@/contract";
import tokenJson from "@/abis/FarmingRewardModel";
import * as Transfer from "@/utils/transfer";
import { Transaction } from "@/hooks/useTransaction";
import { getGasParams } from "@/utils/gas";

/**
 * @description:获取合约对象
 * @param {*}
 * @return {object}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress.FarmingRewardModel) return;
  try {
    const contract = await outContract(tokenJson, contractAddress.FarmingRewardModel, flag);
    return contract;
  } catch (error) {
    console.log(error, "getContract");
  }
}

/**
 * @description: 计算器解锁速度
 * @param {*} params
 * @return {*}
 */
export async function baseUnlockSpeed() {
  const contract = await getContract();
  let speed = await contract.baseUnlockSpeed();
  return Transfer.receiveAmount(speed, 18);
}

/**
 * @description: getSpeed
 * @param {*} poolId
 * @param {*} address
 * @return {*}
 */
export async function getSpeed(address) {
  const contract = await getContract();
  let speed = await contract.getSpeed(address);
  return Transfer.receiveAmount(speed, 18);
}

/**
 * @description: LP池子奖励
 * @param {*} poolId
 * @param {*} address
 * @return {*}
 */
export async function pendingReward(address) {
  const contract = await getContract();
  const res = await contract.pendingReward(address);
  return {
    reward: Transfer.receiveAmount(res.rewards_, 18) * 1,
    unlockedReward: Transfer.receiveAmount(res.unLockRewards_, 18) * 1,
  };
}

/**
 * @description: UnLockedMode
 * @param {*} poolId
 * @param {*} address
 * @return {*}
 */
export async function exitMode() {
  const contract = await getContract(true);

  const gasParams = await getGasParams(contract, "exitUnLockedMode");
  let tx = await contract.exitUnLockedMode(gasParams);
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

export async function getMaxUnlockSpeed() {
  const contract = await getContract();
  return contract.maxUnlockSpeed();
}
export async function getMaxLpSupply() {
  const contract = await getContract();
  return contract.maxLpSupply();
}
/*
totalSupply:lp=IPISTR:reserve1=USDT:reserve0
*/

/** v3 */

export async function getSpeedV3(address) {
  const contract = await getContract();
  let speed = await contract.getSpeed(address);
  return speed;
}

export async function harvest(address) {
  const contract = await getContract(true);

  const gasParams = await getGasParams(contract, "harvest", address);
  let tx = await contract.harvest(address, gasParams);
  let results = await tx.wait();
  return results;
}
