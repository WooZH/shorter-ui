/*
 * @Date: 2021-11-03 15:29:52
 * @LastEditTime: 2022-05-27 17:59:50
 */
import { outContract, getContractAddress } from "@/contract";
import tokenJson from "@/abis/Farming";
import UniswapV2PairJson from "../abis/UniswapV2Pair.json";
import * as Transfer from "@/utils/transfer";
import * as Erc20 from "@/contract/erc20";
import { Transaction } from "@/hooks/useTransaction";
import { getGasParams } from "@/utils/gas";

/**
 * @description:获取合约对象
 * @param {*}
 * @return {object}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.Farming) return;
  try {
    const contract = await outContract(tokenJson, contractAddress.Farming, flag);
    return contract;
  } catch (error) {
    console.log(error, "getContract");
  }
}

/**
 * @description: harvestAll
 * @param {*}
 * @return {*}
 */
export async function harvestAll({
  govRewards,
  farmingRewards,
  voteAgainstRewards,
  tradingRewardPools,
  stakedRewardPools,
  createRewardPools,
  voteRewardPools,
}) {
  const contract = await getContract(true);

  const gasParams = await getGasParams(
    contract,
    "harvestAll",
    govRewards,
    farmingRewards,
    voteAgainstRewards,
    tradingRewardPools,
    stakedRewardPools,
    createRewardPools,
    voteRewardPools,
  );

  let tx = await contract.harvestAll(
    govRewards,
    farmingRewards,
    voteAgainstRewards,
    tradingRewardPools,
    stakedRewardPools,
    createRewardPools,
    voteRewardPools,
    gasParams,
  );
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

/**
 * @description: LP ids
 * @param {*}
 * @return {*}
 */
export async function getLpOnlineIds() {
  const contract = await getContract();
  let ids = await contract.getOnlinePoolIds();
  return ids;
}

/**
 * @description: 获取总奖励
 * @param {*} address
 * @return {*}
 */
export async function claimableIpiStr(address) {
  const contract = await getContract();
  let getClaimableIpiStr = await contract.getClaimableIpiStr(address);
  return Transfer.receiveAmount(getClaimableIpiStr, 18);
}

export async function getLpStakedAmount(lpToken) {
  const contractAddress = getContractAddress();
  const contract = await outContract(UniswapV2PairJson, lpToken);
  const [stakedAmount, decimals] = await Promise.all([
    contract.balanceOf(contractAddress.Farming),
    Erc20.decimals(lpToken),
  ]);
  return Transfer.receiveAmount(stakedAmount, decimals);
}

/**
 * @description:获取该lp内的token信息
 * @param {*} lpTokenAddr
 * @return {*}
 */
export async function getLpTokenInfo(lpToken, token_0, token_1) {
  const contract = await outContract(UniswapV2PairJson, lpToken);
  const [lpDecimals, totalSupply, reserves, decimals_0, decimals_1] = await Promise.all([
    contract.decimals(),
    contract.totalSupply(),
    contract.getReserves(),
    Erc20.decimals(token_0),
    Erc20.decimals(token_1),
  ]);
  return {
    totalSupply: Transfer.receiveAmount(totalSupply, lpDecimals) * 1,
    reserve0: Transfer.receiveAmount(reserves._reserve0, decimals_0) * 1,
    reserve1: Transfer.receiveAmount(reserves._reserve1, decimals_1) * 1,
  };
}

/**
 * @description: userStakedAmount
 * @param {*} address
 * @return {*}
 */
export async function getUserStakedAmount(address) {
  const contract = await getContract();
  let stakedAmount = await contract.getUserStakedAmount(address);
  return Transfer.receiveAmount(stakedAmount, 18);
}

/**
 * @description: deposit
 * @param {*} poolId
 * @param {*} amount
 * @return {*}
 */
export async function stakeLP(amount) {
  const contract = await getContract(true);
  let Amount = Transfer.toAmount(amount, 18);

  const gasParams = await getGasParams(contract, 'stake', Amount);
  let tx = await contract.stake(Amount, gasParams);
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

/**
 * @description: withdraw
 * @param {*} poolId
 * @param {*} amount
 * @return {*}
 */
export async function unStakeLP(amount) {
  const contract = await getContract(true);
  const amountFmt = Transfer.toAmount(amount, 18);

  const gasParams = await getGasParams(contract, "unStake", amountFmt);
  let tx = await contract.unStake(amountFmt, gasParams);
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

export async function pendingCreateReward(account) {
  const contract = await getContract();
  let res = await contract.allPendingRewards(account);
  if (_.isArray(res) && res.creatorRewards) {
    return Transfer.receiveAmount(res.creatorRewards, 18);
  }
  return 0;
}

export async function pendingAllRewards(account) {
  const contract = await getContract();
  const res = await contract.allPendingRewards(account);

  let createRewardPools = [];
  let stakedRewardPools = [];
  let voteRewardPools = [];
  let tradingRewardPools = [];
  if (_.isArray(res.createRewardPools)) {
    createRewardPools = res.createRewardPools.map(hash => {
      return Transfer.transBigNumber(hash) * 1;
    });
  }
  if (_.isArray(res.stakedRewardPools)) {
    stakedRewardPools = res.stakedRewardPools.map(hash => {
      return Transfer.transBigNumber(hash) * 1;
    });
  }
  if (_.isArray(res.voteRewardPools)) {
    voteRewardPools = res.voteRewardPools.map(hash => {
      return Transfer.transBigNumber(hash) * 1;
    });
  }
  if (_.isArray(res.tradingRewardPools)) {
    tradingRewardPools = res.tradingRewardPools.map(hash => {
      return Transfer.transBigNumber(hash) * 1;
    });
  }

  return {
    creatorRewards: Transfer.receiveAmount(res.creatorRewards || 0, 18) * 1,
    stakedRewards: Transfer.receiveAmount(res.stakedRewards || 0, 18) * 1,
    farmingRewards: Transfer.receiveAmount(res.farmingRewards || 0, 18) * 1,
    govRewards: Transfer.receiveAmount(res.govRewards || 0, 18) * 1,
    tradingRewards: Transfer.receiveAmount(res.tradingRewards || 0, 18) * 1,
    voteAgainstRewards: Transfer.receiveAmount(res.voteAgainstRewards || 0, 18) * 1,
    voteRewards: Transfer.receiveAmount(res.voteRewards || 0, 18) * 1,

    stakedRewardPools,
    voteRewardPools,
    tradingRewardPools,
    createRewardPools,
  };
}

//createRewardPools ->Pool No. 1
//liquidity providing rewards  -> stakedRewards
// stakedRewardPools

/** uniswap v3 */

export async function getTokenIdV3() {
  const contract = await getContract();
  const res = await contract.getTokenId();
  return res;
}

export async function getUserInfoMapV3(account) {
  const contract = await getContract();
  const res = await contract.userInfoMap(account);
  return res;
}

export async function getUserInfoV3(account, tokenId) {
  const contract = await getContract();
  const res = await contract.getUserInfo(account, tokenId);
  return res;
}

export async function getTokenInfoV3(tokenId) {
  const contract = await getContract();
  const res = await contract.getTokenInfo(tokenId);
  return res;
}

export async function getAmountsForLiquidityV3(tokenId, liquidity) {
  const contract = await getContract();

  const res = await contract.getAmountsForLiquidity(tokenId, liquidity);

  return res;
}

export async function getLiquidityForAmount0(tokenId, amount0) {
  const contract = await getContract();
  console.log(tokenId, amount0);
  const res = await contract.getLiquidityForAmount0(tokenId, amount0);
  return res;
}

export async function getLiquidityForAmount1(tokenId, amount1) {
  const contract = await getContract();
  const res = await contract.getLiquidityForAmount1(tokenId, amount1);
  return res;
}

export async function stakeV3(tokenId, amountA, amountB, LP) {
  const contract = await getContract(true);

  const gasParams = await getGasParams(contract, "stake", tokenId, amountA, amountB, LP);
  let tx = await contract.stake(tokenId, amountA, amountB, LP, gasParams);
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

export async function unStakeV3(tokenId, LP, amountA, amountB) {
  const contract = await getContract(true);

  const gasParams = await getGasParams(contract, "unStake", tokenId, LP, amountA, amountB);
  let tx = await contract.unStake(tokenId, LP, amountA, amountB, gasParams);
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}
