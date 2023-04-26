import { utils } from "ethers";
import NP from "number-precision";
import { Contract } from "ethers-multicall";

import { getContractAddress, outContract } from "@/contract";
import * as PoolGuardianAction from "@/contract/poolGuardian";
import * as PoolRewardModel from "@/contract/PoolRewardModel";
import * as Erc20Action from "@/contract/erc20";
import * as TradingHub from "@/contract/tradingHub";
import { getTokenDetail } from "@/contract/shortBone";
import * as strPoolAction from "@/contract/strPool";
import { controvertibleAmounts } from "@/contract/wrapRouter";
import strPoolABI from "@/abis/StrPool.json";
import TradingHubABI from "@/abis/TradingHub.json";
import tradingHubABI from "@/abis/TradingHub";

import { getMulticallProvider } from "@/wallet/provider";
import * as Transfer from "@/utils/transfer";
import { blockToTime, blockToEndTime, encodeFilterTopics, toPercent } from "@/utils/format";

import { useWallet } from "./useWallet";
import { usePosition } from "./usePosition";
import { useBalance } from "./useBalance";
import { getParticipateNumber } from "@/api/activities";

const { batchPositions } = usePosition();
const { account } = useWallet();
const { balance } = useBalance();

const INIT_DETAIL = {
  poolInfo: {},
  history: {},
  userInfoByPool: null,
  token: null,
  withdrawable: 0,
  totalAllocPoint: 1,
  firstLoad: true,
  canWithdraw: true,
  createTime: "",
  endTime: "",
  allPositions: [],
  myPositions: [],
  loading: {
    fetchDetail: true,
    fetchAllPositions: true,
  },
  APY: 0,
};

// 币 评级对照
const ratingMap = {
  1: "AAA",
  2: "AA",
  3: "A",
  4: "BBB",
  5: "BB",
  6: "B",
  7: "CCC",
  8: "CC",
  9: "C",
};

var poolDetail = {
  poolInfo: {},
  history: {},
  userInfoByPool: null,
  token: {
    symbol: "",
  },
  withdrawable: 0,
  totalAllocPoint: 1,
  firstLoad: true,
  canWithdraw: true,
  createTime: "",
  endTime: "",
  allPositions: [],
  myPositions: [],
  APY: 0,
  loading: {
    fetchDetail: true,
    fetchAllPositions: true,
  },
  count: {
    providerCount: 0,
    traderCount: 0,
  },
};

export function usePoolDetail() {
  /**
   *
   * get pool information by id
   * @param {*} id pool id
   * @returns
   */
  async function getPoolInfoById(id) {
    let poolInfo = {};
    if (!id) return null;
    const poolBaseInfo = await fetchPoolInfo(id);
    Object.assign(poolInfo, poolBaseInfo);

    return poolInfo;
  }

  async function getTokenInfo(address) {
    try {
      const tokenInfo = await getTokenDetail(address);
      tokenInfo.ratingText = ratingMap[tokenInfo.rating];
      return tokenInfo;
    } catch (error) {
      console.error(error, "fetchTokenDetail");
      return null;
    }
  }

  /**
   * 获取池子相关日志
   *
   * startBlock 开始块
   * endBlock 结束块 currentBlock endBlock
   * address 合约地址
   */
  async function getPoolLogs(startBlock, endBlock, address, topic) {
    const filter = {
      fromBlock: startBlock * 1,
      toBlock: endBlock * 1,
      address: address,
      topics: topic,
    };

    const result = await PoolGuardianAction.getPoolLogs(filter);

    return result;
  }

  async function getAPYLog(startBlock, endBlock, address, topic) {
    const filter = {
      fromBlock: startBlock * 1,
      toBlock: endBlock * 1,
      address: address,
      topics: topic,
    };

    const result = await PoolGuardianAction.getAPYLog(filter);

    return result;
  }

  async function getParticipateCount(id) {
    const res = await getParticipateNumber(id);
    const { providers, traders } = res?.data;
    return { providers, traders };
  }

  // 获取provider人数
  /**
   * 0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15
   * @param {*} startBlock poolInfo startblock
   * @param {*} endBlock
   * @param {*} address strToken
   * @returns
   */
  async function getProviderCount(startBlock, endBlock, address, id) {
    const res = await getParticipateNumber(id);
    const counter = res?.data.providers || 0;
    return counter;

    console.log("res getProviderCount");
    const currentBlock = window.blockNumber;
    let toBlock = currentBlock * 1 < endBlock * 1 ? currentBlock : endBlock;
    let filterTopics = await encodeFilterTopics(strPoolABI, "Deposit");
    const result = await getPoolLogs(startBlock, toBlock, address, filterTopics);
    poolDetail.count.providerCount = result?.length ? result.length : 0;
  }

  // 获取trader人数
  // 0xe01e9ad0238c189207821b84bca068519343d9e9cd923f04184eba2575c110a3
  async function getTraderCount(startBlock, endBlock, poolId) {
    const currentBlock = window.blockNumber;
    let filterTopics = await encodeFilterTopics(TradingHubABI, "PositionOpened");
    let topic = [];
    topic = filterTopics;
    let coderAbi = new utils.AbiCoder();
    topic.push(coderAbi.encode(["uint256"], [poolId]));
    let toBlock = currentBlock * 1 < endBlock * 1 ? currentBlock : endBlock;
    const result = await getPoolLogs(startBlock, toBlock, getContractAddress().TradingHub, topic);
    poolDetail.count.traderCount = result?.length ? result.length : 0;
    return poolDetail.count.traderCount;
  }

  /**
   *
   * @params holdAmount 池子总存币数
   */
  async function getPoolAPY(holdAmount, price, stableTokenDecimals, rate) {
    if (holdAmount * 1 === 0) return "Initializing";

    const currentBlock = window.blockNumber;
    let startBlock = currentBlock * 1 - 5000;
    const result = await getAPYLog(startBlock * 1, currentBlock * 1, getContractAddress().ShorterBone, [
      "0x5c02725c249d728b048491ecd1de78993bf89f4a6eed2e818496480626cd3ac5",
    ]);

    let sum = 0;
    result.map(item => {
      if (item.tradingFee) sum = sum + Transfer.receiveAmount(item.tradingFee, stableTokenDecimals) * 1;
      if (item.fundingFee) sum = sum + Transfer.receiveAmount(item.fundingFee, stableTokenDecimals) * 1;
    });

    let ipistrPerBlock = 0;
    if (window.ipistr) {
      ipistrPerBlock = window.ipistr;
    } else {
      const ipistr = await PoolRewardModel.getPoolIpistrPerBlock();
      ipistrPerBlock = Transfer.receiveAmount(ipistr);
      window.ipistr = ipistrPerBlock;
    }

    // 15s一块 balance.price: ipistr price
    const blockInOneMinute = getContractAddress().blockSpeed === 3 ? 20 : 4;
    let totalIpistr = NP.times(ipistrPerBlock * blockInOneMinute * 60 * 24, rate);
    let totalIpistrPrice = totalIpistr * balance.price;
    let totalReward = (totalIpistrPrice + sum * 0.4) * 365;

    const APY = NP.divide(totalReward, NP.times(price, holdAmount));
    const resultApy = toPercent(APY * 100);

    if (Number.isNaN(resultApy)) return "Initializing";
    return "+" + resultApy + "%";
  }

  async function THContract() {
    const contractAddress = getContractAddress();
    const tradingHubContract = await outContract(tradingHubABI, contractAddress.TradingHub);
    return tradingHubContract;
  }

  /**
   * @description 获取我的position列表,拿到id列表,再请求详情
   * @param strToken 池子地址
   * @returns address[]
   */
  async function getMyPosition() {
    const tradingHubContract = await THContract();
    const myPositionsList = await tradingHubContract.getPositions(account.value);
    let myPositions = await batchPositions(myPositionsList, null);
    poolDetail.myPositions = myPositions;

    return myPositions;
  }

  /**

   * @description get info by address
   * @param {position address} address
   * @returns
   */
  async function getPositionInfoByAddress(address) {
    const tradingHubContract = await THContract();
    const positionProfile = await tradingHubContract.positionInfoMap(address);
    const strPoolContract = await outContract(strPoolABI, positionProfile.strToken);
    const positionInfo = await strPoolContract.positionInfoMap(address);
    const mixedPositionInfo = Object.assign({ state: positionProfile.positionState }, positionInfo);
    return mixedPositionInfo;
  }

  async function getMyAllBorrowed(id) {
    let my = await getPositionsByPool(id);
    let borrowedAmount = 0;
    if (!my.myPositions.length) {
      return 0;
    }
    my.myPositions.map(item => {
      if (item.state === 1) borrowedAmount = item.totalSize * 1 + borrowedAmount;
    });
    return borrowedAmount;
    // return id
  }

  async function getPositionsByPool(id, poolInfo = null, from = "") {
    try {
      // update 获取所有position
      const contractAddress = getContractAddress();
      const tradingHubContract = await outContract(tradingHubABI, contractAddress.TradingHub);
      const poolPositionSize = await tradingHubContract.poolPositionSize(id);
      // bigNumber to 10 得到池子中 position的总数
      const positionTotal = Transfer.transBigNumber(poolPositionSize);
      if (positionTotal === 0)
        return {
          myPositions: [],
          allPositions: [],
        };
      let hashes = [];
      let ethcallProvider = await getMulticallProvider();
      const THMultiContract = new Contract(contractAddress.TradingHub, tradingHubABI);
      let hashedCall = [];

      for (let i = 0; i < positionTotal; i++) {
        hashedCall.push(THMultiContract.poolPositions(id, i));
      }
      hashes = await ethcallProvider.all(hashedCall);

      if (hashes.length === 0)
        return {
          myPositions: [],
          allPositions: [],
        };
      let allPositions = await batchPositions(hashes, poolInfo, from);

      let tmp = allPositions.sort(compare);
      poolDetail.allPositions = tmp;

      poolDetail.myPositions = [];
      allPositions.map(item => {
        if (item.trader === account.value) poolDetail.myPositions.push(item);
      });
      return {
        allPositions: allPositions,
        myPositions: poolDetail.myPositions,
      };
    } catch (error) {}
  }

  function compare(a, b) {
    if (a.status > b.status) {
      return 1;
    } else if (a.status < b.status) {
      return -1;
    } else return 0;
  }

  async function fetchAllowWithdraw(id) {
    try {
      poolDetail.canWithdraw = await TradingHub.isPoolCanWithdraw(id);
      if (poolDetail.canWithdraw && poolDetail.poolInfo.isLegacyLeftover) {
        let total = await strPoolAction.totalSupply(poolDetail.poolInfo.sTokenAddress);
        total = Transfer.receiveAmount(total, poolDetail.poolInfo.decimals);
        let percent = NP.divide(poolDetail.userInfoByPool.amount, total);

        let stakedAmount = await controvertibleAmounts(poolDetail.poolInfo.sTokenAddress);
        //controvertibleAmounts
        let stableAmount = await Erc20Action.balanceOf(
          poolDetail.poolInfo.stableToken,
          poolDetail.poolInfo.sTokenAddress,
        );

        stableAmount = Transfer.receiveAmount(stableAmount, poolDetail.poolInfo.stableTokenDecimals);
        stakedAmount = Transfer.receiveAmount(stakedAmount, poolDetail.poolInfo.decimals);
        let stakedPrice = NP.times(stakedAmount, poolDetail.poolInfo.stakedTokenPrice);
        let totalPrice = NP.plus(stableAmount, stakedPrice);
        poolDetail.isLegacyLeftoverPrice = NP.times(percent, totalPrice);
        poolDetail.withdrawTotal = NP.times(percent, totalPrice);
        poolDetail.withdrawStaked = NP.times(stakedAmount, percent);
        poolDetail.withdrawStakedPrice = poolDetail.poolInfo.stakedTokenPrice;
        poolDetail.withdrawStableAmount = NP.times(percent, stableAmount);
      }
    } catch (error) {}
  }

  /**
   * @description: init Pool detail
   * @param {*}
   * @return {*}
   */
  function initDetail() {
    poolDetail = Object.assign(poolDetail, INIT_DETAIL);
  }

  /**
   * @description:  get Pool info
   * stateFlag: 池状态(0-offline,1-online,2-liq,3-liq,4-finished)
   * @param {*} id
   * @return {*}
   */
  async function fetchPoolInfo(id) {
    try {
      const poolInfo = await PoolGuardianAction.queryPoolInfo(id);

      if (!poolInfo) return;
      poolDetail.poolInfo = poolInfo;
      poolDetail.createTime = await blockToTime(poolDetail.poolInfo.startBlock * 1, "MMM DD, YYYY HH:mm");

      // 池子中的代币详情
      const res = await getTokenInfo(poolDetail.poolInfo.tokenAddress);
      if (poolDetail.token && poolDetail.token.logo_url) {
        res.logo_url = poolDetail.token.logo_url;
      }
      poolDetail.token = res;
      let contractAddress = getContractAddress();

      // stateFlag
      // 0 :GENESIS,
      // 1: RUNNING,
      // 2: LIQUIDATING,
      // 3: RECOVER,
      // 4: ENDED
      if (poolDetail.poolInfo.stateFlag * 1 === 4) {
        // DayLine add 1 hour
        // poolDetail.endTime = await blockToTime(
        //   poolDetail.poolInfo.endBlock * 1 + 3600 / contractAddress.blockSpeed,
        //   "MMM DD, YYYY HH:mm",
        // );
        poolDetail.endTime = await blockToEndTime(
          poolDetail.poolInfo.startBlock,
          poolDetail.poolInfo.endBlock * 1 + 3600 / contractAddress.blockSpeed,
        );
      } else {
        poolDetail.endTime = await blockToEndTime(
          poolDetail.poolInfo.startBlock,
          poolDetail.poolInfo.endBlock * 1 + 3600 / contractAddress.blockSpeed,
        );
      }
      if (!_.endsWith(window.location.pathname, "positions")) {
        // update params shaun 0401
        await userInfoByPool(id, poolDetail.poolInfo.sTokenAddress);
        poolDetail.APY = await getPoolAPY(
          poolDetail.poolInfo.stakedAmount,
          poolDetail.poolInfo.stakedTokenPrice,
          poolDetail.poolInfo.stableTokenDecimals,
          poolDetail.poolInfo.rewardRate,
        );
        await fetchAllowWithdraw(id);
      } else {
        poolDetail.APY = "Initializing";
      }

      return poolDetail;
    } catch (error) {}
  }

  async function getAllPoolsId() {
    return await PoolGuardianAction.getAllPools();
  }

  async function fullPoolInfo(pool) {
    try {
      const poolInfo = pool;

      if (!poolInfo) return;
      poolDetail.poolInfo = poolInfo;
      poolDetail.createTime = await blockToTime(poolDetail.poolInfo.startBlock * 1, "MMM DD, YYYY HH:mm");

      // 池子中的代币详情
      const res = await getTokenInfo(poolDetail.poolInfo.tokenAddress);
      if (poolDetail.token && poolDetail.token.logo_url) {
        res.logo_url = poolDetail.token.logo_url;
      }
      poolDetail.token = res;
      let contractAddress = getContractAddress();

      // stateFlag
      // 0 :GENESIS,
      // 1: RUNNING,
      // 2: LIQUIDATING,
      // 3: RECOVER,
      // 4: ENDED
      if (poolDetail.poolInfo.stateFlag * 1 === 4) {
        // DayLine add 1 hour
        poolDetail.endTime = await blockToTime(
          poolDetail.poolInfo.endBlock * 1 + 3600 / contractAddress.blockSpeed,
          "MMM DD, YYYY HH:mm",
        );
      } else {
        poolDetail.endTime = await blockToEndTime(
          poolDetail.poolInfo.startBlock,
          poolDetail.poolInfo.endBlock * 1 + 3600 / contractAddress.blockSpeed,
        );
      }

      return poolDetail;
    } catch (error) {}
  }

  /**
   * @description: get TokenSymbol from ERC20 contract
   * @param {*} address
   * @return {*}
   */
  async function getTokenName(address) {
    try {
      let result = await Erc20Action.symbol(address);
      return result.symbol;
    } catch (error) {}
  }

  /**
   * @description: get myPoolAmount from contract
   * @param {*} poolId
   * @param {*} tokenAddress
   * @return {*}
   */
  async function userInfoByPool(poolId, tokenAddress) {
    if (!tokenAddress) {
      return;
    }
    if (!account.value) return;
    try {
      poolDetail.userInfoByPool = await PoolGuardianAction.userInfoByPool(poolId, account.value, tokenAddress);
    } catch (error) {}
  }

  return {
    initDetail,
    fetchPoolInfo,
    getTokenInfo,
    getPositionInfoByAddress,
    fetchAllowWithdraw,
    getPositionsByPool,
    getMyAllBorrowed,
    getTokenName,
    getMyPosition,
    getTraderCount,
    getProviderCount,
    getParticipateCount,
    getPoolAPY,
    getPoolInfoById,
    fullPoolInfo,
    getAllPoolsId,
    poolDetail,
  };
}
