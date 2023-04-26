import { reactive, watch } from "vue";
import { useWallet } from "./useWallet";

const { wallet } = useWallet();


const dialogsVisible = reactive({
  transaction: false,
  rpcNotice: false,
});

watch(
  () => dialogsVisible.rpcNotice,
  val => {
    if (val) {
      counter += 1;
    }
  },
);


let counter = 0;

watch(
  () => {
    return wallet.isConnected;
  },
  () => {
    counter = 0;
  },
);

export function useDialog() {
  function showRPCNotice() {
    if (counter === 0) dialogsVisible.rpcNotice = true;
  }

  return {
    showRPCNotice,
    dialogsVisible,
  };
}
