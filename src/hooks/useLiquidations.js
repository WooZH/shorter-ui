import { Contract } from "ethers-multicall";

import { getContractAddress } from "@/contract";
import StrPoolABI from "@/abis/StrPool.json";
import TradingHubABI from "@/abis/TradingHub.json";

import { getMulticallProvider  } from "@/wallet/provider";

import * as Transfer from "@/utils/transfer";

async function getFinishedLiquidationsInfo(hashList) {
  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const THContract = new Contract(contractAddress.TradingHub, TradingHubABI);
  let callList = [];
  hashList.forEach(hash => {
    callList.push(THContract.positionInfoMap(hash));
  });
  const strTokenList = await ethcallProvider.all(callList);
  callList = [];
  strTokenList.forEach((item, index) => {
    const SPContract = new Contract(item.strToken, StrPoolABI);
    callList.push(SPContract.getMetaInfo());
    callList.push(THContract.positionBlocks(hashList[index]));
  });

  const positionList = await ethcallProvider.all(callList);
  for (let i = 0; i < positionList.length / 2; i++) {
    const zIndex = i * 2;
    const positionBlocks = positionList[zIndex + 1];
    const positionItem = {
      openBlock: Transfer.transBigNumber(positionBlocks.openBlock) * 1,
      closingBlock: Transfer.transBigNumber(positionBlocks.closingBlock) * 1,
      overdrawnBlock: Transfer.transBigNumber(positionBlocks.overdrawnBlock) * 1,
      closedBlock: Transfer.transBigNumber(positionBlocks.closedBlock) * 1,
    };
  }

  return;
}

export function useLiquidations() {
  return {
    getFinishedLiquidationsInfo,
  };
}
