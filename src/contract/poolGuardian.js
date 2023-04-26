import { ethers } from "ethers";
import { Contract } from "ethers-multicall";
import NP from "number-precision";

import poolABI from "../abis/PoolGuardian.json";
import rewardABI from "../abis/PoolRewardModel.json";
import strPoolABI from "../abis/StrPool.json";
import shorterBoneABI from "../abis/ShorterBone.json";
import POABI from "../abis/PriceOracle.json";
import WRABI from "../abis/WrapRouter.json";
import ERC20ABI from "../abis/ERC20.json";

import { outContract, getContractAddress, commonGetLogs } from "@/contract";
import { getPendingIpistrs } from "@/contract/PoolRewardModel";
import { decimals, balanceOf } from "./erc20";
import { getProposalsCounter } from "./committee";

import { getMulticallProvider, getRPCProvider } from "@/wallet/provider";
import { Transaction } from "@/hooks/useTransaction";
import { useWallet } from "@/hooks/useWallet";

import * as Transfer from "@/utils/transfer";
import { Local } from "@/utils/localStorage";
import { getGasParams } from "@/utils/gas";

const { account } = useWallet();

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.PoolGuardian) {
    return;
  }
  const contract = await outContract(poolABI, contractAddress.PoolGuardian, flag);
  return contract;
}

export async function queryPools(stakedToken, status) {
  const contract = await getContract();
  const res = await contract.queryPools(stakedToken, status);
  return res;
}

/**
 * @description: getOnlinePool ids
 * @param {*}
 * @return {*}
 */
export async function getOnlinePools() {
  const contract = await getContract();

  // 1: open
  // const coin_address = utils.getAddress('0x0000000000000000000000000000000000000000')
  let ids = await contract.queryPools("0x0000000000000000000000000000000000000000", 1);

  ids = ids.map(item => Transfer.transBigNumber(item));
  return ids;
}
export async function getAllPools() {
  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const poolContract = new Contract(contractAddress.PoolGuardian, poolABI);

  const callList = [
    poolContract.queryPools("0x0000000000000000000000000000000000000000", 1),
    poolContract.queryPools("0x0000000000000000000000000000000000000000", 2),
    poolContract.queryPools("0x0000000000000000000000000000000000000000", 3),
    poolContract.queryPools("0x0000000000000000000000000000000000000000", 4),
  ];
  const result = await ethcallProvider.all(callList);

  let temp = [];
  result.forEach(item => {
    temp.push(...item);
  });
  let ids = temp.map(item => Transfer.transBigNumber(item));
  return ids;
}

/**
 * @description: 获取所有的池子信息
 * @param {*}
 * @return {*}
 */
export async function fetchOpenPools(ids, type = 1) {
  let shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;

  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  // if(type) : 0 borrow
  try {
    const poolContract = new Contract(contractAddress.PoolGuardian, poolABI);
    const poolRewardContract = new Contract(contractAddress.PoolRewardModel, rewardABI);

    const listCalls = [];
    ids.forEach(poolId => {
      listCalls.push(poolContract.getPoolInfo(poolId));
    });

    const poolBaseInfoList = await ethcallProvider.all(listCalls);
    const POContract = new Contract(contractAddress.PriceOracle, POABI);
    const WRContract = new Contract(contractAddress.WrapRouter, WRABI);
    const listStrCalls = [];
    let poolList = [];
    if (type && account.value) {
      poolBaseInfoList.forEach((item, index) => {
        let strPoolContract = new Contract(item.strToken, strPoolABI);
        let ERC20Contract = new Contract(item.stakedToken, ERC20ABI);
        let ERC20ContractStr = new Contract(item.strToken, ERC20ABI);
        // 获取strToken信息
        listStrCalls.push(strPoolContract.getMetaInfo());
        // 获取当前存币的价格
        listStrCalls.push(POContract.getLatestMixinPrice(item.stakedToken));
        listStrCalls.push(ERC20ContractStr.totalSupply());
        listStrCalls.push(WRContract.controvertibleAmounts(item.strToken));
        listStrCalls.push(ERC20Contract.symbol());
        listStrCalls.push(ERC20ContractStr.balanceOf(account.value));

        listStrCalls.push(poolRewardContract.totalAllocWeight());
        listStrCalls.push(poolRewardContract.poolInfoMap(ids[index]));
        listStrCalls.push(poolRewardContract.pendingPoolReward(account.value, ids[index]));
      });
      const poolStrInfo = await ethcallProvider.all(listStrCalls);
      for (let index = 0; index < poolStrInfo.length / 9; index++) {
        const zIndex = index * 9;
        let info = poolStrInfo[zIndex];
        let stakedTokenPrice = poolStrInfo[zIndex + 1];
        let totalSupply = poolStrInfo[zIndex + 2];
        let strBalance = poolStrInfo[zIndex + 3];
        let stakedTokenName = poolStrInfo[zIndex + 4];
        let myDeposit = poolStrInfo[zIndex + 5];
        let totalRewardWeight = poolStrInfo[zIndex + 6];
        let poolReward = poolStrInfo[zIndex + 7];
        let ipistrReward = poolStrInfo[zIndex + 8];

        let poolWeight = Transfer.transBigNumber(poolReward.allocPoint.mul(poolReward.multiplier));
        let totalWeight = Transfer.transBigNumber(totalRewardWeight);
        let rewardRate = NP.divide(poolWeight, totalWeight) || 0;

        let stakedDecimals = Transfer.transBigNumber(info.stakedTokenDecimals_);
        let stableLogo = "";

        let stableTokenSymbol = "";
        let stableTokenDecimal = "";
        tokenList.forEach(item => {
          if (item.address === info.stableToken_) {
            stableLogo = item.logoURI;
            stableTokenSymbol = item.symbol;
            stableTokenDecimal = item.decimals;
          }
        });
        if (info.stakedToken_ === contractAddress.chainTokenAddress) {
          stakedTokenName = contractAddress.chainTokenSymbol;
        }
        poolList.push({
          id: Transfer.transBigNumber(info.id_),
          tokenName: stakedTokenName,
          decimals: stakedDecimals,
          sTokenAddress: poolBaseInfoList[index].strToken,
          tokenAddress: info.stakedToken_,
          stakedTokenPrice: Transfer.receiveAmount(stakedTokenPrice, 18),
          stableToken: info.stableToken_,
          myDeposit: Transfer.receiveAmount(myDeposit, stakedDecimals),
          rewardRate: rewardRate,
          allocPoint: Transfer.transBigNumber(poolReward.allocPoint),
          multiplier: Transfer.transBigNumber(poolReward.multiplier),
          stableLogo: stableLogo,
          stableTokenDecimals: stableTokenDecimal,
          creator: info.creator_,
          currentAmount: Transfer.receiveAmount(strBalance, stakedDecimals),
          borrowedAmount: NP.minus(
            Transfer.receiveAmount(totalSupply, stakedDecimals),
            Transfer.receiveAmount(strBalance, stakedDecimals),
          ),
          stakedAmount: Transfer.receiveAmount(totalSupply, stakedDecimals),
          durationDays: Transfer.transBigNumber(info.durationDays_),
          startBlock: Transfer.transBigNumber(info.startBlock_),
          endBlock: Transfer.transBigNumber(info.endBlock_),
          maxLeverage: Transfer.transBigNumber(info.leverage_),
          stateFlag: Transfer.transBigNumber(info.stateFlag_),
          earned: Transfer.receiveAmount(ipistrReward, 18),
        });
      }
    } else {
      poolBaseInfoList.forEach((item, index) => {
        let strPoolContract = new Contract(item.strToken, strPoolABI);
        let ERC20Contract = new Contract(item.stakedToken, ERC20ABI);
        let ERC20ContractStr = new Contract(item.strToken, ERC20ABI);
        listStrCalls.push(strPoolContract.getMetaInfo());
        listStrCalls.push(POContract.getLatestMixinPrice(item.stakedToken));

        listStrCalls.push(ERC20ContractStr.totalSupply());
        listStrCalls.push(WRContract.controvertibleAmounts(item.strToken));

        listStrCalls.push(ERC20Contract.symbol());

        listStrCalls.push(poolRewardContract.totalAllocWeight());
        listStrCalls.push(poolRewardContract.poolInfoMap(ids[index]));
      });
      const poolStrInfo = await ethcallProvider.all(listStrCalls);

      for (let index = 0; index < poolStrInfo.length / 7; index++) {
        const zIndex = index * 7;
        let info = poolStrInfo[zIndex];
        let stakedTokenPrice = poolStrInfo[zIndex + 1];
        let totalSupply = poolStrInfo[zIndex + 2];
        let strBalance = poolStrInfo[zIndex + 3];
        let stakedTokenName = poolStrInfo[zIndex + 4];

        let totalRewardWeight = poolStrInfo[zIndex + 5];
        let poolReward = poolStrInfo[zIndex + 6];

        let stakedDecimals = Transfer.transBigNumber(info.stakedTokenDecimals_);

        let poolWeight = Transfer.transBigNumber(poolReward.allocPoint.mul(poolReward.multiplier));
        let totalWeight = Transfer.transBigNumber(totalRewardWeight);
        let rewardRate = NP.divide(poolWeight, totalWeight) || 0;

        let stableLogo = "";
        tokenList.forEach(item => {
          if (item.address === info.stableToken_) {
            stableLogo = item.logoURI;
          }
        });
        if (info.stakedToken_ === contractAddress.chainTokenAddress) {
          stakedTokenName = contractAddress.chainTokenSymbol;
        }
        poolList.push({
          id: Transfer.transBigNumber(info.id_),
          tokenName: stakedTokenName,
          decimals: stakedDecimals,
          sTokenAddress: poolBaseInfoList[index].strToken,
          tokenAddress: info.stakedToken_,
          stakedTokenPrice: Transfer.receiveAmount(stakedTokenPrice, 18),
          stableToken: info.stableToken_,
          myDeposit: 0,
          stableLogo: stableLogo,
          stableTokenDecimals: Transfer.transBigNumber(info.stableTokenDecimals_),
          creator: info.creator_,
          currentAmount: Transfer.receiveAmount(strBalance, stakedDecimals),
          borrowedAmount: NP.minus(
            Transfer.receiveAmount(totalSupply, stakedDecimals),
            Transfer.receiveAmount(strBalance, stakedDecimals),
          ),
          stakedAmount: Transfer.receiveAmount(totalSupply, stakedDecimals),
          durationDays: Transfer.transBigNumber(info.durationDays_),
          startBlock: Transfer.transBigNumber(info.startBlock_),
          rewardRate: rewardRate,
          endBlock: Transfer.transBigNumber(info.endBlock_),
          maxLeverage: Transfer.transBigNumber(info.leverage_),
          stateFlag: Transfer.transBigNumber(info.stateFlag_),
        });
      }
    }
    return poolList;
  } catch (e) {
    // sessionStorage.setItem("infura", "error");
  }
}

/**
 * @description: 获取当前池子的详细信息
 * @param {*} poolId
 * @return {*}
 */
export async function queryPoolInfo(poolId) {
  let shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;

  try {
    // 各合约地址配置
    const contract = await getContract();
    let poolInfo = await contract.getPoolInfo(poolId);
    const strToken = poolInfo.strToken;
    const stakedToken = poolInfo.stakedToken;

    let contractAddress = getContractAddress();
    let ethcallProvider = await getMulticallProvider();

    const POContract = new Contract(contractAddress.PriceOracle, POABI);
    const strPoolContract = new Contract(strToken, strPoolABI);
    const WRContract = new Contract(contractAddress.WrapRouter, WRABI);

    const ERC20ContractStr = new Contract(strToken, ERC20ABI);
    let ERC20Contract = new Contract(stakedToken, ERC20ABI);
    const poolRewardContract = new Contract(contractAddress.PoolRewardModel, rewardABI);

    const listCalls = [];

    listCalls.push(strPoolContract.getMetaInfo());
    listCalls.push(strPoolContract.isLegacyLeftover());
    listCalls.push(POContract.getLatestMixinPrice(stakedToken));
    listCalls.push(ERC20ContractStr.totalSupply());
    listCalls.push(WRContract.controvertibleAmounts(strToken));

    listCalls.push(ERC20Contract.symbol());
    listCalls.push(poolRewardContract.totalAllocWeight());
    listCalls.push(poolRewardContract.poolInfoMap(poolId));
    if (account.value) listCalls.push(ERC20ContractStr.balanceOf(account.value));

    let multiResult = await ethcallProvider.all(listCalls);

    let poolDetail = multiResult[0];
    let isLegacyLeftover = multiResult[1];
    const stakedTokenPrice = multiResult[2];
    let currentTokenPrice = Transfer.receiveAmount(stakedTokenPrice, 18);
    let totalStakedAmount = multiResult[3];
    const currentAmount = multiResult[4];
    let stakedTokenSymbol = multiResult[5];
    let totalRewardWeight = multiResult[6];
    let poolReward = multiResult[7];
    let myDeposit = multiResult[8];

    let poolWeight = Transfer.transBigNumber(poolReward.allocPoint.mul(poolReward.multiplier));
    let totalWeight = Transfer.transBigNumber(totalRewardWeight);
    let rewardRate = NP.divide(poolWeight, totalWeight) || 0;

    let stableLogo = "";
    let stableTokenSymbol = "";
    let stableTokenDecimal = "";
    tokenList.forEach(item => {
      if (item.address === poolDetail.stableToken_) {
        stableLogo = item.logoURI;
        stableTokenSymbol = item.symbol;
        stableTokenDecimal = item.decimals;
      }
    });
    const currentBlock = window.blockNumber;
    const poolEndBlock = Transfer.transBigNumber(poolDetail.endBlock_) * 1;
    let stateFlagFixed = Transfer.transBigNumber(poolInfo.stateFlag);
    if (stateFlagFixed * 1 === 1) {
      // console.log(currentBlock, poolEndBlock, currentBlock < poolEndBlock, "currentBlock");

      // todo test
      if (currentBlock && currentBlock > poolEndBlock) {
        stateFlagFixed = 2;
      }
    }

    if (poolDetail.stakedToken_ === contractAddress.chainTokenAddress) {
      stakedTokenSymbol = contractAddress.chainTokenSymbol;
    }

    return {
      id: poolId,
      tokenName: stakedTokenSymbol,
      decimals: Transfer.transBigNumber(poolDetail.stakedTokenDecimals_),
      sTokenAddress: strToken,
      tokenAddress: poolDetail.stakedToken_,
      stakedTokenPrice: currentTokenPrice,
      isLegacyLeftover: isLegacyLeftover,
      // 稳定币token
      stableToken: poolDetail.stableToken_,
      stableTokenName: stableTokenSymbol,
      stableLogo: stableLogo,
      stableTokenDecimals: stableTokenDecimal,
      creator: poolDetail.creator_,
      totalReward: Transfer.transBigNumber(totalRewardWeight),
      allocPoint: Transfer.transBigNumber(poolReward.allocPoint),
      multiplier: Transfer.transBigNumber(poolReward.multiplier),
      rewardRate: rewardRate,
      myDeposit: myDeposit || 0,
      currentAmount: Transfer.receiveAmount(currentAmount, poolDetail.stakedTokenDecimals_),
      borrowedAmount: NP.minus(
        Transfer.receiveAmount(totalStakedAmount, poolDetail.stakedTokenDecimals_) * 1,
        Transfer.receiveAmount(currentAmount, poolDetail.stakedTokenDecimals_) * 1,
      ),
      borrowedAmount_big: totalStakedAmount.sub(currentAmount),
      stakedAmount_big: totalStakedAmount,
      currentAmount_big: currentAmount,
      // totalStakedAmount - currentAmount
      stakedAmount: Transfer.receiveAmount(totalStakedAmount, poolDetail.stakedTokenDecimals_),
      durationDays: Transfer.transBigNumber(poolDetail.durationDays_),
      startBlock: Transfer.transBigNumber(poolDetail.startBlock_),
      endBlock: Transfer.transBigNumber(poolDetail.endBlock_),
      maxLeverage: Transfer.transBigNumber(poolDetail.leverage_),
      stateFlagOrigin: Transfer.transBigNumber(poolDetail.endBlock_),
      stateFlag: stateFlagFixed,
    };
  } catch (error) {
    console.log(error, "queryPoolInfo");
  }
}

/**
 * @description: 当前池子
 * @param {*}
 * @return {*}
 */
export async function nPoolId() {
  const contract = await getContract();
  let nPoolId = await contract.nPoolId();
  return Transfer.transBigNumber(nPoolId);
}

/**
 * @description:往池子中存钱
 * @param {*} poolId
 * @param {*} tokenAddress
 * @param {*} value
 * @return {*}
 */
export async function deposit(poolId, decimals, value) {
  const contract = await getContract(true);
  let Amount = Transfer.toAmount(value, decimals * 1);

  const gasParams = await getGasParams(contract, "deposit", poolId, Amount);
  const tx = await contract.deposit(poolId, Amount, gasParams);
  let deposit = await tx.wait();
  Transaction(deposit.transactionHash);
  return deposit;
}

/**
 * @description: 池子创建者相关信息
 * @param {*}
 * @return {*}
 */
export async function getPoolInfoMap(id) {
  const contract = await getContract();
  let poolInfoMap = await contract.poolInfoMap(id);
  return {
    id: id,
    creator: poolInfoMap.creator,
    durationDays: Transfer.transBigNumber(poolInfoMap.durationDays),
    startBlock: Transfer.transBigNumber(poolInfoMap.startBlock),
    endBlock: Transfer.transBigNumber(poolInfoMap.endBlock),
    maxLeverage: Transfer.transBigNumber(poolInfoMap.leverage),
    stateFlag: Transfer.transBigNumber(poolInfoMap.stateFlag),
    tokenAddress: poolInfoMap.stakedToken,
  };
}

/**
 * @description: userInfoByPool
 * @param {*} poolId
 * @param {*} account
 * @param {*} tokenAddress
 * @return {*}
 */
export async function userInfoByPool(poolId, account, tokenAddress) {
  if (!tokenAddress) {
    return;
  }
  try {
    // 获取用户已存代币量 tokenAddress: 池子的strToken； account: 当前用户钱包地址
    let userAmount = await balanceOf(tokenAddress, account);
    // 池子货币精度
    let _decimals = await decimals(tokenAddress);

    let rewards = await getPendingIpistrs(poolId, account);
    return {
      amount: Transfer.receiveAmount(userAmount, _decimals),
      usdAmount: Transfer.receiveAmount(userAmount, _decimals),
      borrowedAmount: Transfer.receiveAmount(userAmount, _decimals),
      pendingIpistrs: rewards,
    };
  } catch (error) {
    console.log(error, "getUserInfo/getPendingIpistrs");
  }
}

/**
 * @description:  正常提取, value = 0 就是收割奖励 , value > 0, 提现
 * @param {*} poolId
 * @param {*} value
 * @return {*}
 */
export async function withdraw(poolId, decimals, value) {
  const contract = await getContract(true);
  let Amount = Transfer.toAmount(value, decimals);

  const gasParams = await getGasParams(contract, "withdraw", poolId, 0, Amount);
  const tx = await contract.withdraw(poolId, 0, Amount, gasParams);
  let withdraw = await tx.wait();
  Transaction(withdraw.transactionHash);
  return withdraw;
}

/**
 * @description: legacy按照百分比提现
 * @param {*} poolId 提现ID
 * @param {*} percent 提现百分比
 * @return {*}
 */
export async function percentWithdraw(poolId, percent) {
  const contract = await getContract(true);
  percent = String(percent);

  const gasParams = await getGasParams("contract", "withdraw", poolId, percent, 0);
  const tx = await contract.withdraw(poolId, percent, 0, gasParams);
  let withdraw = await tx.wait();
  Transaction(withdraw.transactionHash);
  return withdraw;
}

/**
 * @description: 获取池子创世块
 * @param {*}
 * @return {number}
 */
export async function getPoolsStartBlock() {
  const contract = await getContract();
  let result = await contract.guardianStartBlock();
  return Transfer.transBigNumber(result);
}

/**
 * @description: 抓取线上历史事件日志
 * @param  {*} fromBlock 开始区块
 * @param  {*} toBlock 结束区块
 * @param  {*} address 合约地址
 * @return {*}
 */
export async function getLogs(filter) {
  try {
    const provider = getRPCProvider();
    const callPromise = await commonGetLogs(filter);
    let list = callPromise.map(log => transPoolLog(log));
    return list.filter(v => v);
  } catch (error) {
    console.log(error, "JsonRpcProvider-rpcURL");
  }
}

export async function getPoolLogs(filter) {
  try {
    const callPromise = await commonGetLogs(filter);
    return callPromise;
  } catch (error) {
    console.log(error, "JsonRpcProvider-rpcURL");
  }
}
export async function getPositionLogs(filter) {
  try {
    const callPromise = await commonGetLogs(filter);
    return callPromise;
  } catch (error) {
    console.log(error, "JsonRpcProvider-rpcURL");
  }
}
/**
 * @description:获取指定用户创建的池子id列表
 * @param {*} userAddress
 * @return {*}
 */
export async function getUserCreatedPoolIds(userAddress) {
  try {
    const contract = await getContract();
    const poolsIDList = await contract.getCreatedPoolIds(userAddress);
    const idList = poolsIDList.map(item => {
      return { id: item.toString() };
    });
    const res = await getProposalsCounter(idList);
    return res.filter(item => item.status === 4);
  } catch (error) {
    console.log(error);
  }
}

function transPoolLog(log) {
  try {
    let iface = new ethers.utils.Interface(poolABI);
    let item = iface.parseLog(log);
    return {
      hash: log.transactionHash,
      blockNumber: log.blockNumber,
      args: item.args,
      event: item.name,
    };
  } catch (error) {
    return null;
  }
}

// todo
export async function getAPYLog(filter) {
  const result = await getPoolLogs(filter);
  let list = (result || []).map(log => transAPYLog(log));
  return list.filter(log => log);
}

function transAPYLog(item) {
  try {
    let iface = new ethers.utils.Interface(shorterBoneABI);
    let log = iface.parseLog(item);
    let APYFee = {
      tradingFee: "",
      fundingFee: "",
    };
    if (log.args[2] === 0) {
      APYFee.tradingFee = log.args["amount"];
    } else if (log.args[2] === 1) {
      APYFee.fundingFee = log.args["amount"];
    } else {
      return null;
    }
    return APYFee;
  } catch (error) {
    return null;
  }
}
