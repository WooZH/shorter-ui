import { outContract, getContractAddress } from "@/contract";
import tokenJson from "../abis/ERC20.json";
import usdtJson from "../abis/IUSDT.json";

import { getRPCProvider  } from "@/wallet/provider";
import { Transaction } from "@/hooks/useTransaction";

import { getTokenAddressByName } from "@/utils/localStorage";
import * as Transfer from "@/utils/transfer";
import { getGasParams } from "@/utils/gas";

export async function getContract(token, flag = false) {
  const contract = await outContract(tokenJson, token, flag);
  return contract;
}

/**
 * @description:获取平台币余额
 * @param {*} token_address
 * @param {*} account
 * @return {*}
 */
export async function getBalanceOf(token_address, account) {
  let contractAddress = getContractAddress();

  // 特殊处理 如在ethereum上eth查询的是钱包余额
  if (contractAddress.chainTokenAddress === token_address) {
    const provider = getRPCProvider();
    const res = await provider.getBalance(account);
    return Transfer.receiveAmount(res, 18);
  } else {
    const contract = await getContract(token_address);
    let tokenDecimals = await decimals(token_address);
    const result = await contract.balanceOf(account);
    return Transfer.receiveAmount(result, tokenDecimals);
  }
}

/**
 * @description: 获取改token的简称
 * @param {*} token_address
 * @return {*}
 */
export async function symbol(token_address) {
  const contract = await getContract(token_address);
  const symbol = await contract.symbol();
  const name = await fullName(token_address);
  return { symbol, name };
}

export async function fullName(token_address) {
  try {
    const contract = await getContract(token_address);
    const name = await contract.name();
    return name;
  } catch (error) {
    console.log("token: " + token_address + "fetch name error", error);
  }
}

/**
 * @description:获取decimals
 * @param {*}
 * @return {*}
 */
export async function decimals(token_address) {
  const contract = await getContract(token_address);
  const result = await contract.decimals();
  return result;
}

/**
 * @description:查阅批准限额
 * @param {*} token
 * @param {*} owner
 * @return {*}
 */
export async function allowance(token, owner, stableDecimals) {
  const contract = await getContract(token, true);
  let contractAddress = getContractAddress();
  if (!contractAddress.ShorterBone) return;
  const allowance = await contract.allowance(owner, contractAddress.ShorterBone);
  return Transfer.receiveAmount(allowance, stableDecimals);
}

/**
 * @description:开始授权
 * @param {*} token
 * @param {*} owner
 * @return {*}
 */
export async function approve(token, owner, allowance) {
  const contract = await getContract(token, true);
  let contractAddress = getContractAddress();
  // from shortBone
  const USDT_ADDRESS = getTokenAddressByName("USDT");
  console.log("token, owner, allowance", USDT_ADDRESS, token, owner, allowance);
  let tetherToken = USDT_ADDRESS;
  if (token === tetherToken) {
    await usdtApprove(token, allowance);
  } else {
    let amount = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    if (!contractAddress.ShorterBone) return;

    const gasParams = await getGasParams(contract, "approve", contractAddress.ShorterBone, amount);
    const tx = await contract.approve(contractAddress.ShorterBone, amount, {
      from: owner,
      ...gasParams,
    });
    const approve = await tx.wait();
    Transaction(approve.transactionHash);
    return approve;
  }
}

// reset allowance to 0 every single time
// before set a higher or lower target price
// tether approve
export async function usdtApprove(token, allowance = "0") {
  let contractAddress = getContractAddress();

  let amount = "0";
  let amountMax = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  if (allowance == 0) {
    amount = amountMax;
  }
  const contract = await outContract(usdtJson, token, true);

  const gasParams = await getGasParams(contract, "approve", contractAddress.ShorterBone, amount);
  const tx = await contract.approve(contractAddress.ShorterBone, amount, gasParams);
  const approve = await tx.wait();
  Transaction(approve.transactionHash);
  return approve;
}

/**
 * @description: 获取代币总量
 * @param {*} token_address
 * @return {*}
 */
export async function totalSupply(token_address) {
  const contract = await getContract(token_address);
  const amount = await contract.totalSupply();
  return amount;
}
/**
 * @description: 获取代币现有量
 * @param {*} token_address
 * @return {*}
 */

export async function balanceOf(stakedToken, strToken) {
  const contract = await getContract(stakedToken); //stakedToken
  const amount = await contract.balanceOf(strToken); //strToken 池子合约地址 ，account 用户的地址

  return amount;
}
