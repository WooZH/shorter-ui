import NP from "number-precision";

import tokenJson from "../abis/StrPool.json";
import { outContract, getContractAddress } from "@/contract";

import { Transaction } from "@/hooks/useTransaction";

import * as Transfer from "@/utils/transfer";
import { getGasParams } from "@/utils/gas";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.strPool) {
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.strPool, flag);
  return contract;
}

/**
 * 是否可以分发
 * @param {} strToken
 * @returns
 */
export async function isLegacyLeftover(strToken) {
  const strPoolContract = await outContract(tokenJson, strToken);
  return await strPoolContract.isLegacyLeftover();
}
/**
 * 币的总发行量
 * @param {} strToken
 * @returns
 */
export async function totalSupply(strToken) {
  const strPoolContract = await outContract(tokenJson, strToken);
  return await strPoolContract.totalSupply();
}

export async function totalStakedTokenAmount(strToken) {
  const strPoolContract = await outContract(tokenJson, strToken);
  return await strPoolContract.totalStakedTokenAmount();
}
/**
 * @description: 存币
 * @param {*}
 * @return {*}
 */

export async function deposit(amount, decimals, strToken, special = false) {
  const strPoolContract = await outContract(tokenJson, strToken, true);
  let currentAmount = Transfer.toAmount(amount, decimals);

  let tx = null;
  const gasParams = await getGasParams(strPoolContract, "deposit", currentAmount);
  // 当前链代币 需要传递value 相当于转账
  if (special) {
    tx = await strPoolContract.deposit(currentAmount, {
      value: currentAmount,
      ...gasParams,
    });
  } else {
    tx = await strPoolContract.deposit(currentAmount, gasParams);
  }

  let deposit = await tx.wait();

  Transaction(deposit.transactionHash);

  return deposit;
}

/**
* trader提取头寸中剩余的稳定币
* position: 头寸的地址
* @param: {
  strToken: pool's address,
  address: position's address
}
*/
export async function withdrawRemnantAsset(strToken, address) {
  const strPoolContract = await outContract(tokenJson, strToken, true);

  const gasParams = await getGasParams(strPoolContract, "withdrawRemnantAsset", address);
  let tx = await strPoolContract.withdrawRemnantAsset(address, gasParams);
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

/**
 * Approve Before withdraw
 * @description: 授权 sets 'amount' as the allowance of 'spender' over the caller's tokens
 * @param {(address, amount, decimals)}
 * @return {bool}
 */
export async function approve(address, amount, decimals) {
  const strPoolContract = await outContract(tokenJson, address, true);
  let currentAmount = Transfer.toAmount(amount, decimals);

  const gasParams = await getGasParams(contract, "approve", getContractAddress().ShorterBone, currentAmount);
  const tx = await strPoolContract.approve(getContractAddress().ShorterBone, currentAmount, gasParams);
  let approveResult = await tx.wait();
  Transaction(approveResult.transactionHash);
  return approveResult;
}

/**
 * Approve Before withdraw
 * @description:
 * @param {
 *  strToken: 池子的合约地址
 *  owner: 用户的地址
 *  spender: getContractAddress().ShorterBone
 * }
 * @return {bool}
 */
export async function allowance(strToken, owner) {
  const strPoolContract = await outContract(tokenJson, strToken);

  const allowance = await strPoolContract.allowance(owner, getContractAddress().ShorterBone);

  return Transfer.receiveAmount(allowance, 18);
}

/**
 * @description:
 * 取币
 * @param {
 *  percent: 按百分比取币 (0< percent <=100)
 *  value: 取币的数量
 *  decimals： 数值精度
 *  type: 1: 按数量 0: 按百分比
 *}
 * 备注: 在池中结束且有遗产的时候, 使用 percent, 可根据 isLegacyLeftover 判断
 */
export async function withdraw(strToken, value, decimals = 18, type = 1) {
  const strPoolContract = await outContract(tokenJson, strToken, true);
  let params = {
    percent: 0,
    amount: 0,
  };
  // 提款类型为
  if (type) params.amount = Transfer.toAmount(value, decimals);
  else params.percent = value;

  const gasParams = await getGasParams(strPoolContract, "withdraw", params.percent, params.amount);
  const tx = await strPoolContract.withdraw(params.percent, params.amount, gasParams);
  let withdraw = await tx.wait();
  Transaction(withdraw.transactionHash);
  return withdraw;
}

// 借币的资金费用
export async function getFundingFeeByAddress(address, strToken) {
  const strPoolContract = await outContract(tokenJson, strToken);
  const totalFee = await strPoolContract.getFundingFee(address);
  return Transfer.receiveAmount(totalFee);
}

export async function getWithdrawableAmountByPercent(address, strToken, percent, from = "") {
  const strPoolContract = await outContract(tokenJson, strToken);
  const res = await strPoolContract.getWithdrawableAmountByPercent(address, percent);

  return {
    stableTokenAmount: Transfer.receiveAmount(res.stableTokenAmount, 6),
    withdrawAmount: Transfer.receiveAmount(res.withdrawAmount),
  };
}

/**
 * @description:
 * @param {*} strToken
 * @return {*}
 */
/*
struct PoolInfo {
    // 池子id
    uint64 id;
    // 池中创建者地址
    address creator;
    // stakedToken的decimal
    uint8 stakedTokenDecimals;
    // 稳定币的 decimal
    uint8 stableTokenDecimals;
    // stakedToken 合约地址
    ISRC20 stakedToken;
    // stableToken 合约地址
    ISRC20 stableToken;
    // 杠杆倍数
    uint64 leverage;
    // 池子有效期(单位: 天)
    uint64 durationDays;
    // 池子开始块
    uint64 startBlock;
    // 池子结束块
    uint64 endBlock;
    // 池子状态
    IPoolGuardian.PoolStatus stateFlag;
}
*/
export async function getPoolInfo(strToken) {
  const contract = await outContract(tokenJson, strToken);
  const res = (await contract.getMetaInfo()) || {};
  return {
    id: Transfer.transBigNumber(res.id_) * 1,
    creator: res.creator_,
    stateFlag: res.stateFlag_,
    leverage: Transfer.transBigNumber(res.leverage_) * 1,
    durationDays: Transfer.transBigNumber(res.durationDays_) * 1,
    startBlock: Transfer.transBigNumber(res.startBlock_) * 1,
    endBlock: Transfer.transBigNumber(res.endBlock_) * 1,
    stableToken: res.stableToken_,
    stableTokenDecimals: Transfer.transBigNumber(res.stableTokenDecimals_) * 1,
    stakedToken: res.stakedToken_,
    stakedTokenDecimals: Transfer.transBigNumber(res.stakedTokenDecimals_) * 1,
  };
}

export async function getPositionInfo(strToken, hash, stakedTokenDecimals = 18, stableTokenDecimals = 18) {
  const contract = await outContract(tokenJson, strToken);
  const res = (await contract.positionInfoMap(hash)) || {};
  return {
    closedFlag: res.closedFlag,
    trader: res.trader,
    lastestFeeBlock: Transfer.transBigNumber(res.lastestFeeBlock) * 1,
    remnantAsset: Transfer.receiveAmount(res.remnantAsset, stableTokenDecimals) * 1,
    totalFee: Transfer.receiveAmount(res.totalFee, stableTokenDecimals) * 1,
    totalMarginAmount: Transfer.receiveAmount(res.totalMarginAmount || 0, stableTokenDecimals) * 1,
    unsettledCash: Transfer.receiveAmount(res.unsettledCash, stableTokenDecimals) * 1,
    totalSize: Transfer.receiveAmount(res.totalSize, stakedTokenDecimals) * 1,
    totalSize_big: res.totalSize,
  };
}

export async function getPositionAvgOpenPriceAndLiqPrice({
  hash,
  strToken,
  unsettledCash,
  leverage,
  totalSize,
  fundingFee,
}) {
  let _fundingFee = fundingFee;
  if (!_fundingFee) {
    _fundingFee = await getFundingFeeByAddress(hash, strToken);
  }
  // const availableAmount = unsettledCash - _fundingFee;
  const availableAmount = unsettledCash;
  const avgOpenPrice = NP.divide(NP.divide(NP.times(availableAmount, leverage), 1 + leverage), totalSize);
  const overdrawnPrice = NP.divide(availableAmount, totalSize);
  const liqPrice = NP.divide(NP.times(overdrawnPrice.toString(), leverage * 100 + 70), leverage * 100 + 100);
  return {
    avgOpenPrice,
    liqPrice,
  };
}
/*
  availableAmount = unsettledCash - getFundingFee(address position);
  avgOpenPrice = availableAmount.mul(l).div(1+l) / totalSize
  uint256 overdrawnPrice = availableAmount.mul(10**(uint256(poolInfo.stakedTokenDecimals).add(18).sub(uint256(poolInfo.stableTokenDecimals)))).div(positionInfo.totalSize);
  liq price: overdrawnPrice.mul(uint256(poolInfo.leverage).mul(100).add(70)).div(uint256(poolInfo.leverage).mul(100).add(100));
*/
