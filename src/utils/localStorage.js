import { getContractAddress } from "@/contract";

const INIT_STORAGE = {
  version: "1.4.1",
  bsc: {
    common: {
      customRpc: "",
      poolStats: {
        provider: {},
        providerTs: "",
        trader: {},
        traderTs: "",
      },
      token: {
        list: [],
        top: [],
      },
    },
    "0x": {
      totalEquity: {
        day7: [],
        day7Ts: "",
        day30: [],
        day30Ts: "",
      },
    },
  },
  bsct: {
    common: {
      customRpc: "",
      poolStats: {
        provider: {},
        providerTs: "",
        trader: {},
        traderTs: "",
      },
      token: {
        list: [],
        top: [],
      },
    },
    "0x": {
      totalEquity: {
        day7: [],
        day7Ts: "",
        day30: [],
        day30Ts: "",
      },
    },
  },
  goerli: {
    common: {
      customRpc: "",
      poolStats: {
        provider: {},
        providerTs: "",
        trader: {},
        traderTs: "",
      },
      token: {
        list: [],
        top: [],
      },
    },
    "0x": {
      totalEquity: {
        day7: [],
        day7Ts: "",
        day30: [],
        day30Ts: "",
      },
    },
  },
  dev: {
    common: {
      customRpc: "",
      poolStats: {
        provider: {},
        providerTs: "",
        trader: {},
        traderTs: "",
      },
      token: {
        list: [],
        top: [],
      },
    },
    "0x": {
      totalEquity: {
        day7: [],
        day7Ts: "",
        day30: [],
        day30Ts: "",
      },
    },
  },
  mainnet: {
    common: {
      customRpc: "",
      poolStats: {
        provider: {},
        providerTs: "",
        trader: {},
        traderTs: "",
      },
      token: {
        list: [],
        top: [],
      },
    },
    "0x": {
      totalEquity: {
        day7: [],
        day7Ts: "",
        day30: [],
        day30Ts: "",
      },
    },
  },
};

export const Local = {
  set(key, val) {
    window.localStorage.setItem(key, JSON.stringify(val));
  },

  get(key) {
    let json = window.localStorage.getItem(key);
    if (json === "undefined") json = "";
    return json ? JSON.parse(json) : null;
  },

  remove(key) {
    window.localStorage.removeItem(key);
    delete window.localStorage[key];
  },

  clear() {
    window.localStorage.clear();
  },
};

export async function initStorage() {
  const savedShorterStorage = Local.get("shorterStorage");
  if (!Local.get("shorterStorage")) {
    Local.set("shorterStorage", INIT_STORAGE);
  } else if (savedShorterStorage.version !== INIT_STORAGE.version) {
    Local.remove("shorterStorage");
    Local.set("shorterStorage", INIT_STORAGE);
  }
}

export async function removeWalletStorage() {
  Local.remove("walletconnect");
  Local.remove("metamaskConnection");
}

export function getTokenInfoByAddress(address) {
  const shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;

  const res = tokenList.find(t => t.address === address) || {};
  return res;
}

export function getTokenAddressByName(tokenName) {
  const shorterStorage = Local.get("shorterStorage");
  const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;

  const res = tokenList.find(item => item.symbol == tokenName);
  return res?.address || "";
}
