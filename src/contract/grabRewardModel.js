import tokenJson from "@/abis/GrabRewardModel.json";
import { outContract, getContractAddress } from "@/contract";

import { Transaction } from "@/hooks/useTransaction";

import { getGasParams } from "@/utils/gas";
import * as Transfer from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.GrabRewardModel) {
    console.log("GrabRewardModel Address not found in getContract");
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.GrabRewardModel, flag);
  return contract;
}

/**
 * @description: getGrabReward
 * @param {*}
 * @return {*}
 */
export async function getGrabReward() {
  const contract = await getContract();
  const reward = await contract.pendingReward();
  return {
    reward: Transfer.receiveAmount(reward.reward),
    estimateGasLimit: Transfer.transBigNumber(reward.estimateGasLimit),
    data: reward.data,
    signature: reward._signature,
  };
}

/**
 * @description: 薅羊毛
 * @param {*} data, signature
 * @return {*}
 */
export async function grabReward({ data, signature }) {
  const contract = await getContract(true);

  const gasParams = await getGasParams(contract, 'harvest', data, signature);
  const tx = await contract.harvest(data, signature, gasParams);
  let receipt = await tx.wait();
  Transaction(receipt.transactionHash);
  return receipt;
}
