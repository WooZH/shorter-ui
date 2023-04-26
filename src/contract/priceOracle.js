/*
 * @Date: 2021-06-24 17:13:10
 * @LastEditTime: 2022-05-07 16:06:14
 */

import { outContract, getContractAddress } from "@/contract";
import tokenJson from "../abis/PriceOracle.json";
import * as Transfer from "@/utils/transfer";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.PriceOracle) {
    console.log("ipi_contract_address not found");
    return;
  }
  try {
    const contract = await outContract(tokenJson, contractAddress.PriceOracle, flag);
    return contract;
  } catch (error) {
    console.log("getContract PriceOracle");
  }
}

/**
 * @description: 获取当前token价格
 * @param {*} token
 * @return {*}
 */
export async function getFeedPrice(token) {
  try {
    const contract = await getContract();
    let res = await contract.getLatestMixinPrice(token);
    let decimals = 18;
    let tokenPrice = Transfer.receiveAmount(res, decimals * 1);
    if (tokenPrice.toString().indexOf("-") > -1) {
      tokenPrice = toNumberStr(tokenPrice, decimals * 1);
    }
    return {
      price: tokenPrice,
      decimals: decimals * 1,
    };
  } catch (err) {
    console.log(err, token + " price error");
    return {
      decimals: 18,
      price: 0,
    };
  }
}

function toNumberStr(num, digits) {
  // 正则匹配小数科学记数法
  /* eslint-disable */
  if (/^(\d+(?:\.\d+)?)(e)([\-]?\d+)$/.test(num)) {
    // 正则匹配小数点最末尾的0
    const temp = /^(\d{1,}(?:,\d{3})*\.(?:0*[1-9]+)?)(0*)?$/.exec(num.toFixed(digits));
    if (temp) {
      return temp[1];
    } else {
      return num.toFixed(digits);
    }
  } else {
    return "" + num;
  }
}

export async function getIPISTRPrice() {
  let contractAddress = getContractAddress();
  if (contractAddress.IPISTR) {
    const res = await getFeedPrice(contractAddress.IPISTR);
    return res;
  }

  return {
    decimals: 8,
    price: 0,
  };
}
