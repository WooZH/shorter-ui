export const DEFAULT_CHAIN_ID = 1;
export const DEFAULT_CHAIN_NAME = "mainnet";

const networkList = new Map([
  [
    "mainnet",
    {
      name: "mainnet",
      title: "Ethereum Mainnet",
      symbol: "ETH",
      abbr: "Ethereum",
      chainId: "0x1",
      networkId: 1,
      isSupported: true,
      logo: {
        name: "#icon-network-ethereum",
        color: "#5269FF",
      },
      isTestnet: false,
    },
  ],
  [
    "goerli",
    {
      name: "goerli",
      title: "Goerli Test Network",
      symbol: "ETH",
      abbr: "Goerli",
      chainId: "0x5",
      networkId: 5,
      isSupported: true,
      logo: {
        name: "#icon-network-goerli",
        color: "#3099f2",
      },
      isTestnet: true,
    },
  ],
  [
    "dev",
    {
      name: "dev",
      title: "dev Test Network",
      symbol: "ETH",
      abbr: "dev",
      chainId: "0x539",
      networkId: 1337,
      isSupported: true,
      logo: {
        name: "#icon-network-dev",
        color: "#f6c343",
      },
      isTestnet: true,
    },
  ],
  [
    "bsct",
    {
      name: "bsct",
      title: "BNB Test Network",
      symbol: "BNB",
      abbr: "bsct",
      chainId: "0x61",
      networkId: 97,
      isSupported: true,
      chainName: "BSC Testnet",
      nativeCurrency: {
        name: "tBNB",
        symbol: "tBNB",
        decimals: 18,
      },
      rpcUrls: ["https://data-seed-prebsc-1-s2.binance.org:8545/"],
      blockExplorerUrls: ["https://testnet.bscscan.com/"],
      logo: {
        name: "#icon-network-bsct",
        color: "#F4BB0E",
      },
      isTestnet: true,
    },
  ],
  [
    "bsc",
    {
      name: "bsc",
      title: "BNB Network",
      symbol: "BNB",
      abbr: "BNB Chain",
      chainId: "0x38",
      networkId: 56,
      isSupported: true,
      chainName: "BSC",
      nativeCurrency: {
        name: "BNB",
        symbol: "BNB",
        decimals: 18,
      },
      rpcUrls: ["https://bsc-dataseed2.binance.org/"],
      blockExplorerUrls: ["https://bscscan.com/"],
      logo: {
        name: "#icon-network-bnb",
        color: "#F4BB0E",
      },
      isTestnet: false,
    },
  ],
]);

export function getNetworks() {
  let resultList = [];

  if (process.env.VUE_APP_SUPPORT_NETWORK === "prod") {
    resultList.push(networkList.get("mainnet"));
    resultList.push(networkList.get("goerli"));
    resultList.push(networkList.get("bsc"));

    return resultList;
  }

  resultList = [...networkList.values()];
  return resultList;
}

export function getSupportNetworkNames() {
  const supportNames = getNetworks().map(n => n.name);
  return supportNames;
}

export function getSupportNetworkIds() {
  const supportIds = getNetworks()
    .map(n => n.networkId)
    .map(c => c.toString());
  return supportIds;
}

function getTestnetIds() {
  const testnetIds = [...networkList.values()].filter(n => n.isTestnet).map(n => String(n.networkId));
  return testnetIds;
}

export function isTestNetworkId(id) {
  return getTestnetIds().includes(id);
}

export function getNetworkNameById(id) {
  const networks = getNetworks();

  const parsedId = id.includes("0x") || id.includes("0X") ? parseInt(id, 16) : id;
  const conf = networks.find(n => String(n.networkId) === String(parsedId));
  return conf?.name || "";
}

export function getNetworkConfigByName(networkName) {
  const name = getNetworkNameByAlias(networkName);
  return networkList.get(name);
}

export function getNetworkConfigById(id) {
  const networkName = getNetworkNameById(id);
  return getNetworkConfigByName(networkName);
}

export function getNetworkNameByAlias(name) {
  if (name === "bnb") return "bsc";
  if (name === "eth") return "mainnet";
  return name;
}
