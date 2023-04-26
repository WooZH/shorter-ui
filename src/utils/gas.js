import NP from "number-precision";
import { Local } from "./localStorage";

import { useWallet } from "@/hooks/useWallet";


export function getGasPrice() {
  const gasLevel = sessionStorage.getItem("shorter_gasLevel");
  const gasPrice = sessionStorage.getItem("shorter_gasPrice");

  let price = 0;
  switch (gasLevel) {
    case "1":
      price = gasPrice * 1.15;
      break;
    case "2":
      price = gasPrice * 1;
      break;
    case "3":
      price = gasPrice * 0.85;
      break;

    default:
      break;
  }

  return Math.floor(price);
}

export function increaseGasLimit(estimatedGasLimit) {
  return estimatedGasLimit.mul(130).div(100);
}

export async function getGasParams(contract, txGasFuncName, ...funcParams) {
  const { account } = useWallet();

  try {
    const maxFeePerGas = getGasPrice();
    const estimateGas = await contract.estimateGas[txGasFuncName](...funcParams, {
      from: account.value,
    });
    const gasLimit = increaseGasLimit(estimateGas);
    const maxPriorityFeePerGas = Math.ceil(NP.times(maxFeePerGas, 0.05));
    const chainId = Local.get("currentChainId");

    let gasParams = {
      maxFeePerGas,
      gasLimit,
      maxPriorityFeePerGas,
    };

    if (chainId === "56" || chainId === "97") {
      gasParams = {
        gasPrice: maxFeePerGas,
        gasLimit,
      };
    }

    if (chainId === "5") {
      gasParams = {
        maxFeePerGas,
        gasLimit,
        maxPriorityFeePerGas: 1,
      };
    }

    console.log("gasParams:", gasParams);
    return gasParams;
  } catch (e) {
    console.log("calc gas error:", e);
    return {};
  }
}
