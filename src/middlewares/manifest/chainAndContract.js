import devContract from "@/middlewares/manifest/ethereum-dev/contractAddrs.json";
import devChainConfig from "@/middlewares/manifest/ethereum-dev/chainConfig.json";

import goerliContract from "@/middlewares/manifest/ethereum-goerli/contractAddrs.json";
import goerliChainConfig from "@/middlewares/manifest/ethereum-goerli/chainConfig.json";

import bsctContract from "@/middlewares/manifest/bnb-bsct/contractAddrs.json";
import bsctChainConfig from "@/middlewares/manifest/bnb-bsct/chainConfig.json";

import bscContract from "@/middlewares/manifest/bnb-bsc/contractAddrs.json";
import bscChainConfig from "@/middlewares/manifest/bnb-bsc/chainConfig.json";

import mainnetContract from "@/middlewares/manifest/ethereum-mainnet/contractAddrs.json";
import mainnetChainConfig from "@/middlewares/manifest/ethereum-mainnet/chainConfig.json";

const ConfigAndContractAddrOfChain = {
  1: Object.assign({}, mainnetChainConfig, mainnetContract),
  5: Object.assign({}, goerliChainConfig, goerliContract),
  1337: Object.assign({}, devChainConfig, devContract),
  97: Object.assign({}, bsctChainConfig, bsctContract),
  56: Object.assign({}, bscChainConfig, bscContract),
};

export function getChainAndContractConfig(chainId) {
  const chainAndContractConfig = ConfigAndContractAddrOfChain[chainId];
  return chainAndContractConfig || {};
}
