import NP from "number-precision";
import { Contract } from "ethers-multicall";

import { getContractAddress } from "@/contract";
import * as PoolGuardianAction from "@/contract/poolGuardian";
import THABI from "../abis/TradingHub.json";
import PGABI from "../abis/PoolGuardian.json";

import { getMulticallProvider } from "@/wallet/provider";
import { blockToEndTime } from "@/utils/format";
import * as Transfer from "@/utils/transfer";
import { spliceIntoChunks } from "@/utils/format";

import { usePoolDetail } from "./usePoolDetail";
import { usePoolTokens } from "./usePoolTokens";
import { usePosition } from "./usePosition";

const { batchPositionsSimple } = usePosition();
const { getPoolAPY } = usePoolDetail();
const { fetchUserTokens } = usePoolTokens();

export function usePoolList() {
  async function formatPoolTime(list, type, opens) {
    for (const item of list) {
      try {
        let contractAddress = getContractAddress();
        console.log("endTime", item.startBlock, item.endBlock, item.endBlock * 1 + 3600 / contractAddress.blockSpeed);
        item.endTime = await blockToEndTime(item.startBlock, item.endBlock * 1 + 3600 / contractAddress.blockSpeed);
        console.log("item endTime", item.endTime);

        if (!type) {
          let myBorrowed = 0;
          if (opens.get(item.sTokenAddress)) {
            myBorrowed = Transfer.receiveAmount(opens.get(item.sTokenAddress), item.decimals);
          }
          item.myBorrow = myBorrowed;
        }
        item.price = item.stakedTokenPrice;
        item.availableAmount = item.stakedAmount * 1 - item.borrowedAmount * 1;
        if (type && !item.apy) {
          item.apy = await getPoolAPY(item.stakedAmount, item.price, item.stableTokenDecimals, item.rewardRate);
          if (item.apy !== "Initializing") {
            item.apySort = item.apy.replace("+", "").replace("%", "");
            item.apySort = Number(item.apySort);
          } else {
            item.apySort = -1;
          }
        }
      } catch (error) {
        console.error(error, item.id, "transPoolTime-error");
      }
    }
    return list;
  }

  async function getSubPoolNumber(tokens) {
    let contractAddress = getContractAddress();
    let ethcallProvider = await getMulticallProvider();

    const PGContract = new Contract(contractAddress.PoolGuardian, PGABI);
    let poolCall = [];
    // 由token获取所有的池子id
    tokens.forEach(token => {
      poolCall.push(PGContract.queryPools(token.address, 1));
      poolCall.push(PGContract.queryPools(token.address, 2));
    });
    let result = await ethcallProvider.all(poolCall);
    result = spliceIntoChunks(result, 2);
    let poolMap = new Map();

    result.map((item, index) => {
      const pools = [...item[0], ...item[1]];
      poolMap.set(tokens[index].address, pools.length);
    });
    return poolMap;
  }

  async function getPoolsByToken(tokens, type, account) {
    let tokenList = [];
    if (tokens instanceof Array) {
      tokenList = tokens.map(item => {
        return item.address;
      });
    } else {
      tokenList.push(tokens.address);
    }

    let contractAddress = getContractAddress();
    let ethcallProvider = await getMulticallProvider();
    const PGContract = new Contract(contractAddress.PoolGuardian, PGABI);
    let poolCall = [];
    tokenList.forEach(token => {
      poolCall.push(PGContract.queryPools(token, 1));
      poolCall.push(PGContract.queryPools(token, 2));
    });
    let result = await ethcallProvider.all(poolCall);

    const poolMap = new Map();
    let tempRequireIds = [];
    result.map(item => {
      const temp = item.map(pool => {
        return Transfer.transBigNumber(pool);
      });
      tempRequireIds = tempRequireIds.concat(temp);
    });
    let pools = await PoolGuardianAction.fetchOpenPools(tempRequireIds, type);

    // my borrow
    let totalOpens = new Map();
    if (type == 0 && account) {
      let contractAddress = getContractAddress();
      let ethcallProvider = await getMulticallProvider();
      const THContract = new Contract(contractAddress.TradingHub, THABI);
      const listCalls = [];

      listCalls.push(THContract.getPositionsByAccount(account, 1));
      listCalls.push(THContract.getPositionsByAccount(account, 2));
      listCalls.push(THContract.getPositionsByAccount(account, 3));
      let MyOpenPositions = await ethcallProvider.all(listCalls);

      let MyAllPositions = MyOpenPositions[0].concat(MyOpenPositions[1]).concat(MyOpenPositions[2]);
      let positions = await batchPositionsSimple(MyAllPositions, null);
      positions.map(item => {
        if (totalOpens.has(item.strToken)) {
          let sum = totalOpens.get(item.strToken).add(item.totalSize);
          totalOpens.set(item.strToken, sum);
        } else {
          totalOpens.set(item.strToken, item.totalSize);
        }
      });
    }

    let poolInfos = await formatPoolTime(pools, type, totalOpens);

    poolInfos.map(pool => {
      result.map(item => {
        item.forEach(poolId => {
          let id = Transfer.transBigNumber(poolId);
          if (pool.id === id) {
            let temp = poolMap.get(pool.tokenAddress) || [];
            temp = temp.concat(pool);
            poolMap.set(pool.tokenAddress, temp);
          }
        });
      });
    });

    return poolMap;
  }

  // myTokenList deposit:1 borrow:0
  function getMyTotalList(type, list) {
    let myTotal = [];
    if (list && !list.length) {
      return {
        fetchLoading: false,
        tokenList: [],
        type: 0,
      };
    } else if (list && list.length) {
      list.map(item => {
        myTotal.push({
          token_name: item.symbol,
          type: type,
          depositAmount: item.total_my_deposit,
          borrowAmount: item.total_my_borrow,
          totalDeposit: NP.times(item.total_my_deposit, item.price),
          totalBorrow: NP.times(item.total_my_borrow, item.price),
        });
      });
    }
    return fetchUserTokens(myTotal, type);
  }

  return {
    getMyTotalList,
    getPoolsByToken,
    getSubPoolNumber,
  };
}
