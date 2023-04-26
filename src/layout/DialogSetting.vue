<template>
  <div class="setting">
    <h4 class="title strong">Settings</h4>
    <div class="subtitle">
      <div class="title-group">
        <label>
          RPC Endpoint
          <span v-show="currentChainName" class="current-chain">[{{ currentChainName }}]</span>
        </label>
        <!-- Rpc Tutorial -->
        <a href="https://docs.shorter.finance/faqs/rpc-issues.html" target="_blank" class="link tutorial">
          <span>Tutorial →</span>
        </a>
      </div>
      <di>
        <div v-show="!hasCustomRpc" class="rpc-input-group">
          <input v-model="state.rpc" placeholder="https://" type="text" class="rpc-input" />
          <shorterButton :loading="state.loading" class="rpc-btn" primary @click="saveRpc">Save</shorterButton>
        </div>
        <div v-show="hasCustomRpc" class="rpc-input-group">
          <p class="saved-rpc">{{ state.rpc }}</p>
          <button class="rpc-btn" @click="remove">Remove</button>
        </div>
        <div class="warn">
          <p v-show="state.showWarnChain">{{ warnChain }}</p>
          <p v-show="state.showWarnRpc">{{ warnRpcUrl }}</p>
        </div>
      </di>
    </div>
    <ul class="options">
      <li class="option-item">
        <label>Time Zone</label>
        <v-select
          v-model="state.timeZone"
          :searchable="false"
          :components="{ 'open-indicator': `<open-indicator>2</open-indicator>` }"
          label="text"
          :reduce="item => item.value"
          :options="tzList"
        />
      </li>
      <li class="option-item">
        <label>Currency</label>
        <v-select v-model="state.currency" :searchable="false" label="text" :options="['USD', 'GBP', 'HKD']" />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive } from "vue";

import { getContractAddress } from "@/contract";
import { getChainIdOfRpc } from "@/utils/rpc";

import { useTimezone } from "@/hooks/useTimezone";
import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";
import { Local } from "@/utils/localStorage";

const { chain } = useWallet();
const { tz, tzList } = useTimezone();
const state = reactive({
  timeZone: computed({
    get: () => tz.value,
    set: val => {
      tz.value = val;
    },
  }),
  currency: "USD",
  rpc: "",
  showWarnChain: false,
  showWarnRpc: false,
  loading: false,
});
const warnRpcUrl = "Invalid endpoint URL";
const warnChain = computed(() => {
  return `The only accceptable chain id is ${chain.id}`;
});

const currentChainName = computed(() => {
  const chainIdNameMap = new Map(
    Object.entries({
      1: "Ethereum",
      5: "Goerli",
      56: "BNB Chain",
      97: "BNB test",
    }),
  );
  return chainIdNameMap.get(chain.id);
});

const hasCustomRpc = computed(() => {
  const shorterStorage = Local.get("shorterStorage");
  const customRpc = shorterStorage[getContractAddress().networkName].common.customRpc;
  return customRpc !== "" && state.rpc;
});
async function saveRpc() {
  state.showWarnChain = false;
  state.showWarnRpc = false;
  const reg = new RegExp("(https?|ftp|file)://[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]");

  if (reg.test(state.rpc) || state.rpc === "") {
    if (state.rpc === "") {
      return;
    }
    state.loading = true;
    const chainIdFromRpc = await getChainIdOfRpc(state.rpc);
    state.loading = false;
    if (chainIdFromRpc != chain.id) {
      state.showWarnChain = true;
    } else {
      storeRpc();
    }
  } else {
    // check chainid
    state.showWarnRpc = true;
    // Message.warning("Invalid endpoint URL.");
  }
}

function storeRpc() {
  let shorterStorage = Local.get("shorterStorage");
  shorterStorage[getContractAddress().networkName].common.customRpc = state.rpc;
  Local.set("shorterStorage", shorterStorage);
  Message.success("RPC endpoint was saved.");
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

function remove() {
  state.rpc = "";
  let shorterStorage = Local.get("shorterStorage");
  shorterStorage[getContractAddress().networkName].common.customRpc = state.rpc;
  Local.set("shorterStorage", shorterStorage);
}
onMounted(() => {
  let shorterStorage = Local.get("shorterStorage");
  state.rpc = shorterStorage[getContractAddress().networkName].common.customRpc;
});
function setTimezone(v) {
  console.log("set", v);
}
</script>

<style lang="scss" scoped>
.setting {
  font-family: Haas Grot Text;
  padding: 32px;
}

.title {
  font-size: 18px;
  color: #11142d;
}

.options {
  margin-top: 48px;

  .option-item {
    &:not(&:first-child) {
      margin-top: 32px;
    }

    label {
      display: block;
      font-family: $caption;
      // font-weight: 600;
      color: #a4a5b2;
      margin-bottom: 16px;
    }
  }
}

.subtitle {
  label {
    display: block;
    font-family: $caption;
    // font-weight: 600;
    color: #a4a5b2;
  }
}

.rpc-input {
  width: 100%;
  padding: 0 23px;
  background-color: rgb(248, 248, 248);
  border: 0;
  border-radius: 16px;
  height: 54px;
}

.rpc-input-group {
  display: flex;
  align-items: center;
}
.saved-rpc {
  width: 100%;
  padding-right: 32px;
}
.rpc-input-group {
  .rpc-btn {
    cursor: pointer;
    height: 54px;
    margin-left: 12px;
    min-width: 100px;
    border-radius: 16px;
    color: #ffffff;
    border: 0;
    font-size: 14px;
    background-color: rgb(239, 127, 69);

    &:hover {
      background-color: #ea632c;
    }
  }
}

.title-group {
  margin-top: 32px;
  margin-bottom: 16px;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tutorial {
  // font-weight: 600;
  font-size: 14px;
  color: #909399;
  cursor: pointer;

  &:hover {
    color: #ef7f45;
  }
}
.current-chain {
  margin-left: 8px;
  color: #909399;
}
.warn {
  padding: 12px 24px;
  font-size: 12px;
  font-family: "Haas Grot Text";
  color: #ff6461;
  line-height: 16px;
}
</style>
