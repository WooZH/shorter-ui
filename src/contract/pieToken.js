import { outContract, getContractAddress } from "@/contract";
import tokenJson from "../abis/PieToken.json";

import { Transaction } from "@/hooks/useTransaction";

import { getGasParams } from "@/utils/gas";
import * as Transfer from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(pieTokenAddress) {
  if (!pieTokenAddress) {
    console.log("pieTokenAddress not found in getContract");
    return;
  }
  const contract = await outContract(tokenJson, pieTokenAddress);
  return contract;
}

/**
 * @description:获取decimals
 * @param {String} token
 * @return {*}
 */
export async function decimals(token) {
  const contract = await getContract(token);
  const result = await contract.decimals();
  return result;
}
/**
 * @description:查阅批准限额
 * @param {*} token
 * @param {*} owner
 * @param {*} sender
 * @return {*}
 */
export async function allowance(token, owner) {
  if (!owner) return;
  let contractAddress = getContractAddress();
  const contract = await getContract(token);
  if (!contractAddress.ShorterBone) return;
  const allowance = await contract.allowance(owner, contractAddress.ShorterBone);
  return Transfer.receiveAmount(allowance, 18);
}

/**
 * @description:获取平台币余额
 * @param {*} token
 * @param {*} account
 * @return {*}
 */
export async function balanceOf(token, account) {
  const contract = await getContract(token);
  let _decimals = await decimals(token);
  const result = await contract.balanceOf(account);
  return Transfer.receiveAmount(result, _decimals);
}

/**
 * @description: 用于首次提现授权
 * @param {*} token
 * @param {*} owner
 * @return {*}
 */
export async function approve(token, owner) {
  const contract = await getContract(token, true);
  let contractAddress = getContractAddress();
  let amount = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  if (!contractAddress.ShorterBone) return;

  const gasParams = await getGasParams(contract, "approve", contractAddress.ShorterBone, amount);
  const tx = await contract.approve(contractAddress.ShorterBone, amount, {
    from: owner,
    ...gasParams,
  });
  let approve = await tx.wait();
  Transaction(approve.transactionHash);
  return approve;
}
