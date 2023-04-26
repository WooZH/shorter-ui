import { reactive } from "vue";

import { useWallet } from "@/hooks/useWallet";

import { getContractAddress } from "@/contract";
import * as IpistrAction from "@/contract/ipistr";
import * as PriceAction from "@/contract/priceOracle";

const { account } = useWallet();

const balance = reactive({
  name: "ipistr",
  price: 0,
  decimals: 18,
  amount: 0,
});

export function useBalance() {
  async function fetchBalance() {
    try {
      if (!account.value) {
        balance.amount = 0;
      } else {
        let result = await IpistrAction.balanceOf(account.value);
        balance.amount = result;
      }
    } catch (error) {
      console.error(error, "fetchBalance");
    }
  }

  async function fetchIpiStrPrice() {
    let contractAddress = getContractAddress();
    if (!contractAddress?.IPISTR) return;

    try {
      let result = await PriceAction.getIPISTRPrice();
      balance.price = result.price;
    } catch (error) {
      console.log(error, "Price feeding machine error about: (ipistr)" + contractAddress.IPISTR);
    }
  }

  function resetBalance() {
    balance.amount = 0;
  }

  return {
    balance,
    resetBalance,
    fetchIpiStrPrice,
    fetchBalance,
  };
}
