import { ethers, BigNumber } from "ethers";
import { Contract } from "ethers-multicall";
import NP from "number-precision";

import TradingHubABI from "@/abis/TradingHub.json";
import StrPoolABI from "@/abis/StrPool.json";
import FactoryABI from "@/abis/UniswapV2Factory.json";
import AuctionHallABI from "@/abis/AuctionHall.json";
import VaultButlerABI from "@/abis/VaultButler.json";
import ERC20ABI from "@/abis/ERC20.json";
import pairABI from "@/abis/UniswapV2Pair.json";
import routerABI from "@/abis/UniswapV2Router02.json";
import DexCenterABI from "@/abis/DexCenter";
import QuoterABI from "@/abis/Quoter";

import { outContract, getContractAddress } from "@/contract";
import * as ShortBone from "@/contract/shortBone";

import { getRPCProvider, getMulticallProvider } from '@/wallet/provider'
import { Transaction } from "@/hooks/useTransaction";

import * as Transfer from "@/utils/transfer";
import { encodeFilterTopics } from "@/utils/format";
import { getGasParams } from "@/utils/gas";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  const contractAddress = getContractAddress();
  if (!contractAddress?.TradingHub) {
    return;
  }

  const contract = await outContract(TradingHubABI, contractAddress.TradingHub, flag);
  return contract;
}
/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getDexCenterContract() {
  let contractAddress = getContractAddress();
  if (!contractAddress?.DexCenter) {
    return;
  }
  const contract = await outContract(DexCenterABI, contractAddress.DexCenter);
  return contract;
}

/**
 * @description: 设置交易路由
 * @param {*} address
 * @return {*}
 */
export async function setTradingHubAddress(address) {
  const contract = await getContract();
  let results = await contract.setTradingHubAddress(address);
  return results;
}

/**
 * @description: 根据状态获取positions的hash列表
 * @param {*} state 1:open 2:closing 3:overdrawn 4:closed
 * @return {*}
 */
export async function getPositionsByState(state) {
  try {
    const contract = await getContract();
    const positions = await contract.getPositionsByState(state);
    return positions;
  } catch (error) {}
}
/**
 * @description: 根据状态获取positions的hash列表
 * @param {*} state 1:open 2:closing 3:overdrawn 4:closed
 * @return {*}
 */
export async function getPositionsByAccount(account, state) {
  try {
    const contract = await getContract();
    let positions = await contract.getPositionsByAccount(account, state);
    return positions;
  } catch (error) {}
}

/**
 * @description: 根据hash获取strToken
 * @param {*} hash
 * @return {*}
 */
/*
struct PositionInfo {
    uint64 poolId;
    address strToken;
    ITradingHub.PositionState positionState;
}
*/

export async function getPositionStrToken(hash) {
  try {
    const contract = await getContract();
    let res = await contract.positionInfoMap(hash);
    return {
      poolId: Transfer.transBigNumber(res.poolId) * 1,
      positionState: Number(res.positionState.toString()),
      strToken: res.strToken,
    };
  } catch (error) {}
}

/**
 * @description: 获取所有closing头寸
 * @param {*}
 * @return {*}
 */
export async function getClosingPositions() {
  return await getPositionsByState(2);
}

/**
 * @description: 获取所有穿仓
 * @param {*}
 * @return {*}
 */
export async function getOverdrawnPositions() {
  return await getPositionsByState(3);
}

/**
 * @description: 获取关闭的头寸
 * @param {*}
 * @return {*}
 */
export async function getFinshedPosition() {
  return await getPositionsByState(4);
}

/**
 * @description:trader开仓
 * @param {*} _poolId 池ID
 * @param {*} _initOrderSize 抵押金额
 * @return {*}
 */
export async function openPosition(
  _poolId,
  _initOrderSize,
  tokenAddress,
  stableToken,
  stakedDecimals,
  stableDecimals,
  _amountOutMin,
  swapRouter,
) {
  const contract = await getContract(true);
  let amount = Transfer.toAmount(_initOrderSize, stakedDecimals);
  let _path = [tokenAddress, stableToken];
  // fee default: 3000
  let fees = [3000];
  let path = encodePath(_path, fees);
  // sellShort 开仓/加仓
  /**
   * poolId
   * amount
   * amountOutMin
   * swapRouter
   * path
   */
  let amountOutMin = Transfer.toAmount(NP.times(_amountOutMin, _initOrderSize).toFixed(stableDecimals), stableDecimals);
  /**
   * 加仓方法调整
   *
   */
  const gasParams = await getGasParams(contract, 'sellShort', _poolId, amount, amountOutMin, path);
  let tx = await contract.sellShort(_poolId, amount, amountOutMin, path, gasParams);
  let result = await tx.wait();
  Transaction(result.transactionHash);
  return result;
}

export function encodePath(path, fees) {
  if (path.length != fees.length + 1) {
    throw new Error("path/fee lengths do not match");
  }

  let encoded = "0x";
  for (let i = 0; i < fees.length; i++) {
    // 20 byte encoding of the address
    encoded += path[i].slice(2);
    // 3 byte encoding of the fee
    encoded += fees[i].toString(16).padStart(2 * 3, "0");
  }
  // encode the final token
  encoded += path[path.length - 1].slice(2);

  return encoded.toLowerCase();
}
/**
 * 预估保证金
 * poolId: 池中id
 * amount: 预开仓的数量
 * slippage: 滑点 (如 500 => 5%, 3 => 0.03%)
 * path: 交易path
 */
export async function getEstimatedMargin(
  _initOrderSize,
  _slippage,
  tokenAddress,
  stableToken,
  stakedDecimals,
  stableDecimals,
  leverage = 1,
  swapRouter = "",
) {
  let amount = Transfer.toAmount(_initOrderSize, stakedDecimals);
  let _path = [tokenAddress, stableToken];

  let estimatedMargin = await getEstimatedMarginFromUniswap(
    amount,
    _path,
    _slippage,
    stableDecimals,
    leverage,
    swapRouter,
  );
  return estimatedMargin;
}

// 开仓计算 预估押金
async function getEstimatedMarginFromUniswap(amount, _path, _slippage, stableDecimals, leverage, swapRouter = "") {
  let margin = await getExpectedPrice(amount, _path, _slippage, stableDecimals, swapRouter);
  return NP.divide(margin, leverage);
}

// 开仓 获取预期价格
export async function getExpectedPrice(amount, _path, _slippage, stableDecimals, swapRouter = "") {
  if (!amount) return 0;

  let amountsOutMin = await getAmountOutMin(amount, _path, swapRouter, stableDecimals);
  return NP.times(amountsOutMin, (10000 - _slippage) / 10000).toFixed(stableDecimals);
}

export async function getAmountOutMin(amount, _path, swapRouter = "", stableDecimals) {
  let isV3 = await isSwapRouterV3(swapRouter);
  if (isV3) {
    let amountsOutMin = await getAmountOutMinV3(amount, _path);
    return NP.divide(amountsOutMin, Math.pow(10, stableDecimals));
  } else {
    let uniswapV2Router = await outContract(routerABI, getContractAddress().UniswapV2Router02);
    let amountsOut = await uniswapV2Router.getAmountsOut(amount, _path);
    let amountsOutMin = Transfer.receiveAmount(amountsOut[amountsOut.length - 1], stableDecimals);
    return amountsOutMin;
  }
}

export async function getAmountInMax(amount, _path, isV3 = false) {
  if (!amount) return 0;
  if (isV3) {
    return await getAmountInMaxV3(amount, _path);
  }
  let uniswapV2Router = await outContract(routerABI, getContractAddress().UniswapV2Router02);
  let amountsIn = await uniswapV2Router.getAmountsIn(amount, _path);
  let amountInMax = amountsIn[0];
  return amountInMax;
}
// 判断是否是uniSwapV3交易的币
export async function isSwapRouterV3(swapRouter) {
  const DexContract = await getDexCenterContract();
  let isSwapV3 = await DexContract.isSwapRouterV3(swapRouter);
  return isSwapV3;
}

async function getAmountInMaxV3(_amount, _path) {
  const fees = [3000];
  const path = encodePath(_path, fees);

  const amount = ethers.utils.defaultAbiCoder.encode(["uint256"], [_amount.toString()]);
  const dataParam = new ethers.utils.Interface(QuoterABI).encodeFunctionData("quoteExactOutput", [path, amount]);
  const toParam = getContractAddress().UniswapV3Quoter;
  const params = [
    {
      data: dataParam,
      to: toParam,
    },
    "latest",
  ];

  const ethersProvider = getRPCProvider();
  const amountsInMax = await ethersProvider.send("eth_call", params);
  return amountsInMax;
}

export async function getAmountOutMinV3(_amount, _path) {
  const fees = [3000];
  const path = encodePath(_path, fees);

  const amount = ethers.utils.defaultAbiCoder.encode(["uint256"], [_amount.toString()]);
  const dataParam = new ethers.utils.Interface(QuoterABI).encodeFunctionData("quoteExactInput", [path, amount]);
  const toParam = getContractAddress().UniswapV3Quoter;
  const params = [
    {
      data: dataParam,
      to: toParam,
    },
    "latest",
  ];

  const ethersProvider = getRPCProvider();
  const amountsOutMin = await ethersProvider.send("eth_call", params);
  return amountsOutMin;
}

export async function callContract(TradingHubABI, address) {
  const ethersProvider = getRPCProvider();
  const Contract = new ethers.Contract(address, TradingHubABI, ethersProvider);
  return Contract;
}

/**
 * @description: 平仓
 * @param {
 * _poolId
 * _initOrderSize
 * tokenAddress stakedToken池中代币地址
 * stableToken 池子中稳定币地址
 * decimals 池中代币精度
 * }
 * @return {*}
 */
export async function closePosition(
  _poolId,
  _initOrderSize,
  _slippage,
  tokenAddress,
  stableToken,
  decimals,
  swapRouter,
) {
  const contract = await getContract(true);
  let amount = Transfer.toAmount(_initOrderSize, decimals);
  // let _path = [tokenAddress, stableToken];
  let _path = [stableToken, tokenAddress];
  let isV3 = await isSwapRouterV3(swapRouter);
  let path = _path;
  // UniSwapV3 平仓时,反转path
  // Staked在第一位,stable在最后一位
  if (isV3) {
    path = path.reverse();
  }

  let _amountInMax = await getAmountInMax(amount, path, isV3);
  /**
   *  poolId,
   *  amount,
   *  amountInMax,
   *  calldata path
   */
  let fees = [3000];
  path = encodePath(path, fees);

  let amountInMax = BigNumber.from(_amountInMax);

  const gasParams = await getGasParams(contract, "buyCover", _poolId, amount, amountInMax, path);
  let tx = await contract.buyCover(_poolId, amount, amountInMax, path, gasParams);
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

// 获取账号的positions信息
export async function getAllPositions(account) {
  try {
    const contract = await getContract();
    let getPosition = await contract.getPositions(account);
    return getPosition;
  } catch (error) {}
}
/**
 * @description: 获取池子下我的头寸
 * @param {*} poolId
 * @return {*}
 */
export async function getMyPositionsByPool(address, poolId) {
  const contract = await getContract();
  let getPosition = await contract.getUserPositionsByPoolId(address, poolId);
  return getPosition;
}
/**
 * @description: 获取池子下我的头寸-all
 * @param {*} poolId
 * @return {*}
 */
export async function getMyAllPositions(address) {
  const contract = await getContract();
  const myPositions = await contract.getPositions(address);
  return myPositions;
}
/**
 * @description get info by address
 * @param {position address} address
 * @returns {
 * hash
 * size
 * margin
 * Liq.Price
 * Avg.Open Price
 * P/L
 *
 * }
 */
export async function getPositionInfoByAddress(address) {
  const contract = await getContract();
  const positionProfile = await contract.positionInfoMap(address);
  const strPoolContract = await outContract(StrPoolABI, positionProfile.strToken);
  const positionInfo = await strPoolContract.positionInfoMap(address);
  const mixedPositionInfo = Object.assign(
    {
      state: positionProfile.positionState,
      poolId: Transfer.transBigNumber(positionProfile.poolId),
      strToken: positionProfile.strToken,
    },
    positionInfo,
  );
  return mixedPositionInfo;
}

/**
 * @description: 获取池子下的所有头寸
 * @param {*} poolId
 * @return {*}
 */
// todo 现在需要id和state
export async function getAllPositionsByPool(poolId) {
  const contract = await getContract();
  // todo 需要获取所有
  let getPosition = await contract.getPositionsByPoolId(poolId, 1);
  return getPosition;
}

/**
 * @description: 查看池子是否可提token
 * @param {*} poolId
 * @return {*}
 */
export async function isPoolCanWithdraw(poolId) {
  const contract = await getContract();
  // update abi
  let isPoolCanWithdraw = await contract.isPoolWithdrawable(poolId);
  return isPoolCanWithdraw;
}

export async function phasePerBlock() {
  const contract = await getContract();
  let secondsPerBlock = await contract.secondsPerBlock();
  return Transfer.transBigNumber(secondsPerBlock);
}

// todo not a function
export async function getPriceImpact(_path, _amountIn, decimals) {
  const contract = await getContract();
  let openSize = Transfer.toAmount(_amountIn, decimals);
  let priceImpact = await contract.getPriceImpact(_path, openSize);
  return Transfer.transBigNumber(priceImpact._priceImpact);
}
export async function userPositionSize(address) {
  const contract = await getContract();
  let size = await contract.userPositionSize(address);
  return size;
}

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getFactoryContract() {
  let contractAddress = getContractAddress();
  if (!contractAddress?.UniswapV2Factory) {
    return;
  }
  const contract = await outContract(FactoryABI, contractAddress.UniswapV2Factory);
  return contract;
}

export async function getPriceImpactNew(path, amount, decimals) {
  let factory = await getFactoryContract();
  let pair_lst = [];
  for (let i = 0; i < path.length - 1; i++) {
    pair_lst.push(await factory.getPair(path[i], path[i + 1]));
  }
  let pair_info = [];
  for (const addr of pair_lst) {
    let pairContract = await outContract(pairABI, addr);
    let token0 = await pairContract.token0();
    let reserves = await pairContract.getReserves();

    pair_info.push(token0);
    pair_info.push([Transfer.receiveAmount(reserves[0]), Transfer.receiveAmount(reserves[1])]);
  }

  let _totalOutPutAmount = Transfer.toAmount(amount, decimals);
  for (let i = 0; i < pair_info.length / 2; i++) {
    if (pair_info[i * 2] == path[i]) {
      _totalOutPutAmount = (_totalOutPutAmount * pair_info[i * 2 + 1][1]) / pair_info[i * 2 + 1][0];
    } else {
      _totalOutPutAmount = (_totalOutPutAmount * pair_info[i * 2 + 1][0]) / pair_info[i * 2 + 1][1];
    }
  }

  let uniswapV2Router = await outContract(routerABI, getContractAddress().UniswapV2Router02);
  let amountOutMins = await uniswapV2Router.getAmountsOut(Transfer.toAmount(amount, decimals), path);

  let totalOutPutAmount = Transfer.transBigNumber(amountOutMins[amountOutMins.length - 1]);
  let _basePriceImpact = NP.divide(NP.times(NP.minus(_totalOutPutAmount, totalOutPutAmount), 100), _totalOutPutAmount);

  if (_basePriceImpact > 30) {
    return _basePriceImpact - 30;
  }

  return _basePriceImpact;
}

/**
 * @description: 获取头寸的相关块
 * @param {*} positionHash
 * @return {*}
 */
/*
struct PositionBlock {
  uint256 openBlock;
  uint256 closingBlock;
  uint256 overdrawnBlock;
  uint256 closedBlock;
}
*/
export async function getPositionBlocks(positionHash) {
  const contract = await getContract();
  const { openBlock, closingBlock, overdrawnBlock, closedBlock } = (await contract.positionBlocks(positionHash)) || {};
  return {
    openBlock: Transfer.transBigNumber(openBlock) * 1,
    closingBlock: Transfer.transBigNumber(closingBlock) * 1,
    overdrawnBlock: Transfer.transBigNumber(overdrawnBlock) * 1,
    closedBlock: Transfer.transBigNumber(closedBlock) * 1,
  };
}

export async function getPositionDetail(hash) {
  let contractAddress = getContractAddress();
  let callList = [];
  const ethcallProvider = await getMulticallProvider();
  const { strToken, positionState: state } = (await getPositionStrToken(hash)) || {};
  const THContract = new Contract(contractAddress.TradingHub, TradingHubABI);
  const SPContract = new Contract(strToken, StrPoolABI);
  const AHContract = new Contract(contractAddress.AuctionHall, AuctionHallABI);
  const VBContract = new Contract(contractAddress.VaultButler, VaultButlerABI);
  callList.push(SPContract.getMetaInfo());
  callList.push(THContract.positionBlocks(hash));
  const baseInfo = await ethcallProvider.all(callList);
  const poolInfo = baseInfo[0];
  const positionBlocks = baseInfo[1];
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

  // tokenInfo, stableTokenInfo
  const { stableTokenDecimals, stakedTokenDecimals, stakedToken, stableToken } = _poolInfo || {};

  const ERC20Contract_0 = new Contract(stakedToken, ERC20ABI);
  const ERC20Contract_1 = new Contract(stableToken, ERC20ABI);

  callList = [];
  callList.push(SPContract.positionInfoMap(hash));
  callList.push(AHContract.phase1Infos(hash));
  callList.push(AHContract.phase2Infos(hash));
  callList.push(VBContract.legacyInfos(hash));
  callList.push(ERC20Contract_0.symbol());
  callList.push(ERC20Contract_0.decimals());
  callList.push(ERC20Contract_1.symbol());
  callList.push(ERC20Contract_1.decimals());
  const detailInfo = await ethcallProvider.all(callList);
  const positionInfoMap = detailInfo[0];
  const phase1Infos = detailInfo[1];
  const phase2Infos = detailInfo[2];
  const legacyInfos = detailInfo[3];
  const symbol_0 = detailInfo[4];
  const decimals_0 = detailInfo[5];
  const symbol_1 = detailInfo[6];
  const decimals_1 = detailInfo[7];
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
    bidSize_big: phase1Infos.bidSize,
    liquidationPrice: Transfer.receiveAmount(phase1Infos.liquidationPrice || 0, 18) * 1,
    flag: phase1Infos.flag,
    isSorted: phase1Infos.isSorted,
  };
  const _phase2Infos = {
    flag: phase2Infos.flag,
    isWithdraw: phase2Infos.isWithdraw,
    rulerAddr: phase2Infos.rulerAddr,
    debtSize: Transfer.receiveAmount(phase2Infos.debtSize || 0, stakedTokenDecimals),
    usedCash: Transfer.receiveAmount(phase2Infos.usedCash || 0, stableTokenDecimals) * 1,
    dexCoverReward: Transfer.receiveAmount(phase2Infos.dexCoverReward || 0, stableTokenDecimals) * 1,
  };

  const _legacyInfos = {
    bidSize: Transfer.receiveAmount(legacyInfos.bidSize || 0, stakedTokenDecimals) * 1,
    usedCash: Transfer.receiveAmount(legacyInfos.usedCash || 0, stableTokenDecimals) * 1,
    bidSize_big: legacyInfos.bidSize,
  };
  const tokenTemp = await ShortBone.getTokenInfo(stakedToken);
  // const getTokenInfo
  const tokenInfo = {
    symbol: symbol_0,
    decimals: decimals_0,
    address: stakedToken,
    logoURI: ShortBone.getTokenLogo(stakedToken),
    swapRouter: tokenTemp.swapRouter,
  };
  const stableTokenInfo = {
    symbol: symbol_1,
    decimals: decimals_1,
    address: stableToken,
    logoURI: ShortBone.getTokenLogo(stableToken),
  };

  return {
    hash,
    state,
    ..._positionInfoMap,
    poolInfo: _poolInfo,
    phase1Info: _phase1Infos,
    phase2Info: _phase2Infos,
    legacyInfo: _legacyInfos,
    ..._positionBlocks,
    tokenInfo,
    stableTokenInfo,
  };
}

export async function listenClosingPositions(callback) {
  const iface = new ethers.utils.Interface(TradingHubABI);
  const topics = await encodeFilterTopics(TradingHubABI, "PositionClosing");
  const contractAddress = getContractAddress();
  const filter = {
    topics,
    address: contractAddress.VaultButler,
  };
  const provider = getRPCProvider();
  provider.on(filter, log => {
    const res = iface.parseLog(log);
    if (typeof callback === "function") {
      callback(res.args);
    }
  });
}
