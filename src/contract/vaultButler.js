import { ethers, utils } from "ethers";
import NP from "number-precision";
import { Contract } from "ethers-multicall";

import { outContract, getContractAddress, commonGetLogs } from "@/contract";
import StrPoolABI from "@/abis/StrPool.json";
import TradingHubABI from "@/abis/TradingHub.json";
import AuctionHallABI from "@/abis/AuctionHall.json";
import VaultButlerABI from "@/abis/VaultButler.json";
import ERC20ABI from "@/abis/ERC20.json";

import { getMulticallProvider } from "@/wallet/provider";
import * as activityAction from "@/api/activities";
import { Transaction } from "@/hooks/useTransaction";

import { blockToTime, encodeFilterTopics } from "@/utils/format";
import { getGasParams } from "@/utils/gas";
import * as Transfer from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress || !contractAddress.VaultButler) {
    console.log("ipi_contract_address not found");
    return;
  }
  const contract = await outContract(VaultButlerABI, contractAddress.VaultButler, flag);
  return contract;
}

/**
 * @description: 当头寸进入legacy后进入自由拍卖
 * @param {*} hash 头寸地址
 * @param {*} bidSize 拍卖的size
 * @return {*}
 */
export async function executeNaginata(hash, bidSize, special = false, estProfit) {
  const contract = await getContract(true);
  let tx = null;

  const gasParams = await getGasParams(contract, "executeNaginata", hash, bidSize);
  if (special) {
    tx = await contract.executeNaginata(hash, bidSize, {
      value: bidSize,
      ...gasParams,
    });
  } else {
    tx = await contract.executeNaginata(hash, bidSize, gasParams);
  }

  // ordering
  let params = {
    op_type: "Ordering",
    tx_hash: tx.hash,
    position_address: hash,
    account_address: tx.from,
    bid_size: bidSize.toString(),
    estimate_rewards: estProfit,
    user_type: "naginata",
  };

  activityAction.userCommit(params);

  let legacyBid = await tx.wait();
  if (legacyBid.transactionHash) Transaction(legacyBid.transactionHash);
  return legacyBid;
}

/**
 * @description:
 * @param {*} positionHash
 * @return {*}
 */
/*
struct LegacyInfo {
    // 竞拍清算的债务数量
    uint256 bidSize;
    // 竞拍消耗的usd数量
    uint256 usedCash;
}
*/
export async function getLegacyInfo(positionHash, stakedTokenDecimals = 18, stableTokenDecimals = 18) {
  const contract = await getContract();
  const res = await contract.legacyInfos(positionHash);
  return {
    bidSize: Transfer.receiveAmount(res.bidSize, stakedTokenDecimals) * 1,
    usedCash: Transfer.receiveAmount(res.usedCash, stableTokenDecimals) * 1,
    bidSize_big: res.bidSize,
  };
}

/**
 * @description: 抓取线上历史事件日志
 * @param {*} filter -{fromBlock, toBlock, address,topics}
 * @param  {*} fromBlock 开始区块
 * @param  {*} toBlock 结束区块
 * @param  {*} address 合约地址
 * @return {*}
 */
export async function getLogs(filter = {}, stakedTokenDecimals = 18, stableTokenDecimals = 6) {
  let contractAddress = getContractAddress();
  filter = { ...filter, address: contractAddress.VaultButler };
  const callPromise = await commonGetLogs(filter);
  const list = [];
  callPromise.forEach(log => {
    const res = transHistoryLog(log, stakedTokenDecimals, stableTokenDecimals);
    if (res) {
      list.push(res);
    }
  });
  return list;
}

function transHistoryLog(log, stakedTokenDecimals = 18, stableTokenDecimals = 6) {
  try {
    let iface = new ethers.utils.Interface(VaultButlerABI);
    let item = iface.parseLog(log);
    if (item.name === "ExecuteNaginata") {
      const args = item.args;
      return {
        ruler: args.ruler,
        positionAddr: args.positionAddr,
        bidSize: Transfer.receiveAmount(args.bidSize, stakedTokenDecimals),
        receiveSize: Transfer.receiveAmount(args.receiveSize, stableTokenDecimals),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * @description: 获取拍卖legacy
 * @param {*} hash
 * @return {*}
 */
export async function getLegacyBidList(positionHash, fromBlock, toBlock, stakedTokenDecimals, stableTokenDecimals) {
  const topics = await encodeFilterTopics(VaultButlerABI, "ExecuteNaginata");
  const coderAbi = new utils.AbiCoder();
  topics.push(coderAbi.encode(["address"], [positionHash]));
  const allLogs = await getLogs({ fromBlock, toBlock: "latest", topics }, stakedTokenDecimals, stableTokenDecimals);
  const logs = allLogs.filter(log => log.positionAddr === positionHash);
  const legacyBidList = [];
  await Promise.all(
    logs.map(async log => {
      const bidItem = {
        ...log,
        bidPrice: NP.divide(log.receiveSize, log.bidSize),
        bidTime: await blockToTime(Transfer.transBigNumber(log.blockNumber), "MMM DD, YYYY HH:mm:ss"),
      };
      legacyBidList.push(bidItem);
    }),
  );
  return legacyBidList;
}

export async function getBaseLiquidations(hashList = [], status) {
  const res = [];
  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const THContract = new Contract(contractAddress.TradingHub, TradingHubABI);
  let callList = [];
  hashList.forEach(hash => {
    callList.push(THContract.positionInfoMap(hash));
  });
  const strTokenList = await ethcallProvider.all(callList);

  callList = [];
  strTokenList.forEach((item, index) => {
    const SPContract = new Contract(item.strToken, StrPoolABI);
    callList.push(SPContract.getMetaInfo());
    callList.push(THContract.positionBlocks(hashList[index]));
  });
  const positionList = await ethcallProvider.all(callList);

  for (let i = 0; i < positionList.length / 2; i++) {
    const zIndex = i * 2;
    const poolInfo = positionList[zIndex];
    const positionBlocks = positionList[zIndex + 1];
    const _poolInfo = {
      id: Transfer.transBigNumber(poolInfo.id_) * 1,
      creator: poolInfo.creator_,
      stateFlag: poolInfo.stateFlag_,
      leverage: Transfer.transBigNumber(poolInfo.leverage_) * 1,
      durationDays: Transfer.transBigNumber(poolInfo.durationDays_) * 1,
      startBlock: Transfer.transBigNumber(poolInfo.startBlock_) * 1,
      endBlock: Transfer.transBigNumber(poolInfo.endBlock_) * 1,
      stableToken: poolInfo.stableToken_,
      stableTokenDecimals: Transfer.transBigNumber(poolInfo.stableTokenDecimals_) * 1,
      stakedToken: poolInfo.stakedToken_,
      stakedTokenDecimals: Transfer.transBigNumber(poolInfo.stakedTokenDecimals_) * 1,
    };
    const _positionBlocks = {
      openBlock: Transfer.transBigNumber(positionBlocks.openBlock) * 1,
      closingBlock: Transfer.transBigNumber(positionBlocks.closingBlock) * 1,
      overdrawnBlock: Transfer.transBigNumber(positionBlocks.overdrawnBlock) * 1,
      closedBlock: Transfer.transBigNumber(positionBlocks.closedBlock) * 1,
    };

    if (status == 8) {
      if (_positionBlocks.closingBlock > 0 || _positionBlocks.overdrawnBlock > 0) {
        res.push({
          hash: hashList[i],
          strToken: strTokenList[i].strToken,
          positionState: strTokenList[i].positionState,
          poolInfo: _poolInfo,
          positionBlocks: _positionBlocks,
        });
      }
    } else {
      res.push({
        hash: hashList[i],
        strToken: strTokenList[i].strToken,
        positionState: strTokenList[i].positionState,
        poolInfo: _poolInfo,
        positionBlocks: _positionBlocks,
      });
    }
  }
  return res;
}

export async function getClosingLiquidations(baseLiquidations = []) {
  const res = [];
  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const AHContract = new Contract(contractAddress.AuctionHall, AuctionHallABI);
  const callList = [];
  baseLiquidations.forEach(item => {
    const SPContract = new Contract(item.strToken, StrPoolABI);
    const ERC20Contract = new Contract(item.poolInfo.stakedToken, ERC20ABI);
    callList.push(SPContract.positionInfoMap(item.hash));
    callList.push(AHContract.phase1Infos(item.hash));
    callList.push(ERC20Contract.symbol());
    callList.push(SPContract.getFundingFee(item.hash));
  });
  const detailLiqs = await ethcallProvider.all(callList);
  for (let i = 0; i < detailLiqs.length / 4; i++) {
    const baseItem = baseLiquidations[i];
    const { stableTokenDecimals, stakedTokenDecimals } = baseItem.poolInfo || {};
    const zIndex = i * 4;
    const positionInfoMap = detailLiqs[zIndex];
    const phase1Infos = detailLiqs[zIndex + 1];
    const symbol = detailLiqs[zIndex + 2];
    const fundingFee = detailLiqs[zIndex + 3];

    const _positionInfoMap = {
      closedFlag: positionInfoMap.closedFlag,
      trader: positionInfoMap.trader,
      lastestFeeBlock: Transfer.transBigNumber(positionInfoMap.lastestFeeBlock || 0) * 1,
      remnantAsset: Transfer.receiveAmount(positionInfoMap.remnantAsset || 0, stableTokenDecimals) * 1,
      totalFee: Transfer.receiveAmount(positionInfoMap.totalFee || 0, stableTokenDecimals) * 1,
      totalMarginAmount: Transfer.receiveAmount(positionInfoMap.totalMarginAmount || 0, stableTokenDecimals) * 1,
      unsettledCash: Transfer.receiveAmount(positionInfoMap.unsettledCash || 0, stableTokenDecimals) * 1,
      totalSize: Transfer.receiveAmount(positionInfoMap.totalSize || 0, stakedTokenDecimals),
      totalSize_big: positionInfoMap.totalSize,
    };

    const _phase1Infos = {
      bidSize: Transfer.receiveAmount(phase1Infos.bidSize || 0, stakedTokenDecimals) * 1,
      liquidationPrice: Transfer.receiveAmount(phase1Infos.liquidationPrice || 0, 18) * 1,
      flag: phase1Infos.flag,
      isSorted: phase1Infos.isSorted,
    };

    res.push({
      ...baseLiquidations[i],
      positionInfoMap: _positionInfoMap,
      phase1Infos: _phase1Infos,
      symbol,
      fundingFee: Transfer.receiveAmount(fundingFee),
    });
  }
  return res;
}

export async function getLegacyLiquidations(baseLiquidations) {
  const res = [];
  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const VBContract = new Contract(contractAddress.VaultButler, VaultButlerABI);
  const callList = [];
  baseLiquidations.forEach(item => {
    const SPContract = new Contract(item.strToken, StrPoolABI);
    const ERC20Contract = new Contract(item.poolInfo.stakedToken, ERC20ABI);
    callList.push(SPContract.positionInfoMap(item.hash));
    callList.push(VBContract.legacyInfos(item.hash));
    callList.push(ERC20Contract.symbol());
    callList.push(SPContract.getFundingFee(item.hash));
  });
  const detailLiqs = await ethcallProvider.all(callList);
  for (let i = 0; i < detailLiqs.length / 4; i++) {
    const baseItem = baseLiquidations[i];
    const { stableTokenDecimals, stakedTokenDecimals } = baseItem.poolInfo || {};
    const zIndex = i * 4;
    const positionInfoMap = detailLiqs[zIndex];
    const legacyInfos = detailLiqs[zIndex + 1];
    const symbol = detailLiqs[zIndex + 2];
    const fundingFee = detailLiqs[zIndex + 3];

    const _positionInfoMap = {
      closedFlag: positionInfoMap.closedFlag,
      trader: positionInfoMap.trader,
      lastestFeeBlock: Transfer.transBigNumber(positionInfoMap.lastestFeeBlock || 0) * 1,
      remnantAsset: Transfer.receiveAmount(positionInfoMap.remnantAsset || 0, stableTokenDecimals) * 1,
      totalFee: Transfer.receiveAmount(positionInfoMap.totalFee || 0, stableTokenDecimals) * 1,
      totalMarginAmount: Transfer.receiveAmount(positionInfoMap.totalMarginAmount || 0, stableTokenDecimals) * 1,
      unsettledCash: Transfer.receiveAmount(positionInfoMap.unsettledCash || 0, stableTokenDecimals) * 1,
      totalSize: Transfer.receiveAmount(positionInfoMap.totalSize || 0, stakedTokenDecimals),
      totalSize_big: positionInfoMap.totalSize,
    };

    const _legacyInfos = {
      bidSize: Transfer.receiveAmount(legacyInfos.bidSize || 0, stakedTokenDecimals) * 1,
      usedCash: Transfer.receiveAmount(legacyInfos.usedCash || 0, stableTokenDecimals) * 1,
      bidSize_big: legacyInfos.bidSize,
    };
    res.push({
      ...baseLiquidations[i],
      positionInfoMap: _positionInfoMap,
      legacyInfos: _legacyInfos,
      symbol,
      fundingFee: Transfer.receiveAmount(fundingFee),
    });
  }
  return res;
}

export async function getFinishedLiquidations(baseLiquidations = []) {
  const res = [];
  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const AHContract = new Contract(contractAddress.AuctionHall, AuctionHallABI);
  const VBContract = new Contract(contractAddress.VaultButler, VaultButlerABI);
  const callList = [];
  baseLiquidations.forEach(item => {
    const SPContract = new Contract(item.strToken, StrPoolABI);
    const ERC20Contract = new Contract(item.poolInfo.stakedToken, ERC20ABI);
    callList.push(SPContract.positionInfoMap(item.hash));
    callList.push(AHContract.phase1Infos(item.hash));
    callList.push(AHContract.phase2Infos(item.hash));
    callList.push(VBContract.legacyInfos(item.hash));
    callList.push(ERC20Contract.symbol());
  });
  const detailLiqs = await ethcallProvider.all(callList);
  for (let i = 0; i < detailLiqs.length / 5; i++) {
    const baseItem = baseLiquidations[i];
    const { stableTokenDecimals, stakedTokenDecimals } = baseItem.poolInfo || {};
    const zIndex = i * 5;
    const positionInfoMap = detailLiqs[zIndex];
    const phase1Infos = detailLiqs[zIndex + 1];
    const phase2Infos = detailLiqs[zIndex + 2];
    const legacyInfos = detailLiqs[zIndex + 3];
    const symbol = detailLiqs[zIndex + 4];
    const _positionInfoMap = {
      closedFlag: positionInfoMap.closedFlag,
      trader: positionInfoMap.trader,
      lastestFeeBlock: Transfer.transBigNumber(positionInfoMap.lastestFeeBlock || 0) * 1,
      remnantAsset: Transfer.receiveAmount(positionInfoMap.remnantAsset || 0, stableTokenDecimals) * 1,
      totalFee: Transfer.receiveAmount(positionInfoMap.totalFee || 0, stableTokenDecimals) * 1,
      totalMarginAmount: Transfer.receiveAmount(positionInfoMap.totalMarginAmount || 0, stableTokenDecimals) * 1,
      unsettledCash: Transfer.receiveAmount(positionInfoMap.unsettledCash || 0, stableTokenDecimals) * 1,
      totalSize: Transfer.receiveAmount(positionInfoMap.totalSize.add(legacyInfos.bidSize) || 0, stakedTokenDecimals),
      totalSize_big: positionInfoMap.totalSize,
    };

    const _phase1Infos = {
      bidSize: Transfer.receiveAmount(phase1Infos.bidSize || 0, stakedTokenDecimals) * 1,
      liquidationPrice: Transfer.receiveAmount(phase1Infos.liquidationPrice || 0, 18) * 1,
      flag: phase1Infos.flag,
      isSorted: phase1Infos.isSorted,
    };

    const _phase2Infos = {
      flag: phase2Infos.flag,
      isWithdraw: phase2Infos.isWithdraw,
      rulerAddr: phase2Infos.rulerAddr,
      debtSize: Transfer.receiveAmount(phase2Infos.debtSize || 0, stakedTokenDecimals) * 1,
      usedCash: Transfer.receiveAmount(phase2Infos.usedCash || 0, stableTokenDecimals) * 1,
      dexCoverReward: Transfer.receiveAmount(phase2Infos.dexCoverReward || 0, stableTokenDecimals) * 1,
    };

    const _legacyInfos = {
      bidSize: Transfer.receiveAmount(legacyInfos.bidSize || 0, stakedTokenDecimals) * 1,
      usedCash: Transfer.receiveAmount(legacyInfos.usedCash || 0, stableTokenDecimals) * 1,
      bidSize_big: legacyInfos.bidSize,
    };

    res.push({
      ...baseLiquidations[i],
      positionInfoMap: _positionInfoMap,
      phase1Infos: _phase1Infos,
      phase2Infos: _phase2Infos,
      legacyInfos: _legacyInfos,
      symbol,
    });
  }
  return res;
}
