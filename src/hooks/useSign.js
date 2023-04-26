import { useWallet } from "./useWallet";
import { handleRpcError } from "@/utils/handleError";
import { isMetaMaskAvailable } from "@/wallet/metamask";
import { getContractAddress } from "@/contract";

function getTimeStamp() {
  return Date.parse(new Date()) / 1000 + 20 * 60;
}

export async function signTypedData(amount = 10000) {
  let { account, chain } = useWallet();
  if (amount * 1 <= 0) {
    console.log("illegal amount is null");
    return;
  }

  if (!isMetaMaskAvailable()) {
    console.error("Metamask unavailable");
    return;
  }

  if (!account.value) {
    console.log("Invalid account");
    return;
  }

  const contractAddress = getContractAddress();

  const msgParams = {
    types: {
      EIP712Domain: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "version",
          type: "string",
        },
        {
          name: "chainId",
          type: "uint256",
        },
        {
          name: "verifyingContract",
          type: "address",
        },
      ],
      Permit: [
        {
          name: "owner",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "amount",
          type: "uint256",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "deadline",
          type: "uint256",
        },
      ],
    },
    primaryType: "Permit",
    domain: {
      name: "BNB Chain",
      version: "1",
      chainId: chain.id,
      verifyingContract: contractAddress.Committee,
    },
    message: {
      owner: account.value,
      spender: contractAddress.ShorterBone,
      nonce: 2,
      amount: amount * 10 ** 18,
      deadline: getTimeStamp(),
    },
  };

  try {
    const sign = await window.ethereum.request({
      method: "eth_signTypedData_v3",
      params: [account.value, JSON.stringify(msgParams)],
    });
    return {
      permitProposalFee: amount * 10 ** 18,
      sign: sign,
      deadline: msgParams.message.deadline,
    };
  } catch (err) {
    handleRpcError(err);
    return null;
  }

}
