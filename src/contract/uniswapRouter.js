/*
 * @Date: 2022-01-20 13:40:38
 * @LastEditTime: 2022-01-24 13:46:29
 */
import tokenJson from "@/abis/UniswapV2Router02.json";
import { outContract, getContractAddress } from "@/contract";
import { receiveAmount, toAmount } from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.UniswapV2Router02) {
    console.log("UniswapV2Router02 Address not found in getContract");
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.UniswapV2Router02, flag);
  return contract;
}

/**
 * @description: 获取dex交易的总金额
 * @param {*} amountIn
 * @param {*} path
 * @return {*}
 */
export async function getAmountsOut(amountIn, path = [], stakedDecimals = 18, stableDecimals = 18) {
  try {
    let openSize = toAmount(amountIn, stakedDecimals);
    const contract = await getContract();
    console.log("getAmountsOut", openSize, path);
    let amounts = await contract.getAmountsOut(openSize, path);
    return receiveAmount(amounts[1], stableDecimals);
  } catch (error) {
    console.log(error, "getAmountsOut");
  }
}
