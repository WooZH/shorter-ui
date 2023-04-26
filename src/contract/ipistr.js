import { outContract, getContractAddress } from "@/contract";
import tokenJson from "../abis/IpistrToken.json";

import { Transaction } from "@/hooks/useTransaction";

import { getGasParams } from "@/utils/gas";
import * as Transfer from "@/utils/transfer";

export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.IPISTR) {
    throw "ipi_contract_address not found";
  }
  const contract = await outContract(tokenJson, contractAddress.IPISTR, flag);
  return contract;
}

/**
 * @description:获取平台币余额
 * @param {*} address
 * @return {*}
 */
export async function balanceOf(address) {
  const contract = await getContract();
  let result = await contract.balanceOf(address);
  result = Transfer.receiveAmount(result, 18);
  return result;
}

/**
 * @description: 获取lockedBalance
 * @param {*} address
 * @return {*}
 */
export async function lockedBalanceOf(address) {
  const contract = await getContract();
  let result = await contract.lockedBalanceOf(address);
  result = Transfer.receiveAmount(result, 18);
  return result;
}

/**
 * @description:查阅批准限额
 * @param {*} owner
 * @param {*} sender
 * @return {*}
 */
export async function allowance(owner, sender) {
  const contract = await getContract();
  const allowance = await contract.allowance(owner, sender);
  return Transfer.receiveAmount(allowance, 18);
}

/**
 * @description:开始授权
 * @param {*} sender
 * @param {*} owner
 * @param {*} amount
 * @return {*}
 */
export async function approve(sender, owner) {
  const contract = await getContract(true);
  let amount = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

  const gasParams = await getGasParams(contract, "approve", sender, amount);
  const tx = await contract.approve(sender, amount, { from: owner, ...gasParams });
  const approve = await tx.wait();
  Transaction(approve.transactionHash);
  return approve;
}

/**
 * @description: 获取平台币基础信息
 * @param {*}
 * @return {object}
 */
export async function getBasic() {
  const contract = await getContract();
  const name = await contract.name();
  const symbol = await contract.symbol();
  const totalSupply = await contract.totalSupply();
  return {
    name: name,
    symbol: symbol,
    totalSupply: totalSupply,
  };
}
