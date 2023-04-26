<template>
  <Layout title="Pools">
    <div class="tabs-container">
      <ul class="tabs">
        <li class="tab-item-container" :class="{ active: $route.name === 'Provider' }" @click="onChangeTab('Provider')">
          <div class="tab-item">
            <div class="header">I’m a</div>
            <div>Provider</div>
          </div>
        </li>
        <li class="tab-item-container" :class="{ active: $route.name === 'Trader' }" @click="onChangeTab('Trader')">
          <div class="tab-item">
            <div class="header">I’m a</div>
            <div>Trader</div>
          </div>
        </li>
      </ul>
    </div>
    <router-view
      :pools="pools"
      :total="poolTotal"
      :tokens="pools.tokens"
      :white="pools.whiteTokens"
      :token-loading="page.tokenLoading"
      :sub-pool-number="pools.subPoolNumberMap"
      @open-token="loadToken"
    />
  </Layout>
</template>
<script setup>
import NP from "number-precision";
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, reactive, watch } from "vue";

import { usePoolList } from "@/hooks/usePoolList";
import { usePool } from "@/hooks/usePool";
import { useWallet } from "@/hooks/useWallet";
import { useTokens } from "@/hooks/useTokens";

import { getContractAddress } from "@/contract";

import { getCurBlockNumber } from "@/utils/block";
import { Local } from "@/utils/localStorage";

const router = useRouter();
const route = useRoute();
const { getSubPoolNumber, getMyTotalList, getPoolsByToken } = usePoolList();
const { getTokenList } = useTokens();
const { changePoolTab } = usePool();
const { account, wallet, chain } = useWallet();

let pools = reactive({
  whiteTokens: [],
  list: [],
  firstLoad: true,
  depositLoad: true,
  borrowLoad: true,
  tokens: [],
  poolMap: new Map(),
  subPoolNumberMap: new Map(),
});

const page = reactive({
  tokenLoading: true,
});

const tokenType = computed(() => {
  return route.name === "Provider" ? 1 : 0;
});

const poolTotal = computed(() => {
  if (route.name === "Provider") {
    return _.sumBy(pools.list, item => item.total_deposit * 1);
  } else {
    return _.sumBy(pools.list, item => item.total_borrow * 1);
  }
});

async function onChangeTab(name) {
  changePoolTab(name);
  router.push({ name, query: route.query });
  if (name === "Trader") {
    if (account.value) {
      getMyTotalList(0);
    }
  }
}

function loadToken(token) {
  if (token.isExpand) {
    token.loading = true;
    getPoolsByAddress(token);
  }
}

onMounted(async () => {
  if (!account.value) {
    page.tokenLoading = false;
  }
  if (route.name === "Provider" || route.name === "Trader") {
    await initPoolData();
  }
});

watch(
  () => [wallet.isConnected, account.value, chain.id],
  async () => {
    page.tokenLoading = true;
    pools.firstLoad = true;
    initPoolData();
  },
  { deep: true },
);

async function initPoolData() {
  await getCurBlockNumber();

  // default expand
  let shorterStorage = Local.get("shorterStorage");
  const tokenTop = shorterStorage[getContractAddress().networkName].common.token.top;
  const defaultExpandNumber = tokenTop.length || 3;

  const tokenList = (await getTokenList()) || [];
  const firstTokens = [];

  pools.whiteTokens = tokenList.map((item, index) => {
    let isExpand = false;
    let loading = false;
    // 前{defaultExpandNumber}个展开
    if (index < defaultExpandNumber) {
      isExpand = true;
      loading = true;
      firstTokens.push(item);
    }

    return Object.assign(item, { isExpand, loading });
  });

  pools.firstLoad = false;
  firstTokens.forEach(item => {
    getPool(item, tokenType.value, account.value);
  });

  getSubPoolNumber(tokenList).then(res => {
    pools.subPoolNumberMap = res;
  });
}

async function getPool(token, type, account) {
  getPoolsByToken(token, tokenType.value, account).then(async res => {
    pools.poolMap = new Map([...res, ...pools.poolMap]);

    pools.whiteTokens.forEach(token => {
      token.sub_pool = pools.poolMap.get(token.address);
      if (token.sub_pool && token.sub_pool.length > 0) {
        token.price = token.sub_pool[0].price;
        token.pool_number = token.sub_pool.length;

        token.total_my_deposit = _.sumBy(token.sub_pool, o => {
          return o.myDeposit * 1 || 0;
        });
        token.total_my_borrow = _.sumBy(token.sub_pool, o => {
          return o.myBorrow * 1 || 0;
        });
        let total_deposit = _.sumBy(token.sub_pool, o => {
          return o.stakedAmount * 1 || 0;
        });
        let total_borrow = _.sumBy(token.sub_pool, o => {
          return o.borrowedAmount * 1 || 0;
        });
        token.total_deposit = NP.times(total_deposit, token.price);
        token.total_borrow = NP.times(total_borrow, token.price);
      } else {
        token.price = 0;
        token.pool_number = 0;
        token.total_my_deposit = 0;
        token.total_my_borrow = 0;
        token.total_deposit = 0;
        token.total_borrow = 0;
      }
    });

    getMyTotalList(tokenType.value, pools.whiteTokens).then(poolTokens => {
      pools.tokens = poolTokens;
    });
    page.tokenLoading = false;
    token.loading = false;
  });
}

async function getPoolsByAddress(address) {
  let tokens = [];
  tokens.push(address);
  getPoolsByToken(tokens, tokenType.value, account.value).then(async res => {
    pools.poolMap = new Map([...res, ...pools.poolMap]);

    pools.whiteTokens.forEach(token => {
      token.loading = false;
      token.sub_pool = pools.poolMap.get(token.address);
      if (token.sub_pool && token.sub_pool.length > 0) {
        token.price = token.sub_pool[0].price;
        token.pool_number = token.sub_pool.length;

        token.total_my_deposit = _.sumBy(token.sub_pool, o => {
          return o.myDeposit * 1 || 0;
        });
        token.total_my_borrow = _.sumBy(token.sub_pool, o => {
          return o.myBorrow * 1 || 0;
        });
        let total_deposit = _.sumBy(token.sub_pool, o => {
          return o.stakedAmount * 1 || 0;
        });
        let total_borrow = _.sumBy(token.sub_pool, o => {
          return o.borrowedAmount * 1 || 0;
        });
        token.total_deposit = NP.times(total_deposit, token.price);
        token.total_borrow = NP.times(total_borrow, token.price);
      } else {
        token.price = 0;
        token.pool_number = 0;
        token.total_my_deposit = 0;
        token.total_my_borrow = 0;
        token.total_deposit = 0;
        token.total_borrow = 0;
      }
    });

    getMyTotalList(tokenType.value, pools.whiteTokens).then(poolTokens => {
      pools.tokens = poolTokens;
    });
    page.tokenLoading = false;
  });
}
</script>

<style lang="scss" scoped>
$gray: #ece8e5;

.tabs-container {
  position: relative;
  margin-top: 72px;
  border-top-left-radius: 0;
}

.tabs {
  @include flex;
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(-100%);

  .tab-item {
    @include flex-center-h;
    flex-direction: column;
    height: 72px;
    border-radius: 24px 24px 0 0;
    padding-left: 32px;
    padding-right: 72px;
    font-family: $caption;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    font-size: 20px;
    .header {
      font-size: 14px;
      color: #b2b3bd;
    }
  }

  .tab-item-container.active {
    position: relative;

    &:first-child {
      &::before,
      .tab-item::before {
        display: none;
      }
    }

    &:last-child {
      &::after,
      .tab-item::after {
        display: none;
      }
    }

    .tab-item {
      position: relative;
      background: #fff;
      color: $primary;
      .header {
        color: #a4a5b2;
      }
    }
  }
}
</style>
