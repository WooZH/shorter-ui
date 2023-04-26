import NP from "number-precision";
import { BigNumber } from "ethers";
import { Contract } from "ethers-multicall";

import { getContractAddress } from "@/contract";
import * as TradingHub from "@/contract/tradingHub";
import * as PoolGuardianAction from "@/contract/poolGuardian";
import * as AuctionHallAction from "@/contract/auctionHall";
import * as VaultButlerAction from "@/contract/vaultButler";
import strPoolABI from "../abis/StrPool.json";
import ShorterBone from "../abis/ShorterBone.json";
import THABI from "../abis/TradingHub.json";
import poolABI from "../abis/PoolGuardian.json";
import POABI from "../abis/PriceOracle.json";
import WRABI from "../abis/WrapRouter.json";
import ERC20ABI from "../abis/ERC20.json";
import VaultButlerABI from "../abis/VaultButler.json";

import { getMulticallProvider  } from "@/wallet/provider";
import { blockToTime, blockToEndTime, toPercent, encodeFilterTopics } from "@/utils/format";
import { getDuration } from "@/utils/date";
import * as Transfer from "@/utils/transfer";
import { Local } from "@/utils/localStorage";

import { usePoolDetail } from "./usePoolDetail";
import { useWallet } from "@/hooks/useWallet";

const { account } = useWallet();

/**
* 获取头寸状态
    * 参数: 头寸地址
enum PositionState {
  GENESIS,
 1 OPEN, 0, 1, 2
 2 CLOSING, 4
 3 OVERDRAWN, 3
 4 CLOSED 5
}
*/
var positionStatus = [
  {
    text: "Finished",
    value: 6,
  },
  {
    text: "Closed",
    value: 5,
  },
  {
    text: "Closing",
    value: 4,
  },
  {
    text: "Legacy",
    value: 3,
  },
  {
    text: "Safe",
    value: 2,
  },
  {
    text: "Moderate",
    value: 1,
  },
  {
    text: "Risky",
    value: 0,
  },
];

var position = {
  list: [],
  loading: false,
  firstLoad: true,
  myBorrow: 0,
  detail: null,
};

let poolInfoMap = new Map();
let tokenInfoMap = new Map();

const { getTokenInfo } = usePoolDetail();

// update 状态对应值更新
export function usePosition() {
  /**
   * @description: 转化头寸状态
   * @param {*} params
   * @return {*}
   */
  // 1 OPEN, 0, 1, 2
  // 2 CLOSING, 4
  // 3 OVERDRAWN, 3
  // 4 CLOSED 5
  function transPositionStatus(item) {
    if (item.state * 1 === 1) {
      if (item.plPercent * 1 > -0.3) {
        return 2; // safe
      } else if (item.plPercent * 1 > -0.5 && item.plPercent <= -0.3) {
        return 1; // "Moderate 1"
      }
      return 0; // safe 2
    }

    if (item.state * 1 === 2) {
      return 4; //closing
    }
    //  OVERDRAWN_STATE = 4;
    if (item.state * 1 === 4) {
      return 3; //Legacy
    }
    //  CLOSED_STATE = 8;
    if (item.state * 1 === 8) {
      return 5; //closed
    }
    return null;
  }

  function getPositionStatusText(status) {
    const target = positionStatus.find(element => element.value == status);
    if (target) {
      return target.text;
    }
    return "";
  }

  function setDetail(detail, poolDetail = null) {
    position.detail = detail;
    position.pool = poolDetail;
  }

  function getPositionStatusTagColor(status) {
    const colors = ["red", "orange", "green", "brown", "blue", "default"];
    return colors[status];
  }

  /**
   * @description: getProgress
   * @param {*} detail
   * @return {*}
   */

  function getProgress(detail) {
    let progress = 0;
    const unsettledCash = Transfer.receiveAmount(detail.unsettledCash, detail.stableTokenInfo.decimals);
    progress = NP.divide(NP.plus(detail.earnAmount, detail.totalMarginAmount), unsettledCash);
    return toPercent(progress * 100, 2);
  }

  /**
   * @description: 获取我的头寸信息
   * @param {*} account
   * @return {*}
   */
  async function getMyPositions(account) {
    if (position.firstLoad) position.loading = true;

    try {
      let list = await TradingHub.getMyAllPositions(account);
      let callList = [];
      // 拆分点
      let breakPoint = 4;
      if (list.length > 100) {
        breakPoint = 10;
      } else if (list.length > 200) {
        breakPoint = 20;
      }
      if (list.length > breakPoint) {
        for (let i = 0; i <= parseInt(list.length / breakPoint); i++) {
          let tmp = list.concat();

          callList.push(tmp.splice(i * breakPoint, breakPoint));
        }
      } else {
        callList.push(list);
      }
      const allList = [];
      callList.forEach(item => {
        allList.push(handlePositions(item));
      });
      let positionsAll = await Promise.all(allList);
      const resultArr = [];
      positionsAll.forEach(arr => {
        resultArr.push(...arr);
      });
      position.list = _.orderBy(resultArr, ["latestBlock"], ["desc"]);
      return position.list;
    } catch (error) {
      position.loading = false;
      position.firstLoad = false;
    } finally {
      position.loading = false;
      position.firstLoad = false;
    }
  }
  async function getMyOpenPositions(account) {
    if (position.firstLoad) position.loading = true;

    try {
      const contractAddress = getContractAddress();
      const ethcallProvider = await getMulticallProvider();
      const THContract = new Contract(contractAddress.TradingHub, THABI);
      let listCalls = [];
      listCalls.push(THContract.getPositionsByAccount(account, 1));
      listCalls.push(THContract.getPositionsByAccount(account, 2));
      listCalls.push(THContract.getPositionsByAccount(account, 3));
      let MyOpenPositions = await ethcallProvider.all(listCalls);
      let MyAllPositions = MyOpenPositions[0].concat(MyOpenPositions[1]).concat(MyOpenPositions[2]);

      let positionsHashes = await handlePositions(MyAllPositions);
      position.list = positionsHashes || [];
      position.list = _.orderBy(position.list, ["latestBlock"], ["desc"]);
      return position.list;
    } catch (error) {
      position.loading = false;
      position.firstLoad = false;
    } finally {
      position.loading = false;
      position.firstLoad = false;
    }
  }
  /**
   * @description 获取我的所有positions
   * @param {} list
   * @returns {} list
   */
  async function handlePositions(list, poolDetail = null) {
    // let positions = []
    return await batchPositions(list, poolDetail);
  }

  /**
   * @description 获取我的所有positions ver.simple 不获取池子相关信息
   * @param {} list
   * @returns {} list
   */
  async function handlePositionsSimple(list, poolDetail = null) {
    return await batchPositionsSimple(list, poolDetail);
  }

  async function batchPositions(hashes, pool = null, from = null) {
    const contractAddress = getContractAddress();
    const ethcallProvider = await getMulticallProvider();
    try {
      const THContract = new Contract(contractAddress.TradingHub, THABI);
      let listCalls = [];
      hashes.forEach(positionHash => {
        listCalls.push(THContract.positionInfoMap(positionHash));
        listCalls.push(THContract.positionBlocks(positionHash));
      });
      let listCallsForDetail = [];
      let positionsTmp = await ethcallProvider.all(listCalls);

      let positions = [];
      let positionBlocks = [];
      for (let index = 0; index < positionsTmp.length / 2; index++) {
        const zIndex = index * 2;
        positions.push(positionsTmp[zIndex]);
        positionBlocks.push(positionsTmp[zIndex + 1]);
      }

      if (!pool) {
        // 统一获取所有相关池子信息
        let poolInfos = [];
        let poolInfoCalls = [];
        const poolContract = new Contract(contractAddress.PoolGuardian, poolABI);
        positions.forEach(item => {
          let poolId = Transfer.transBigNumber(item.poolId);
          poolInfoCalls.push(poolContract.getPoolInfo(poolId));
        });
        const allPoolCalls = [];
        poolInfos = await ethcallProvider.all(poolInfoCalls);
        poolInfos.forEach(item => {
          const strToken = item.strToken;
          const stakedToken = item.stakedToken;
          // const stableToken = item.stableToken
          const POContract = new Contract(contractAddress.PriceOracle, POABI);
          const strPoolContract = new Contract(strToken, strPoolABI);
          const ERC20ContractStr = new Contract(strToken, ERC20ABI);
          const ERC20Contract = new Contract(stakedToken, ERC20ABI);
          const WRContract = new Contract(contractAddress.WrapRouter, WRABI);

          // const ERC20ContractStable = new Contract(stableToken, ERC20ABI)
          allPoolCalls.push(strPoolContract.getMetaInfo());
          allPoolCalls.push(strPoolContract.isLegacyLeftover());
          allPoolCalls.push(POContract.getLatestMixinPrice(stakedToken));
          allPoolCalls.push(ERC20ContractStr.totalSupply());
          // allPoolCalls.push(ERC20Contract.balanceOf(strToken))
          allPoolCalls.push(WRContract.controvertibleAmounts(strToken));
          allPoolCalls.push(ERC20Contract.symbol());
          // allPoolCalls.push(ERC20ContractStable.symbol())
          // allPoolCalls.push(ERC20ContractStable.decimals())
          allPoolCalls.push(ERC20ContractStr.balanceOf(account.value));
        });
        let allPools = await ethcallProvider.all(allPoolCalls);
        let allPoolsInfo = [];
        for (let index = 0; index < allPools.length / 7; index++) {
          const zIndex = index * 7;
          allPoolsInfo.push(formatPoolInfo(allPools.slice(zIndex, zIndex + 7), poolInfos[index].strToken));
        }
        allPoolsInfo.forEach(item => {
          poolInfoMap.set(item.id, item);
        });
      }
      const VBContract = new Contract(contractAddress.VaultButler, VaultButlerABI);

      positions.forEach((item, index) => {
        let strPoolContract = new Contract(item.strToken, strPoolABI);
        listCallsForDetail.push(strPoolContract.positionInfoMap(hashes[index]));
        listCallsForDetail.push(strPoolContract.getFundingFee(hashes[index]));
        listCallsForDetail.push(VBContract.legacyInfos(hashes[index]));
      });
      let positionInfoList = await ethcallProvider.all(listCallsForDetail);
      let mixedList = positions.map((item, index) => {
        let zIndex = index * 3;
        return {
          ...item,
          ...positionInfoList[zIndex],
          ...positionBlocks,
          fundingFee: positionInfoList[zIndex + 1],
          hash: hashes[index],
          openBlock: Transfer.transBigNumber(positionBlocks[index].openBlock),
          closingBlock: Transfer.transBigNumber(positionBlocks[index].closingBlock),
          overdrawnBlock: Transfer.transBigNumber(positionBlocks[index].overdrawnBlock),
          closedBlock: Transfer.transBigNumber(positionBlocks[index].closedBlock),
          legacyInfo: positionInfoList[zIndex + 2],
        };
      });
      let resultList = [];
      for (let item of mixedList) {
        resultList.push(await handleSinglePositionInfo(item, pool, from));
      }
      return resultList;
    } catch (e) {}
  }

  function formatPoolInfo(multiResult, strToken) {
    let poolDetail = multiResult[0];
    let isLegacyLeftover = multiResult[1];
    const stakedTokenPrice = multiResult[2];
    let currentTokenPrice = Transfer.receiveAmount(stakedTokenPrice, 18);
    let totalStakedAmount = multiResult[3];
    const currentAmount = multiResult[4];

    let stakedTokenSymbol = multiResult[5];

    let myDeposit = multiResult[6];

    let stableLogo = "";
    let stableTokenSymbol = "";
    let stableTokenDecimal = "";
    let shorterStorage = Local.get("shorterStorage");
    const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;

    tokenList.forEach(item => {
      if (item.address === poolDetail.stableToken_) {
        stableLogo = item.logoURI;
        stableTokenSymbol = item.symbol;
        stableTokenDecimal = item.decimals;
      }
    });
    return {
      id: Transfer.transBigNumber(poolDetail.id_),
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
      myDeposit: myDeposit,
      currentAmount: Transfer.receiveAmount(currentAmount, poolDetail.stakedTokenDecimals_),
      borrowedAmount: NP.minus(
        Transfer.receiveAmount(totalStakedAmount, poolDetail.stakedTokenDecimals_),
        Transfer.receiveAmount(currentAmount, poolDetail.stakedTokenDecimals_),
      ),
      // totalStakedAmount - currentAmount
      stakedAmount: Transfer.receiveAmount(totalStakedAmount, poolDetail.stakedTokenDecimals_),
      durationDays: Transfer.transBigNumber(poolDetail.durationDays_),
      startBlock: Transfer.transBigNumber(poolDetail.startBlock_),
      endBlock: Transfer.transBigNumber(poolDetail.endBlock_),
      maxLeverage: Transfer.transBigNumber(poolDetail.leverage_),
      stateFlag: Transfer.transBigNumber(poolDetail.stateFlag_),
    };
  }

  async function batchPositionsSimple(hashes) {
    let contractAddress = getContractAddress();
    const ethcallProvider = await getMulticallProvider();
    try {
      const THContract = new Contract(contractAddress.TradingHub, THABI);
      let listCalls = [];
      hashes.forEach(positionHash => {
        listCalls.push(THContract.positionInfoMap(positionHash));
      });

      let listCallsForDetail = [];
      let positions = await ethcallProvider.all(listCalls);
      positions.forEach((item, index) => {
        let strPoolContract = new Contract(item.strToken, strPoolABI);
        listCallsForDetail.push(strPoolContract.positionInfoMap(hashes[index]));
        listCallsForDetail.push(strPoolContract.getFundingFee(hashes[index]));
      });
      let positionInfoList = await ethcallProvider.all(listCallsForDetail);

      let mixedList = positions.map((item, index) => {
        let zIndex = index * 2;
        return {
          ...item,
          ...positionInfoList[zIndex],
          fundingFee: positionInfoList[zIndex + 1],
          hash: hashes[index],
        };
      });
      return mixedList;
    } catch (e) {}
  }

  // 处理单个position详情
  async function handleSinglePositionInfo(item, poolDetail = null, from = null) {
    let positionAddress = item.hash;
    let receiveItem = item;
    receiveItem.poolId = Transfer.transBigNumber(receiveItem.poolId);
    // receiveItem = Object.assign({}, await TradingHub.getPositionInfoByAddress(item))
    receiveItem.hash = positionAddress; // current position address
    let poolInfo = {};
    if (poolDetail) {
      poolInfo = poolDetail;
    } else if (poolInfoMap.has(receiveItem.poolId)) {
      poolInfo = poolInfoMap.get(receiveItem.poolId);
    } else {
      // 暂存poolInfo,避免同一池子下position重复请求池子信息
      poolInfo = await PoolGuardianAction.queryPoolInfo(receiveItem.poolId);
      poolInfoMap.set(receiveItem.poolId, poolInfo);
    }
    // 存入币信息
    let tokenInfo = {};
    if (tokenInfoMap.has(poolInfo.tokenAddress)) {
      tokenInfo = tokenInfoMap.get(poolInfo.tokenAddress);
    } else {
      tokenInfo = await getTokenInfo(poolInfo.tokenAddress);
      tokenInfoMap.set(poolInfo.tokenAddress, tokenInfo);
    }
    receiveItem.token = tokenInfo;
    // 稳定币信息
    let stableTokenInfo = {};
    if (tokenInfoMap.has(poolInfo.stableToken)) {
      stableTokenInfo = tokenInfoMap.get(poolInfo.stableToken);
    } else {
      stableTokenInfo = await getTokenInfo(poolInfo.stableToken);
      tokenInfoMap.set(poolInfo.stableToken, stableTokenInfo);
    }
    receiveItem.stableTokenInfo = stableTokenInfo;
    const leverage = poolInfo.maxLeverage * 1;
    receiveItem.total = receiveItem.totalSize;
    /**
     * 经历过legacy的position
     * totalSize重新计算
     */
    if (receiveItem.overdrawnBlock) {
      receiveItem.totalSize = receiveItem.totalSize.add(receiveItem.legacyInfo.bidSize);
      receiveItem.unsettledCash = receiveItem.unsettledCash.add(receiveItem.legacyInfo.usedCash);
    }

    receiveItem.totalSize = Transfer.receiveAmount(receiveItem.totalSize, poolInfo.decimals);

    // Avg. Open Price
    let unsettledCash = Transfer.receiveAmount(receiveItem.unsettledCash, stableTokenInfo.decimals);

    receiveItem.totalMarginAmount = NP.divide(unsettledCash, 1 + leverage);

    receiveItem.stakedAmount = poolInfo.stakedAmount;
    receiveItem.userAmount = Transfer.receiveAmount(poolInfo.myDeposit, poolInfo.decimals);
    receiveItem.leverage = leverage;
    receiveItem.poolId = Transfer.transBigNumber(poolInfo.id);
    let liqFee = 0;
    if (receiveItem.positionState === 1) {
      liqFee = receiveItem.fundingFee.add(receiveItem.totalFee);
      liqFee = Transfer.receiveAmount(liqFee, stableTokenInfo.decimals);
    }
    // let availableAmount = unsettledCash - Transfer.receiveAmount(receiveItem.fundingFee, stableTokenInfo.decimals);
    let availableAmount = unsettledCash;
    receiveItem.avgHoldPrice = NP.divide(
      NP.divide(NP.times(availableAmount, leverage), 1 + leverage),
      receiveItem.totalSize,
    );

    // 可以提取的遗产 remnantAsset
    const remnantAsset = Transfer.receiveAmount(receiveItem.remnantAsset, stableTokenInfo.decimals);
    receiveItem.withdrawableAsset = remnantAsset;
    // 平均清算价格
    const avgLiqPrice = NP.divide(NP.minus(NP.minus(unsettledCash, remnantAsset), liqFee), receiveItem.totalSize);
    receiveItem.avgLiqPrice = avgLiqPrice;
    // availableAmount = new BN(availableAmount)
    const stakedDecimals = poolInfo.decimals;
    // overdrawnPrice 穿仓价格
    const overdrawnPrice = NP.divide(NP.minus(availableAmount, liqFee), receiveItem.totalSize);
    // 70 清算价格为穿仓价格的70%
    const liquidPrice = NP.divide(
      NP.times(overdrawnPrice.toString(), poolInfo.maxLeverage * 100 + 70),
      poolInfo.maxLeverage * 100 + 100,
    );
    receiveItem.liquidPrice = liquidPrice.toString();

    receiveItem.stakedTokenPrice = poolInfo.stakedTokenPrice;
    receiveItem.stakedTokenAddress = poolInfo.tokenAddress;
    receiveItem.stakedTokenDecimals = stakedDecimals;
    receiveItem.earnAmount = NP.times(
      NP.minus(poolInfo.stakedTokenPrice, receiveItem.avgHoldPrice),
      -1 * receiveItem.totalSize,
    );
    receiveItem.plPercent = NP.divide(receiveItem.earnAmount, receiveItem.totalMarginAmount);
    if (from != "poolDetail") receiveItem.createTime = await blockToTime(poolInfo.startBlock, "MMM DD, YYYY HH:mm:ss");
    // position持有时间
    receiveItem.holdingPeriod = getDuration(new Date() - new Date(receiveItem.createTime), 1);
    receiveItem.progress = getProgress(receiveItem);

    if (from != "poolDetail") {
      receiveItem.poolEndTime = await blockToEndTime(poolInfo.startBlock, poolInfo.endBlock);
      if (receiveItem.closingBlock * 1) {
        receiveItem.phase1StartTime = await blockToTime(receiveItem.closingBlock, "MMM DD, YYYY HH:mm:ss");
      }

      if (receiveItem.overdrawnBlock * 1) {
        receiveItem.overdrawnTime = await blockToTime(receiveItem.overdrawnBlock, "MMM DD, YYYY HH:mm:ss");
      }

      if (receiveItem.closedBlock * 1) {
        receiveItem.closedTime = await blockToTime(receiveItem.closedBlock, "MMM DD, YYYY HH:mm:ss");
      }
    }
    receiveItem.state = Number(receiveItem.positionState.toString());
    receiveItem.status = transPositionStatus({
      // status 显示用
      // state从合约获取的池子状态
      state: receiveItem.state,
      plPercent: receiveItem.plPercent,
    });

    receiveItem.statusText = transPositionStatusToText(receiveItem.status);

    receiveItem.poolInfo = poolInfo;
    return await handleClosedPositions(receiveItem);
  }

  async function handleClosedPositions(position) {
    const state = position.state;
    const closedFlag = position.closedFlag;
    const isLegacyLeftover = position.poolInfo.isLegacyLeftover;

    //CLOSED_STATE = 8;
    if (state === 8) {
      if (isLegacyLeftover) {
        position.earnAmount = position.totalMarginAmount * -1;
      }
      // closedFlag
      // true: 合约是通过清算关闭的; false: trader正常关闭
      if (!closedFlag) {
        // 获取日志 获得关仓价格
        // shorterBone PoolTillOut(poolId, user, amount); 拿日志
        let filterTopics = await encodeFilterTopics(ShorterBone, "PoolTillOut");
        const shorterBoneAddress = getContractAddress().ShorterBone;
        // log filter
        const filter = {
          fromBlock: position.closedBlock * 1,
          toBlock: position.closedBlock * 1,
          address: shorterBoneAddress,
          topics: filterTopics,
        };

        const result = await PoolGuardianAction.getPositionLogs(filter);
        const dataFromLog = result[0]?.data || 0;
        const amount = BigNumber.from(dataFromLog);

        const earnAmount = position.unsettledCash.sub(amount);

        const closedPrice = NP.divide(
          Transfer.receiveAmount(earnAmount, position.poolInfo.stableTokenDecimals),
          position.totalSize,
        );

        // 重新计算
        position.earnAmount = NP.times(NP.minus(closedPrice, position.avgHoldPrice), -1 * position.totalSize);
        position.plPercent = NP.divide(position.earnAmount, position.totalMarginAmount);
      } else {
        // 进入liquidating phase1 + phase2 清算完成

        if (position.overdrawnBlock === "0") {
          const phase1info = await AuctionHallAction.getPhase1Info(position.hash, position.poolInfo.decimals);
          const phase2info = await AuctionHallAction.getPhase2Info(
            position.hash,
            position.poolInfo.decimals,
            position.poolInfo.stableTokenDecimals,
          );

          let closedPrice = 0;

          if (phase2info.debtSize == 0) {
            closedPrice = phase1info.liquidationPrice;
          } else {
            let total = NP.plus(phase2info.usedCash, NP.times(phase1info.bidSize, phase1info.liquidationPrice));
            closedPrice = NP.divide(total, position.totalSize);
          }
          position.earnAmount = NP.times(NP.minus(closedPrice, position.avgHoldPrice), -1 * position.totalSize);
          position.plPercent = NP.divide(position.earnAmount, position.totalMarginAmount);
        } else {
          const legacy = await VaultButlerAction.getLegacyInfo(
            position.hash,
            position.poolInfo.decimals,
            position.poolInfo.stableTokenDecimals,
          );
          const closedPrice = NP.divide(legacy.usedCash, legacy.bidSize);
          position.earnAmount = NP.times(NP.minus(closedPrice, position.avgHoldPrice), -1 * position.totalSize);
          position.plPercent = NP.divide(position.earnAmount, position.totalMarginAmount);
        }
      }
    }

    return position;
  }

  function transPositionStatusToText(status) {
    let statusTextMap = {
      0: "Ends on",
      1: "Ends on",
      2: "Ends on",
      3: "Overdrawn on",
      4: "Liq. started on",
      5: "Closed on",
      6: "Finished on",
    };

    return statusTextMap[status];
  }

  return {
    position,
    setDetail,
    positionStatus,
    getMyPositions,
    batchPositionsSimple,
    getMyOpenPositions,
    handleSinglePositionInfo,
    getPositionStatusText,
    getPositionStatusTagColor,
    transPositionStatus,
    batchPositions,
    handlePositions,
    handlePositionsSimple,
  };
}
