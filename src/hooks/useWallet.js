import { computed, reactive, watch } from "vue";
import * as CommitteeAction from "@/contract/committee";
import { Local } from "@/utils/localStorage";

const chain = reactive({
  id: "1",
});

const account = reactive({
  address: "",
  isRuler: "",
  value: "",
});

const wallet = reactive({
  visible: false,
  account: "",
  chain: "1",
  type: "",
  isConnected: computed(() => {
    return !!account.value;
  }),
  defaultChainId: 1,
});

watch(
  () => chain.id,
  (newId, oldId) => {
    if (oldId !== newId) {
      wallet.chain = newId;
    }
  },
);

watch(
  () => account.value,
  () => {
    if (account.value) {
      wallet.account = account.value;
    }
  },
);

export function useWallet() {
  async function setAccount(val) {
    if (!val) {
      account.value = "";
      account.isRuler = "";
      Local.remove("metamaskConnection");
      document.cookie = `user_wallet=`;
      return false;
    }

    account.value = val;
    const isRuler = await CommitteeAction.isRuler(val);
    if (_.isBoolean(isRuler)) {
      account.isRuler = isRuler;
    }

    return true;
  }

  function setChain(val) {
    try {
      if (val) {
        for (const key in val) {
          chain[key] = val[key];
        }
      } else {
        for (let key in chain) {
          delete chain[key];
        }
      }
    } catch (e) {
      console.log("set chain error", e);
    }
  }

  function setWalletType(type) {
    wallet.type = type || "";
  }

  function resetWalletState() {
    setAccount(null);
    setWalletType();
    wallet.visible = false;
  }

  return {
    wallet,
    chain,
    account,
    setAccount,
    setChain,
    setWalletType,
    resetWalletState,
  };
}
