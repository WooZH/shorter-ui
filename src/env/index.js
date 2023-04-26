import { ethers } from "ethers";

import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { useOverview } from "@/hooks/useOverview";
import { Warning } from "@/hooks/useWarning";

import { isMetaMaskAvailable, requestMetamaskAccount } from "@/wallet/metamask";
import { createWalletConnect } from "@/wallet/walletconnect";

import { getChainAndContractConfig } from "@/middlewares/manifest/chainAndContract";
import { getNetworkConfigByName, getSupportNetworkIds, DEFAULT_CHAIN_ID } from "@/middlewares/manifest/network";

import { Local, initStorage } from "@/utils/localStorage";
import { getUrlParams } from "@/utils/url";
import { getChainId, switchNetworkAction } from "@/wallet/wallet";

const { setAccount, setChain, wallet, setWalletType, chain } = useWallet();
const { fetchBalance } = useBalance();
const { setOwner } = useOverview();

/**
 * @description: DAPP核心执行函数
 * @param {*}
 * @return {*}
 */
export async function checkEnv() {
  try {
    initStorage();

    const isWalletConnect = Local.get("walletconnect");
    const isMetaMaskConnection = Local.get("metamaskConnection");

    if (!isMetaMaskConnection && !isWalletConnect) {
      await initNetwork();
      setTimeout(() => {
        const hasDisconnect = Local.get("disconnect");
        if (!hasDisconnect) wallet.visible = true;
      }, 500);
      return;
    }

    if (isWalletConnect) {
      await createWalletConnect();
      await initNetwork();
    } else if (isMetaMaskAvailable()) {
      Local.set("isMetamaskInstalled", true);
      await initNetwork();
      requestMetamaskAccount();
    } else {
      updateAccount(null);
      setWalletType(null);
      return;
    }
  } catch (error) {
    console.log(error, "checkEnv");
  }
}

async function initNetwork() {
  const urlChain = getUrlParams("chain");
  const urlChainId = getNetworkConfigByName(urlChain)?.networkId;
  const storageChainId = Local.get("currentChainId");
  const chainIdFromWallet = await getChainId();

  if (!chainIdFromWallet) {
    updateChain(urlChainId || storageChainId || DEFAULT_CHAIN_ID);
    return;
  }

  if (urlChain) {
    const isSupported = isSupportedChain(urlChainId);
    const isSameUrlAndWalletChain = urlChainId && Number(urlChainId) === Number(chainIdFromWallet);

    if (!isSupported) {
      window.location.replace(location.origin + "/404");
      updateChain(chainIdFromWallet);
      return;
    }

    if (isSameUrlAndWalletChain) {
      updateChain(urlChain);
      return;
    }

    if (!isSameUrlAndWalletChain) {
      updateChain(urlChainId);
      updateWarningOfCurrentChain(Number(chainIdFromWallet));
      switchNetworkAction(urlChainId);
      return;
    }
  }

  if (storageChainId) {
    updateChain(storageChainId);
    return;
  }

  updateChain(chainIdFromWallet);
}

export async function updateChain(chainId) {
  console.log("updateChain", chainId);
  chainId = Number(chainId).toString(10); // '0x4' => '4'
  Local.set("currentChainId", chainId);

  if (!chainId) {
    setChain(null);
    return;
  }

  if (isSupportedChain(chainId)) {
    const chainName = getChainAndContractConfig(chainId).name;
    setChain({ name: chainName, id: chainId });

    let url = new URL(window.location.href);
    setTimeout(() => {
      history.pushState({}, null, url.pathname);
    }, 500);
  }

  setTimeout(async () => {
    await updateWarningOfCurrentChain(chainId);
  }, 500);
}

export async function updateAccount(account) {
  if (account) {
    let newAccount = transLegalAddress(account);
    setOwner(newAccount);
    document.cookie = `user_wallet=${newAccount}`;
    const res = await setAccount(newAccount);
    if (res) {
      fetchBalance();
    }
  } else {
    setOwner();
    setAccount(null);
    setWalletType();
  }
}

/**
 * @description:  fix address lowercase letters
 * @param {*} address
 * @return {*}
 */
export function transLegalAddress(address) {
  const account = ethers.utils.getAddress(address);
  return account;
}

/**
 * @description:  refresh contract config
 * @param {*} id
 * @return {*}
 */
export async function updateWarningOfCurrentChain(chainId) {
  if (!isSupportedChain(chainId)) {
    const chainName = getChainAndContractConfig(chain.id).networkName;
    Warning(`You're viewing data from the ${chainName} network, but your wallet is connected to an unsupported chain.`);
  } else {
    Warning.close();
    return;
  }
}

export function isSupportedChain(id) {
  const currentId = Number(id).toString(10) || 0;
  const supportNetworkIds = getSupportNetworkIds();
  return supportNetworkIds.includes(currentId);
}
