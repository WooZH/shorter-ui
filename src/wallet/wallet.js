import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";
import { Local, removeWalletStorage } from "@/utils/localStorage";

import { getNetworkConfigById } from "@/middlewares/manifest/network";
import { isSupportedChain, updateChain } from "@/env/index";

import { onWalletConnectDisconnect } from "@/wallet/walletconnect";
import { isMetaMaskAvailable, stopListenMetamask } from "./metamask";
import { getWeb3Provider } from "./provider";

const { account, resetWalletState } = useWallet();

export async function switchNetwork(id) {
  if (!isMetaMaskAvailable() && !Local.get("walletconnect")) {
    updateChain(id);
    return;
  }

  if (!account.value) {
    updateChain(id);
    return;
  }

  if (!isSupportedChain(id)) {
    Message.warning("Unsupported chain");
    return;
  }

  try {
    await switchNetworkAction(id);
    updateChain(id);
  } catch (e) {
    console.log(e);
  }
}

export async function getChainId() {
  try {
    const payload = {
      method: "eth_chainId",
    };

    const chainId = await walletRequest(payload);
    return chainId;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function switchNetworkAction(chainId) {
  const hexChainId = Number(chainId).toString(16);

  try {
    const payload = {
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${hexChainId}` }],
    };

    await walletRequest(payload);
  } catch (error) {
    if (error.code && error.code !== 4001) {
      addNetworkToWallet(chainId);
    } else {
      console.log("wallet request", error);
      throw error;
    }
  }
}

export async function addNetworkToWallet(chainId) {
  const tenChainId = Number(chainId).toString();
  const networkConf = getNetworkConfigById(tenChainId);

  const payload = {
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: networkConf.chainId, // A 0x-prefixed hexadecimal string
        chainName: networkConf.chainName,
        nativeCurrency: {
          name: networkConf.nativeCurrency?.name,
          symbol: networkConf.nativeCurrency?.symbol, // 2-6 characters long
          decimals: 18,
        },
        rpcUrls: networkConf.rpcUrls,
        blockExplorerUrls: networkConf.blockExplorerUrls,
        iconUrls: [],
      },
    ],
  };

  try {
    await walletRequest(payload);
  } catch (e) {
    console.log("add network error", e);
  }
}

export async function walletRequest(payload) {
  const isWalletconnect = Local.get("walletconnect");
  const isMetamaskVaild = isMetaMaskAvailable();
  const isMetaMaskConnection = Local.get("metamaskConnection");

  if (isWalletconnect || (isMetamaskVaild && isMetaMaskConnection)) {
    const provider = await getWeb3Provider();
    const res = await provider.send(payload.method, payload.params);
    return res;
  } else {
    console.error("no wallet for request");
  }
}

function listenerDisconnect() {
  window.addEventListener("storage", ({ key }) => {
    if (key === "disconnect") {
      disconnectWallet();
    }
  });
}

listenerDisconnect();

export function disconnectWallet() {
  onWalletConnectDisconnect();
  stopListenMetamask();

  resetWalletData();
  Local.set("disconnect", Date.now());
}

export function resetWalletData() {
  removeWalletStorage();
  resetWalletState();
}
