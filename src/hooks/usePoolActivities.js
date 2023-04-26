import { utils } from "ethers";
import { Contract } from "ethers-multicall";

import { getContractAddress } from "@/contract";
import poolABI from "@/abis/PoolGuardian.json";
import { getAllPools } from "@/contract/poolGuardian";
import strPoolABI from "@/abis/StrPool.json";

import { getMulticallProvider, getRPCProvider } from "@/wallet/provider";
import * as Transfer from "@/utils/transfer";
import { Local } from "@/utils/localStorage";

const getStrTokenPoolContract = _.memoize(strToken => {
  return new Contract(strToken, strPoolABI);
});

export function usePoolActivities() {
  const provider = getRPCProvider();

  const abiCoder = utils.defaultAbiCoder;
  const iface = new utils.Interface([
    "event Deposit(address,uint256,uint256)",
    "event Withdraw(address,uint256,uint256)",
    "event PositionOpened(uint256,address,address,uint256)",
    "event PositionIncreased(uint256,address,address,uint256)",
    "event PositionDecreased(uint256,address,address,uint256)",
  ]);

  const POOL_DEPOSIT_SIGNATURE = iface.encodeFilterTopics("Deposit", [])[0];
  const POOL_WITHDRAW_SIGNATURE = iface.encodeFilterTopics("Withdraw", [])[0];
  const POSITION_OPENED_SIGNATURE = iface.encodeFilterTopics("PositionOpened", [])[0];
  const POSITION_INCREASED_SIGNATURE = iface.encodeFilterTopics("PositionIncreased", [])[0];
  const POSITION_DECREASED_SIGNATURE = iface.encodeFilterTopics("PositionDecreased", [])[0];

  const operationMap = new Map();
  operationMap.set(POOL_DEPOSIT_SIGNATURE, "Deposit");
  operationMap.set(POOL_WITHDRAW_SIGNATURE, "Withdraw");
  operationMap.set(POSITION_OPENED_SIGNATURE, "Open");
  operationMap.set(POSITION_INCREASED_SIGNATURE, "Borrow");
  operationMap.set(POSITION_DECREASED_SIGNATURE, "Repay");

  const poolMap = new Map();
  const poolTokenAndIdMap = new Map();

  async function getPoolActivities(account) {
    const { sessionPool, checkPoint } = getActivitiesStorage(account);

    const historicalPools = await getHistoricalPools();

    // 对获取到的blocks进行排序保存
    let strTokenList = [];
    let startList = [];
    let endList = [];

    poolTokenAndIdMap.clear();
    historicalPools.forEach(poolItem => {
      strTokenList.push(poolItem.strToken);
      startList.push(poolItem.fromBlock);
      endList.push(poolItem.toBlock);

      poolMap.set(poolItem.poolId, poolItem);
      poolTokenAndIdMap.set(poolItem.strToken.toLowerCase(), poolItem.poolId);
    });
    startList = startList.sort(compareFunc);
    endList = endList.sort(compareFunc);

    const fromBlock = checkPoint ? checkPoint : startList[startList.length - 1];
    const currentBlock = window.blockNumber;
    const lastBlock = endList[0];
    const toBlock = currentBlock * 1 < lastBlock * 1 ? currentBlock : lastBlock;
    console.log(fromBlock, toBlock);

    const logsPool = await poolOperate(strTokenList, fromBlock, toBlock, account);
    const logsPosition = await positionOperate(fromBlock, toBlock, account);

    const result = logsPosition
      .concat(logsPool)
      .sort(compareBlock)
      .map(item => ({
        ...item,
        ...poolMap.get(item.poolId),
      }))
      .concat(sessionPool || []);

    setActivitiesStorage(result, toBlock, account);

    console.log("my pool activities:", result);
    return result;
  }

  async function poolOperate(strTokens, fromBlock, toBlock, account) {
    console.log("pool operate", fromBlock, toBlock);

    const accountFilter = utils.defaultAbiCoder.encode(["address"], [account]);
    const topics = [[POOL_DEPOSIT_SIGNATURE, POOL_WITHDRAW_SIGNATURE], accountFilter];

    const logs = await getLogs(strTokens, topics, fromBlock, toBlock);
    const depositLog = await Promise.all(
      logs.map(async logItem => {
        const params = await decodeParams(logItem.topics, logItem.data, logItem.blockNumber);
        const address = logItem.address.toLowerCase();

        return {
          poolId: poolTokenAndIdMap.get(address),
          user: params.user,
          operation: params.operation,
          amount: params.amount,
          blockNumber: logItem.blockNumber,
          txHash: logItem.transactionHash,
        };
      }),
    );

    return depositLog;
  }

  async function positionOperate(fromBlock, toBlock, account) {
    const address = getContractAddress().TradingHub;
    const accountFilter = abiCoder.encode(["address"], [account]);
    const topics = [
      [POSITION_OPENED_SIGNATURE, POSITION_INCREASED_SIGNATURE, POSITION_DECREASED_SIGNATURE],
      null,
      accountFilter,
    ];

    const logs = await getLogs(address, topics, fromBlock, toBlock);
    const positionLog = Promise.all(
      logs.map(async logItem => {
        const params = await decodeParamsPosition(logItem.topics, logItem.data, logItem.blockNumber);
        return {
          ...params,
          txHash: logItem.transactionHash,
        };
      }),
    );
    return positionLog;
  }

  async function getHistoricalPools() {
    const ethcallProvider = await getMulticallProvider();
    const contractAddress = getContractAddress();

    const ids = await getAllPools();
    const poolContract = new Contract(contractAddress.PoolGuardian, poolABI);
    const idCalls = ids.map(poolId => poolContract.getPoolInfo(poolId));
    const poolBaseInfoList = await ethcallProvider.all(idCalls);

    const poolListCalls = poolBaseInfoList.map(item => {
      const strPoolContract = getStrTokenPoolContract(item.strToken);
      return strPoolContract.getMetaInfo();
    });
    const poolInfoSimple = await ethcallProvider.all(poolListCalls);

    const poolList = poolBaseInfoList.map((poolItem, index) => {
      const poolInfo = poolInfoSimple[index];
      return {
        poolId: ids[index],
        strToken: poolItem.strToken,
        leverage: Transfer.transBigNumber(poolInfo.leverage_),
        stakedToken: poolItem.stakedToken,
        decimals: Transfer.transBigNumber(poolInfo.stakedTokenDecimals_),
        fromBlock: Number(Transfer.transBigNumber(poolInfo.startBlock_)),
        toBlock: Number(Transfer.transBigNumber(poolInfo.endBlock_)),
      };
    });

    return poolList;
  }

  function compareFunc(a, b) {
    if (a > b) {
      return -1;
    }
    if (a < b) {
      return 1;
    }
    return 0;
  }

  function compareBlock(a, b) {
    if (a.blockNumber > b.blockNumber) {
      return -1;
    }
    if (a.blockNumber < b.blockNumber) {
      return 1;
    }
    return 0;
  }

  async function decodeParams(topics, data, blockNumber) {
    let user = abiCoder.decode(["address"], topics[1])[0];
    let operation = topics[0];
    let amount = abiCoder.decode(["uint256"], data)[0];

    return {
      user: user,
      blockNumber,
      operation: operationMap.get(operation),
      amount: amount,
    };
  }

  async function decodeParamsPosition(topics, data, blockNumber) {
    let user = abiCoder.decode(["address"], topics[2])[0];
    let poolId = abiCoder.decode(["uint256"], topics[1])[0];
    let operation = topics[0];
    let amount = abiCoder.decode(["uint256"], data)[0];

    return {
      poolId: poolId.toString(),
      user: user,
      operation: operationMap.get(operation),
      amount: amount,
      blockNumber,
    };
  }

  async function getLogs(address, topics, fromBlock, toBlock) {
    const range = 4000;

    let block = fromBlock;
    const counts = (toBlock - fromBlock) / range;
    const logPromises = [];

    for (let i = 0; i < counts + 1; i++) {
      const isMaxThanEnd = block + range > toBlock;

      const payload = [
        {
          address,
          topics,
          fromBlock: `0x${block.toString(16)}`,
          toBlock: isMaxThanEnd ? `0x${toBlock.toString(16)}` : `0x${(block + range - 1).toString(16)}`,
        },
      ];

      const logItemPromise = provider.send("eth_getLogs", payload);
      logPromises.push(logItemPromise);

      if (isMaxThanEnd) {
        break;
      } else {
        block = block + range;
      }
    }

    const logs = await Promise.all(logPromises);
    const result = [];
    logs.forEach(log => {
      if (log && log.length) {
        result.push(...log);
      }
    });

    return result;
  }

  const poolActivitiesStorageVersion = "1.0";

  function getActivitiesStorage(account) {
    const networkName = getContractAddress().networkName;
    const localPoolActivitiesStorageVersion = Local.get(`myPoolActivities_${account}_${networkName}_version`);
    const storageEnable = localPoolActivitiesStorageVersion === poolActivitiesStorageVersion;

    let sessionPool = [];
    let checkPoint = null;
    if (storageEnable) {
      sessionPool = Local.get(`myPoolActivities_${account}_${networkName}`);
      checkPoint = Local.get(`myPoolActivities_ts_${account}_${networkName}`);
    } else {
      Local.remove;
    }

    return { sessionPool, checkPoint };
  }

  function setActivitiesStorage(pools, endBlock, account) {
    const networkName = getContractAddress().networkName;

    Local.set(`myPoolActivities_${account}_${networkName}`, pools);
    Local.set(`myPoolActivities_ts_${account}_${networkName}`, endBlock || "");
    Local.set(`myPoolActivities_${account}_${networkName}_version`, poolActivitiesStorageVersion);
  }

  return {
    getPoolActivities,
  };
}
