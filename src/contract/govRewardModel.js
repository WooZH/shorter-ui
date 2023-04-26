/*
 * @Date: 2021-11-16 15:52:54
 * @LastEditTime: 2022-04-18 18:30:40
 * GovRewardModel
 */
import tokenJson from "@/abis/GovRewardModel.json";
import { outContract, getContractAddress } from "@/contract";
import * as Transfer from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.GovRewardModel) {
    console.log("GovRewardModel Address not found in getContract");
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.GovRewardModel, flag);
  return contract;
}

/**
 * @description: 获取质押奖励
 * @param {*} address
 * @return {*}
 */
export async function getCommitteeReward(address) {
  const contract = await getContract();
  const govReward = await contract.pendingReward(address);
  return Transfer.receiveAmount(govReward, 18) * 1;
}
