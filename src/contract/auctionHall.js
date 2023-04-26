import { ethers, utils } from "ethers";

import { outContract, getContractAddress } from "@/contract";
import * as TradingHub from "@/contract/tradingHub";
import { commonGetLogs } from "@/contract";
import abiJson from "@/abis/AuctionHall.json";
import * as activityAction from "@/api/activities";

import { Transaction } from "@/hooks/useTransaction";

import * as Transfer from "@/utils/transfer";
import { blockToTime, encodeFilterTopics } from "@/utils/format";
import { getGasParams } from "@/utils/gas";

export const PHASE1_MAX_BLOCKS = 160;
export const PHASE2_MAX_BLOCKS = 60;

/**
 * @description:获取合约对象
 * @param {*}
 * @return {object}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress || !contractAddress.AuctionHall) {
    return;
  }
  try {
    const contract = await outContract(abiJson, contractAddress.AuctionHall, flag);
    return contract;
  } catch (error) {
    console.log(error, "getContract");
  }
}

/**
 * @description: 清算-拍卖1
 * @param {*} address
 * @param {*} bidSize
 * @param {*} priorityFee
 * @return {*}
 */
export async function bidTanto(address, bidSize, priorityFee, special = false, estProfit) {
  const contract = await getContract(true);
  bidSize = Transfer.toAmount(bidSize);
  priorityFee = Transfer.toAmount(priorityFee);

  const gasParams = await getGasParams(contract, "bidTanto", address, bidSize, priorityFee);
  let tx = null;
  if (special) {
    tx = await contract.bidTanto(address, bidSize, priorityFee, {
      value: bidSize,
      ...gasParams,
    });
  } else {
    tx = await contract.bidTanto(address, bidSize, priorityFee, gasParams);
  }

  let params = {
    op_type: "Ordering",
    tx_hash: tx.hash,
    position_address: address,
    account_address: tx.from,
    bid_size: bidSize.toString(),
    estimate_rewards: estProfit,
    user_type: "tanto",
  };

  activityAction.userCommit(params);

  const result = await tx.wait();
  Transaction(result.transactionHash);
  return result;
}

/**
 * @description: 清算-拍卖2
 * @param {*} address
 * @param {*} path [busdAddress, tokenAddress]
 * @return {*}
 */
export async function bidKatana(address, path, swapRouter, estProfit) {
  const contract = await getContract(true);
  const isV3 = await TradingHub.isSwapRouterV3(swapRouter);
  if (isV3) {
    path = path.reverse();
  }

  const fees = [3000];
  const _path = TradingHub.encodePath(path, fees);

  const gasParams = await getGasParams(contract, "bidKatana", address, _path);
  const tx = await contract.bidKatana(address, _path, gasParams);
  const result = await tx.wait();
  Transaction(result.transactionHash);

  const params = {
    op_type: "Ordering",
    tx_hash: tx.hash,
    position_address: address,
    account_address: tx.from,
    bid_size: "",
    estimate_rewards: estProfit,
    user_type: "katana",
  };
  activityAction.userCommit(params);

  return result;
}

/**
 * @description: 获取phase1数据
 * @param {*} positionHash
 * @return {*}
 */
/*
struct Phase1Info {
    // phase1总竞拍数量
    uint256 bidSize;
    // phase1的清算价格
    uint256 liquidationPrice;
    // phase1是否排序
    bool isSorted;
    // phase1是否完成了债务的拍卖
    bool flag; // If the debts have been cleared
}
*/
export async function getPhase1Info(positionHash, stakedTokenDecimals = 18) {
  const contract = await getContract();
  const { bidSize, liquidationPrice, flag, isSorted } = (await contract.phase1Infos(positionHash)) || {};
  return {
    bidSize: Transfer.receiveAmount(bidSize, stakedTokenDecimals),
    liquidationPrice: Transfer.receiveAmount(liquidationPrice, 18),
    flag,
    isSorted,
  };
}

/**
 * @description: 获取phase2数据
 * @param {*} positionHash
 * @return {*}
 */
/*
struct Phase2Info {
    // phase2是否完成了债务的拍卖
    bool flag; // If the debts have been cleared
    // phase2的交易奖励是否已经提取
    bool isWithdraw;
    // phase2的清算人
    address rulerAddr;
    // phase2清算的债务数量
    uint256 debtSize;
    // phase2消耗的usd数量
    uint256 usedCash;
    // phase2清算人的奖励
    uint256 dexCoverReward;
} */

export async function getPhase2Info(positionHash, stakedTokenDecimals = 18, stableTokenDecimals = 18) {
  const contract = await getContract();
  const res = (await contract.phase2Infos(positionHash)) || {};
  return {
    flag: res.flag,
    isWithdraw: res.isWithdraw,
    rulerAddr: res.rulerAddr,
    debtSize: Transfer.receiveAmount(res.debtSize, stakedTokenDecimals),
    usedCash: Transfer.receiveAmount(res.usedCash, stableTokenDecimals),
    dexCoverReward: Transfer.receiveAmount(res.dexCoverReward, stableTokenDecimals),
  };
}

export async function getPhase1BidList(positionHash, fromBlock, toBlock) {
  const topics = await encodeFilterTopics(abiJson, "BidTanto");
  const coderAbi = new utils.AbiCoder();
  topics.push(coderAbi.encode(["address"], [positionHash]));
  const logs = await getLogs({ fromBlock, toBlock: toBlock, topics });
  const bidList = [];
  await Promise.all(
    logs.map(async log => {
      const bidItem = {
        ...log,
        bidTime: await blockToTime(Transfer.transBigNumber(log.blockNumber), "MMM DD, YYYY HH:mm:ss"),
      };
      bidList.push(bidItem);
    }),
  );
  return bidList;
}

/**
 * @description: 获取auctionHall的日志
 * @param {*} filter{fromBlock, toBlock,topics}
 * @return {*}
 */
export async function getLogs(filter = {}) {
  let contractAddress = getContractAddress(); // 获取当前合约配置
  filter = { ...filter, address: contractAddress.AuctionHall };
  const callPromise = await commonGetLogs(filter);
  const list = [];
  callPromise.forEach(log => {
    const res = transHistoryLog(log);
    if (res) {
      list.push(res);
    }
  }); //处理返回的日志信息
  return list;
}

function transHistoryLog(log) {
  try {
    let iface = new ethers.utils.Interface(abiJson);
    let item = iface.parseLog(log);
    if (item.name === "BidTanto") {
      const args = item.args;
      return {
        ruler: args.ruler,
        positionAddr: args.positionAddr,
        bidSize: Transfer.receiveAmount(args.bidSize),
        priorityFee: Transfer.receiveAmount(args.priorityFee),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    }
    return false;
  } catch (error) {
    return null;
  }
}

/**
 * @description: 获取账号相关收益
 * @param {*} hash
 * @return {*}
 */
export async function queryResidues(hash, account) {
  const contract = await getContract();
  const rank = await contract.bidSorted(hash);
  const res = await contract.queryResidues(hash, rank, account);
  return {
    debtTokenSize: res.debtTokenSize,
    priorityFee: res.priorityFee,
    stableTokenSize: res.stableTokenSize,
  };
}

/**
 * @description: 获取ruler奖励
 * @param {*} hash
 * @return {*}
 */
export async function retrieveRulerAssets(hash) {
  const contract = await getContract(true);
  const rank = await contract.bidSorted(hash);

  const gasParams = await getGasParams(contract, "retrieve", hash, rank);
  let tx = await contract.retrieve(hash, rank, gasParams);
  let result = await tx.wait();
  Transaction(result.transactionHash);
  return result;
}
