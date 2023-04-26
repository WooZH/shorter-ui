import { ethers } from "ethers";
import md5 from "blueimp-md5";

import { getChainAndContractConfig } from "@/middlewares/manifest/chainAndContract";
import { getWeb3Provider, getRPCProvider } from "@/wallet/provider";
import { useWallet } from "@/hooks/useWallet";

import { handleRpcError } from "@/utils/handleError";
import { getCurrentRpc } from "@/utils/rpc";
import { getCurBlockNumber } from "@/utils/block";
import { Local } from "@/utils/localStorage";

const { account, chain } = useWallet();

const { fetch: originalFetch } = window;

// TODO
// stash promises
const pendingPromises = new Map();

window.fetch = async (...args) => {
  const controller = new AbortController();
  const signal = controller.signal;
  let [resource, config] = args;

  if (resource.includes("walletconnect")) {
    const response = await originalFetch(resource, config);
    return response;
  }
  // forbid ethers.js eth_blockNumber
  let jsonStr = String.fromCharCode(...config.body);
  const json_body = JSON.parse(jsonStr);

  // TODO: start
  // TODO: set promise
  // ? promise abort功能完善
  // * 待完善, 暂时隐藏
  // const md5key = md5(jsonStr);
  // if (pendingPromises.has(md5key)) {
  //   const pendingItem = pendingPromises.get(md5key);
  //   pendingItem.abort();
  //   pendingPromises.delete(md5key);
  // } else {
  //   pendingPromises.set(md5key, controller);
  // }
  // TODO: end

  config.credentials = "same-origin";

  const response = await originalFetch(resource, config, { signal });
  if (response) {
    const { status } = response;
    // TODO: 调用成功后,删除存入的promise
    // if (status === 200) {
    //   pendingPromises.delete(md5key);
    // }
    if (status === 429) {
      handleRpcError({ code: "TOO_MANY_REQUEST" });
    }
  }

  return response;
};

/**
 * @description: 基于ether.js返回的合约对象(用于区分只读和读写权限)
 * @param {*} tokenJson ABI文件
 * @param {*} contractAddress 合约地址
 * @param {*} isSign 是否对provider签名
 * @return {*}
 */
export async function outContract(tokenJson, address, isSign = false) {
  try {
    if (isSign && account.value) {
      const ethersProvider = await getWeb3Provider();
      const Contract = new ethers.Contract(address, tokenJson, ethersProvider.getSigner());
      return Contract;
    } else {
      return createReadOnlyContract(tokenJson, address);
    }
  } catch (e) {
    console.log("new contract error", e);
  }
}

/**
 * create a readOnly contract without signer
 * @param {abi file} tokenJson
 * @param {String} address contract address
 * @returns
 */
function createReadOnlyContract(tokenJson, address) {
  let current_rpc = getCurrentRpc();

  const ethersProvider = new ethers.providers.StaticJsonRpcProvider(current_rpc, {
    chainId: getContractAddress().chainId,
  });

  const Contract = new ethers.Contract(address, tokenJson, ethersProvider);
  return Contract;
}

/**
 * @description: 根据链ID直接获取合约配置
 * @param {*}
 * @return {*}
 */
export function getContractAddress() {
  const chainId = chain.id || Local.get("currentChainId") || DEFAULT_CHAIN_ID;

  const contractAddress = getChainAndContractConfig(chainId);
  return contractAddress;
}

/**
 * @description: 监听链高度
 * @param {*}
 * @return {*}
 */
export function fetchBlockOnLine() {
  try {
    const provider = getRPCProvider();
    provider.on("block", blockNumber => {
      window.blockNumber = blockNumber;
      console.log(blockNumber, "Block change");
    });
  } catch (error) {
    console.log(error, "fetchBlockOnLine");
  }
}

export function getContractBlockSpeed() {
  const contractAddress = getContractAddress();
  return contractAddress.blockSpeed;
}

// when duration exceed maximum block range
export async function commonGetLogs(filter) {
  const MAX_BLOCKS_DISTANCE = getContractAddress()?.maxBlockRange;
  let provider = getRPCProvider();

  let { fromBlock, toBlock, topics, address } = filter;
  if (toBlock === "latest") {
    toBlock = await getCurBlockNumber();
  }
  const distance = toBlock - fromBlock;

  if (distance > MAX_BLOCKS_DISTANCE) {
    let n = Math.floor(distance / MAX_BLOCKS_DISTANCE) + 1;
    const filters = [];
    for (let i = 0, sum = 0; i < n; i++) {
      if (i < n - 1) {
        filters.push({
          fromBlock: fromBlock + i * MAX_BLOCKS_DISTANCE + sum,
          toBlock: fromBlock + (i + 1) * MAX_BLOCKS_DISTANCE + sum,
          topics,
          address,
        });
      } else {
        filters.push({
          fromBlock: fromBlock + i * MAX_BLOCKS_DISTANCE + sum,
          toBlock,
          topics,
          address,
        });
      }
      sum += 1;
    }

    let logResults = [];
    await Promise.all(
      filters.map(async filterItem => {
        const res = await provider.getLogs(filterItem);
        logResults = [...res, ...logResults];
      }),
    );

    return logResults;
  } else {
    const logResults = (await provider.getLogs(filter)) || [];
    return logResults;
  }
}
