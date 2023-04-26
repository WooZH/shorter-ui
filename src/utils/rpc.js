import { ethers } from "ethers";

import { getChainAndContractConfig } from "@/middlewares/manifest/chainAndContract";
import { getNetworkNameById, getSupportNetworkIds } from "@/middlewares/manifest/network";
import { useWallet } from "@/hooks/useWallet";

import { Local } from "@/utils/localStorage";
import { getSignature } from "@/utils/url";

const { chain } = useWallet();

export function getCurrentRpc() {
  const chainId = chain.id || Local.get("currentChainId");
  return getRpcByChainId(chainId);
}

export function getRpcByChainId(id) {
  const networkName = getNetworkNameById(id);
  const shorterStorage = Local.get("shorterStorage");
  const customRpc = shorterStorage[networkName].common.customRpc;

  let rpc = customRpc;
  if (!rpc) {
    const chainConfig = getChainAndContractConfig(id);
    rpc = chainConfig.rpcURL;
  }

  return `${rpc}?signature=${getSignature()}`;
}

export async function getChainIdOfRpc(rpc) {
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const { chainId } = await provider.getNetwork();

  return chainId;
}

export function getRpcs() {
  const chainIds = getSupportNetworkIds();

  const rpc = {};
  for (const cId of chainIds) {
    rpc[cId] = getRpcByChainId(cId);
  }

  return rpc;
}
