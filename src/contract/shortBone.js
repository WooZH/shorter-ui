import { Contract } from "ethers-multicall";
import { outContract, getContractAddress } from "@/contract";

import abiJson from "@/abis/ShorterBone.json";
import * as ERC20 from "./erc20";
import ERC20ABI from "../abis/ERC20.json";

import { getMulticallProvider } from "@/wallet/provider";
import { Local } from "@/utils/localStorage";
import * as Transfer from "@/utils/transfer";

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

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.ShorterBone) {
    console.log("ipi_contract_address not found");
    return;
  }
  const contract = await outContract(abiJson, contractAddress.ShorterBone, flag);
  return contract;
}

export async function getTokenWhiteList() {
  let tokenListSession = [];
  tokenListSession = sessionStorage.getItem("whiteTokenList");
  if (tokenListSession) {
    console.log("get token from session");
    return JSON.parse(tokenListSession);
  }
  const contract = await getContract();
  const tokenMap = await contract.totalTokenSize();
  let listLength = Transfer.transBigNumber(tokenMap);

  let tokenLengthList = [];
  listLength = listLength - 1;
  while (listLength >= 0) {
    tokenLengthList.unshift(listLength--);
  }

  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const shorterBoneContract = new Contract(contractAddress.ShorterBone, abiJson);
  let listCalls = [];
  tokenLengthList.forEach(item => {
    listCalls.push(shorterBoneContract.tokens(item));
  });

  const tokenTTTT = await contract.tokens(0);

  let tokens = await ethcallProvider.all(listCalls);

  let tokenDetailCalls = [];
  tokens.forEach(address => {
    let ERC20Contract = new Contract(address, ERC20ABI);
    tokenDetailCalls.push(shorterBoneContract.getTokenInfo(address));
    tokenDetailCalls.push(ERC20Contract.symbol());
    tokenDetailCalls.push(ERC20Contract.decimals());
  });

  let results = await ethcallProvider.all(tokenDetailCalls);
  let formattedTokenList = [];
  for (let i = 0; i < results.length / 3; i++) {
    const zIndex = i * 3;
    const tokenBase = results[zIndex];
    const tokenSymbol = results[zIndex + 1];
    const tokenDecimals = results[zIndex + 2];
    let tokenDetail = {
      logoURI: "",
      chainId: "",
    };
    let token = tokens[i];

    let rating = Transfer.transBigNumber(tokenBase.tokenRatingScore);

    const tokenBaseInfo = {
      address: token,
      rating: formatRating(rating),
      ratingText: ratingMap[formatRating(rating)],
      weight: rating,
      swapRouter: tokenBase.swapRouter,
      symbol: tokenSymbol,
    };

    // 例如ETH链上 实际使用weth，需要重新命名为ETH
    if (tokenBaseInfo.address === contractAddress.chainTokenAddress) {
      tokenBaseInfo.symbol = contractAddress.chainTokenSymbol;
    }

    let shorterStorage = Local.get("shorterStorage");
    const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;

    tokenList.map(item => {
      if (item.address === token) {
        tokenDetail.logoURI = item.logoURI;
        tokenDetail.chainId = item.chainId;
        tokenDetail.description = item.name;
        tokenDetail.decimals = tokenDecimals;
      }
    });
    formattedTokenList.push(Object.assign(tokenDetail, tokenBaseInfo));
  }
  let shorterStorage = Local.get("shorterStorage");
  const tokenTop = shorterStorage[getContractAddress().networkName].common.token.top;
  const temp = formattedTokenList.concat();
  temp.map((item, index) => {
    tokenTop.forEach(top => {
      if (top.address === item.address) {
        temp.splice(index, 1);
        temp.unshift(item);
      }
    });
  });
  return temp;
}

// 检查 转换rating
function formatRating(rating) {
  const value = rating * 1;
  if (value >= 848) {
    return 1; // AAA
  } else if (value >= 680 && value < 848) {
    return 2; // AA
  } else if (value >= 600 && value < 680) {
    return 3; // A
  } else if (value >= 420 && value < 600) {
    return 4; // BBB
  } else if (value >= 350 && value < 420) {
    return 5; // BB
  } else if (value >= 300 && value < 350) {
    return 6; // B
  } else if (value >= 180 && value < 300) {
    return 7; // CCC
  } else if (value >= 120 && value < 180) {
    return 8; // CC
  } else if (value < 100) {
    return 9; // C
  }
}

export async function getTokenDetail(token) {
  let tokenDetail = {
    logoURI: "",
    chainId: "",
  };
  // const tokenSymbol = await ERC20.symbol(token);
  // const tokenBase = await getTokenInfo(token);
  // const tokenDecimals = await ERC20.decimals(token);
  let contractAddress = getContractAddress();

  const shorterBoneContract = new Contract(contractAddress.ShorterBone, abiJson);
  let ERC20Contract = new Contract(token, ERC20ABI);

  let tokenDetailCalls = [];
  tokenDetailCalls.push(shorterBoneContract.getTokenInfo(token));
  tokenDetailCalls.push(ERC20Contract.symbol());
  tokenDetailCalls.push(ERC20Contract.decimals());
  let ethcallProvider = await getMulticallProvider();

  let callResult = await ethcallProvider.all(tokenDetailCalls);
  const tokenBase = callResult[0];
  const tokenSymbol = callResult[1];
  const tokenDecimals = callResult[2];
  let rating = Transfer.transBigNumber(tokenBase.tokenRatingScore);
  const tokenBaseInfo = Object.assign(
    {
      address: token,
      rating: formatRating(rating),
      ratingText: ratingMap[formatRating(rating)],
      weight: rating,
      swapRouter: tokenBase.swapRouter,
    },
    { symbol: tokenSymbol },
  );
  if (tokenBaseInfo.address === contractAddress.chainTokenAddress) {
    tokenBaseInfo.symbol = contractAddress.chainTokenSymbol;
  }
  // get Info from local file
  let shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;

  tokenList.map(item => {
    if (item.address === token) {
      (tokenDetail.logoURI = item.logoURI),
        (tokenDetail.chainId = item.chainId),
        (tokenDetail.description = item.name),
        (tokenDetail.decimals = tokenDecimals);
      tokenDetail.website = item.website;
    }
  });
  let result = Object.assign(tokenDetail, tokenBaseInfo);
  // result = _.orderBy(result, ['weight'], ['desc'])

  return result;
}

/**
 * @description: tokenInfo获取当前币种的信息——是否在白名单/交易路由/评级
 * @param: address token
 * @return {
  token: 币种合约地址
  swapRouter: 交易路由
  rating: 币种等级
    enum TokenRating {
          GENESIS,0
          AAA,1
          AA,2
          A,3
          BBB,4
          BB,5
          B,6
          CCC,7
          CC,8
          C9
      }
   }
 */
export async function getTokenInfo(address) {
  const contract = await getContract();
  const tokenInfo = await contract.getTokenInfo(address);
  return tokenInfo;
}

/**
 * @description: 获取token基本信息
 * @param {*} tokenAddress
 * @return {*}
 */
export async function getTokenBaseInfo(tokenAddress) {
  try {
    const contractAddress = getContractAddress();
    let shorterStorage = Local.get("shorterStorage");
    const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;

    const item = tokenList.find(item => item.address == tokenAddress);
    const [decimals, { symbol, name }] = await Promise.all([ERC20.decimals(tokenAddress), ERC20.symbol(tokenAddress)]);

    let currentSymbol = symbol;
    if (tokenAddress === contractAddress.chainTokenAddress) {
      currentSymbol = contractAddress.chainTokenSymbol;
    }

    return { ...item, decimals, symbol: currentSymbol, name, address: tokenAddress };
  } catch (e) {
    console.error("get token base info error =>", e);
  }
}

export function getTokenLogo(tokenAddress) {
  let shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;
  const item = tokenList.find(item => item.address == tokenAddress);
  if (item) {
    return item.logoURI;
  }
  return "";
}

export function getTokenSymbol(tokenAddress) {
  let shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;
  const item = tokenList.find(item => item.address == tokenAddress);
  if (item) {
    return item.symbol;
  }
  return "";
}
export function getTokenInfoFromList(tokenName) {
  let shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;
  const item = tokenList.find(item => item.symbol == tokenName);
  if (item) {
    return item;
  }
  return "";
}
