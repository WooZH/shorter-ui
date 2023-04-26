import { getRPCProvider } from "@/wallet/provider";

/**
 * @description: 获取当前块高度
 * @param {*}
 * @return {*}
 */
export async function getCurBlockNumber() {
  try {
    const etherProvider = getRPCProvider();
    const res = await etherProvider.getBlockNumber();
    window.blockNumber = res;
    return res;
  } catch (e) {
    console.error("get cur block num error =>", e);
  }
}

export async function getBlockInfo(blockNumber) {
  const etherProvider = getRPCProvider();
  const blockInfo = await etherProvider.getBlock(Number(blockNumber));
  return blockInfo;
}
