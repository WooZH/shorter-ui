import { reactive } from "vue";

import { getTokenWhiteList } from "@/contract/shortBone";

let tokens = reactive({
  list: [],
  waiting: true,
  tokenWhiteList: [],
  localList: [],
});

// const sourceKeys = [
//   "https://www.gemini.com/uniswap/manifest.json", // Gemini Token List
//   "https://tokenlist.aave.eth.link", // Aave Token List
//   "https://defi.cmc.eth.link", // CMC Defi
//   "https://tokens.coingecko.com/uniswap/all.json", // CoinGecko
//   "https://gateway.pinata.cloud/ipfs/QmS3ZGK4wQbb82zEL9wYrxFYvq7rjT1fnah6JFcWYXJFxi", // ipi shorter- 97
//   "https://gateway.pinata.cloud/ipfs/QmWGmGWU3HTuU2fxDUhTdKkbRMqMavMhz1YN4LxdiweajT", // ipi shorter- 4
// ];

export function useTokens() {
  async function getTokenList() {
    try {
      tokens.waiting = true;
      tokens.list = [];
      tokens.list = await getTokenWhiteList();
      tokens.waiting = false;
      return tokens.list;
    } catch (error) {
      console.error("get Token WhiteList =>", error);
    }
  }

  return {
    tokens,
    getTokenList,
  };
}
