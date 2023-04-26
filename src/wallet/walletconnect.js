import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";

import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";

import { updateWarningOfCurrentChain, updateAccount, updateChain } from "@/env/index";
import { Local } from "@/utils/localStorage";
import { resetWalletData } from "./wallet";

const walletConnectType = "walletconnect";
const { wallet, setWalletType } = useWallet();

let Connector = null;

export async function createWalletConnect() {
  console.log("connect to WalletConnect");

  const bridge = "https://bridge.walletconnect.org";
  Connector = new WalletConnect({
    bridge,
    qrcodeModal: QRCodeModal,
  });

  if (!Connector.connected) {
    await Connector.createSession();
    if (Local.get("metamaskConnection")) Local.remove("metamaskConnection");
  }

  setWalletType(walletConnectType);
  subscribeToEvents();

  if (Connector.connected) {
    const { chainId, accounts } = Connector;
    onSessionUpdate(accounts, chainId);
  }
}

function subscribeToEvents() {
  if (!Connector) {
    return;
  }

  Connector.on("connect", (error, payload) => {
    onWalletConnectConnect(payload, error);
  });

  Connector.on("session_update", async (error, payload) => {
    console.log(`connector.on("session_update")`, payload);
    const { chainId, accounts } = payload.params[0];
    onSessionUpdate(accounts, chainId, error);
  });

  Connector.on("disconnect", error => {
    onWalletConnectDisconnect(error);
    resetWalletData();
  });
}

async function onWalletConnectConnect(payload, error) {
  if (error) {
    console.error("wc connect error:", error);
  }

  console.log(`connector.on("connect")`);
  const { chainId, accounts } = payload.params[0];
  const address = accounts[0];
  Message.success("Connected with WalletConnect successfully!");

  await updateChain(chainId);
  await updateAccount(address);
  updateWarningOfCurrentChain(chainId);
  setWalletType(walletConnectType);
}

async function onSessionUpdate(accounts, chainId, error) {
  if (error) {
    console.error("wc session update error:", error);
    return;
  }

  const address = accounts[0];
  await updateChain(chainId);
  await updateAccount(address);
  updateWarningOfCurrentChain(chainId);
}

export function onWalletConnectDisconnect(error) {
  if (error) {
    console.error("wc disconnect error:", error);
    return;
  }

  if (!Connector || wallet.type !== walletConnectType) return;

  console.log("walletconnect disconnect");
  Message.warning("WalletConnect disconnected");

  Connector?.killSession();
  Connector = null;
}
