import { ethers } from "ethers";
import { Provider, setMulticallAddress } from "ethers-multicall";
import WalletConnectProvider from "@walletconnect/web3-provider";

import { getContractAddress } from "@/contract";

import { getRpcs } from "@/utils/rpc";
import { Local } from "@/utils/localStorage";
import { getCurrentRpc } from "@/utils/rpc";

export async function getWeb3Provider() {
  const walletconnect = Local.get("walletconnect");

  if (walletconnect && walletconnect.connected) {
    const walletProvider = await getWalletProvider();
    const wcProvider = new ethers.providers.Web3Provider(walletProvider);
    return wcProvider;
  } else {
    return new ethers.providers.Web3Provider(window.ethereum, "any");
  }
}

/**
 * create a walletConnect provider for sign
 * @returns walletConnect provider
 */
async function getWalletProvider() {
  try {
    const rpc = getRpcs();
    const provider = new WalletConnectProvider({ rpc });
    await provider.enable();
    return provider;
  } catch (error) {
    console.error("get wallet provider error =>", error);
  }
}

export async function getMulticallProvider(address = null) {
  try {
    let contractAddress = address || getContractAddress();

    if (!contractAddress.rpcURL) {
      return;
    }
    if (!contractAddress.multicall) {
      return;
    }
    if (!contractAddress.chainId) {
      return;
    }

    const current_rpc = getCurrentRpc();
    const provider = new ethers.providers.StaticJsonRpcProvider(current_rpc, {
      chainId: contractAddress.chainId,
    });
    const ethcallProvider = new Provider(provider);
    setMulticallAddress(contractAddress.chainId, contractAddress.multicall);
    await ethcallProvider.init();
    return ethcallProvider;
  } catch (e) {
    console.log("getMulticallProvider failed");
  }
}

/**
 * @description: get a provider created by PRC(readonly)
 * @param {*}
 * @return {*}
 */
export function getRPCProvider() {
  let contractAddress = getContractAddress();
  let current_rpc = getCurrentRpc();

  const provider = new ethers.providers.StaticJsonRpcProvider(current_rpc, {
    chainId: contractAddress.chainId,
  });
  return provider;
}
