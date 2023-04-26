import { useWallet } from "@/hooks/useWallet";
import { updateAccount, updateChain } from "@/env/index";
import { Local } from "@/utils/localStorage";

const { wallet, setWalletType } = useWallet();

const metamaskType = "metamask";

export function isMetaMaskAvailable() {
  const { ethereum } = window;
  return Boolean(
    ethereum && ethereum.isMetaMask && ethereum._state && !ethereum.isOkxWallet && !ethereum.isBraveWallet,
  );
}

export function isMetaMaskLocked() {
  if (isMetaMaskAvailable()) {
    const { ethereum } = window;
    return !ethereum._state.isUnlocked;
  } else {
    return false;
  }
}

export async function requestMetamaskAccount() {
  if (!isMetaMaskAvailable()) {
    console.error("Metamask unavailable");
    return;
  }

  try {
    setWalletType(metamaskType);
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    await updateAccount(accounts[0]);
    startListenMetamask();
    Local.set("metamaskConnection", true);
  } catch (error) {
    if (error.code == -32002) {
      return;
    }
    console.warn("Please authorize to access your account");
  }
}

function connectFunc(info) {
  console.log(info, "metamask connect");
}
const handleConnect = _.throttle(connectFunc, 1000);

function disConnectFunc(disconnect) {
  console.log(disconnect, "metamask disconnect");
}
const handleDisconnect = _.throttle(disConnectFunc, 1000);

function startListenMetamask() {
  console.log("start listen metamask");
  const { ethereum } = window;

  ethereum.on("chainChanged", handleSwitchChain);
  ethereum.on("accountsChanged", handleNewAccount);
  ethereum.on("message", handelNewMessage);
  ethereum.on("connect", handleConnect);
  ethereum.on("disconnect", handleDisconnect);
}

export function stopListenMetamask() {
  console.log("stop listen metamask");
  const { ethereum } = window;
  if (!ethereum || wallet.type !== metamaskType) return;

  ethereum.removeListener("connect", handleConnect);
  ethereum.removeListener("chainChanged", handleSwitchChain);
  ethereum.removeListener("accountsChanged", handleNewAccount);
  ethereum.removeListener("message", handelNewMessage);
  ethereum.removeListener("disconnect", handleDisconnect);
}

function handleSwitchChain(chainId) {
  updateChain(chainId);
}

function handleNewAccount(account) {
  if (wallet.type === metamaskType) updateAccount(account[0]);
}

function handelNewMessage(msg) {
  console.log(msg, "handelNewMessage");
}
