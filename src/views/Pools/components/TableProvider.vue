<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">
        Token Loaning Pools
        <ButtonCirclePlus @click="toCreatePool" />
      </h4>
      <div class="search-container">
        <form class="form-search" @submit.prevent>
          <div class="form-control">
            <input v-model="state.searchVal" type="text" placeholder="Search token" maxlength="12" />
            <div class="prefix">
              <svg class="shorter-icon" aria-hidden="true">
                <use xlink:href="#icon-search" />
              </svg>
            </div>
          </div>
        </form>
        <div v-if="wallet.isConnected" class="btn-history" @click="openActivity">
          <svg class="shorter-icon" aria-hidden="true">
            <use xlink:href="#icon-history" />
          </svg>
        </div>
      </div>
    </header>
    <div class="panel">
      <ul class="pool-list">
        <template v-if="tokens && tokens.length > 0">
          <div v-for="(token, token_index) in state.pools" :key="token_index" class="pool-item">
            <ul class="header" :class="{ expand: token.isExpand }">
              <li class="token">
                <Image class="coin-icon" :src="token.logoURI" alt="" circle />
                <span style="margin-right: 4px">
                  {{ token.symbol }}
                </span>
                <Guide v-if="token.describe" :text="token.describe" />
              </li>
              <li :class="{ hidden: !token.sub_pool?.length }" class="info">
                <span>Total Deposited</span>
                <b>
                  <SmartNumber type="amount" :value="token.total_deposit" />
                </b>
              </li>
              <li v-show="subPool.get(token.address) !== undefined" class="sub">
                <span>Sub Pools</span>
                <b>{{ subPool.get(token.address) }}</b>
              </li>
              <li>
                <div v-if="token.rating" v-tooltip.top="`Rating`" class="rating">
                  <svg class="shorter-icon" aria-hidden="true">
                    <use xlink:href="#icon-flag" />
                  </svg>
                  <span>
                    {{ token.ratingText }}
                  </span>
                </div>
                <div class="expand-switch" :class="{ active: token.isExpand }" @click="openToken(token)" />
              </li>
            </ul>
            <div v-if="!token.loading">
              <div v-show="token.isExpand" class="sub-pools">
                <table v-if="token.sub_pool?.length" class="shorter-table sub-pools">
                  <thead class="table-header">
                    <th class="sort-th">
                      <div class="sort-wrap">
                        <span class="head-cell">Supply APY</span>
                        <SortIcon
                          class="sort-icon"
                          :status="state.sort[token_index]['apy']"
                          @click="sort('apy', token, token_index)"
                        />
                      </div>
                    </th>
                    <th class="sort-th">
                      <div class="sort-wrap">
                        <span class="head-cell">Leverage</span>
                        <SortIcon
                          class="sort-icon"
                          :status="state.sort[token_index]['leverage']"
                          @click="sort('leverage', token, token_index)"
                        />
                      </div>
                    </th>
                    <th>Pool Deposited</th>
                    <th>My Deposited</th>
                    <th>Earned</th>
                    <th class="sort-th">
                      <div class="sort-wrap">
                        <span class="head-cell">Ends in ({{ tz.text }})</span>
                        <SortIcon
                          class="sort-icon"
                          :status="state.sort[token_index]['time']"
                          @click="sort('time', token, token_index)"
                        />
                      </div>
                    </th>
                    <th />
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in token.sub_pool" :key="`pool_${index}`">
                      <td>
                        <div v-if="item.apy !== 'Initializing'" class="pool-apy">
                          {{ item.apy }}
                        </div>
                        <div v-else>Initializing</div>
                      </td>
                      <td>{{ item.maxLeverage }}×</td>
                      <td>
                        <div class="pool-deposits">
                          <div>
                            <SmartNumber type="amount" :value="item.stakedAmount * item.price" />
                          </div>
                          <div>
                            <small class="color-gray">
                              <SmartNumber type="quantity" :value="item.stakedAmount" />
                            </small>
                            <Tag style="margin-left: 4px">
                              {{ item.tokenName }}
                            </Tag>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div v-if="wallet.isConnected">
                          <div>
                            <SmartNumber type="amount" :value="item.myDeposit ? item.myDeposit * item.price : 0" />
                          </div>
                          <div>
                            <small class="color-gray">
                              <SmartNumber type="quantity" :value="item.myDeposit" />
                            </small>
                            <Tag style="margin-left: 4px">
                              {{ item.tokenName }}
                            </Tag>
                          </div>
                        </div>
                        <span v-else>-</span>
                      </td>
                      <td>
                        <div v-if="wallet.isConnected && item.myDeposit * 1 > 0" class="cell-earned">
                          <svg class="shorter-icon" aria-hidden="true">
                            <use xlink:href="#icon-earned" />
                          </svg>
                          <span>+{{ toQuantity(item.earned, balance.price) }}</span>
                        </div>
                        <div v-else>-</div>
                      </td>
                      <td>
                        <div v-if="item.stateFlag === 1">
                          <p>
                            {{ fromNow(item.endTime) }}
                          </p>
                          <small class="color-gray">
                            {{ formatDate(item.endTime) }}
                          </small>
                        </div>
                        <div v-if="item.stateFlag === 2">
                          <p class="state-liquidating">Liquidating</p>
                        </div>
                      </td>
                      <td class="flex-center" style="justify-content: flex-end">
                        <a :href="`${poolUrl}${item.id || ''}`" target="_blank">
                          <shorterButton class="large">Enter pool</shorterButton>
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <SubPoolsEmptyNotice
                  v-else
                  :pool-name="token.symbol"
                  :token="token"
                  :create="true"
                  @toCreatePool="toCreatePool"
                />
              </div>
            </div>
            <shorterSkeleton v-else animated>
              <template #template>
                <ul class="skeleton-container">
                  <li v-for="i in 2" :key="i" class="flex">
                    <div v-for="e in 5" :key="e">
                      <shorterSkeletonItem style="height: 24px; width: 80%" />
                    </div>
                  </li>
                </ul>
              </template>
            </shorterSkeleton>
          </div>
        </template>
        <shorterSkeleton v-else-if="pool.firstLoad" animated>
          <template #template>
            <ul class="skeleton-container">
              <li v-for="i in 2" :key="i" class="flex">
                <div>
                  <shorterSkeletonItem variant="circle" style="width: 32px; height: 32px" />
                  <shorterSkeletonItem style="height: 24px; width: 50%; margin-left: 20px" />
                </div>
                <div>
                  <shorterSkeletonItem style="height: 24px; width: 20%" />
                  <shorterSkeletonItem style="height: 24px; width: 40%; margin-left: 20px" />
                </div>
                <div>
                  <shorterSkeletonItem style="height: 24px; width: 20%" />
                  <shorterSkeletonItem style="height: 24px; width: 40%; margin-left: 20px" />
                </div>
                <div>
                  <shorterSkeletonItem style="height: 24px; width: 50%" />
                </div>
              </li>
            </ul>
          </template>
        </shorterSkeleton>
        <Empty v-show="!pool.firstLoad && state.pools.length === 0" content="No matching pools" />
      </ul>
    </div>

    <Dialog v-model="dialogsVisible.createPool" width="560px" top="4vh">
      <DialogCreatePool :token="state.createPoolDefaultToken" @close="dialogsVisible.createPool = false" />
    </Dialog>

    <Dialog v-model="dialogsVisible.poolActivities" width="580px">
      <DialogPoolActivities @close="dialogsVisible.poolActivities = false" />
    </Dialog>
  </div>
</template>
<script setup>
import { computed, reactive } from "vue";

import Guide from "@/components/Guide.vue";
import DialogCreatePool from "./DialogCreatePool.vue";
import DialogPoolActivities from "./DialogPoolActivities.vue";
import ButtonCirclePlus from "./ButtonCirclePlus.vue";
import SubPoolsEmptyNotice from "./SubPoolsEmptyNotice.vue";

import { useWallet } from "@/hooks/useWallet";
import { useTimezone } from "@/hooks/useTimezone";
import { useBalance } from "@/hooks/useBalance";
import { Message } from "@/hooks/useMessage";

import { formatDate, fromNow, toQuantity } from "@/utils/format";

const props = defineProps({
  pool: {
    type: Object,
    default: () => ({
      list: [],
      firstLoad: true,
    }),
  },
  tokens: {
    type: Array,
    default: () => [],
  },
  subPool: {
    type: Map,
    default: () => new Map(),
  },
});

const emit = defineEmits(["open"]);

const { wallet, account } = useWallet();
const { balance } = useBalance();

const { tz } = useTimezone();

const state = reactive({
  tokenMap: new Map(),
  sort: [],
  createPoolDefaultToken: {},
  searchVal: "",
  pools: computed(() => {
    let result = [];
    let keywords = state.searchVal;
    keywords = keywords.trim();
    if (props.tokens && props.tokens.length > 0) {
      result = props.tokens.filter(item => {
        const reg = new RegExp(keywords, "gi");
        if (reg.test(item.symbol) || reg.test(item.address)) return item;
      });
    }
    let temp_result = result.concat();
    temp_result.forEach(() => {
      state.sort.push({
        apy: 0, // 1: asc 2: desc
        leverage: 0,
        time: 0,
      });
    });
    return temp_result;
  }),
});

function sort(type, token, token_index) {
  let temp_result = token.sub_pool;

  if (!state.tokenMap.get(token_index)) {
    state.tokenMap.set(token_index, token.sub_pool.concat());
  }
  const current = state.sort[token_index];
  current[type] = current[type] === 2 ? 0 : current[type] + 1;
  for (const property in current) {
    if (property !== type) current[property] = 0;
  }
  if (type === "apy") {
    if (current.apy === 1) {
      temp_result.sort(compareAPY);
    } else if (current.apy === 2) {
      temp_result.sort(compareAPYAsc);
    } else {
      temp_result = state.tokenMap.get(token_index).concat();
    }
  }
  if (type === "leverage") {
    if (current.leverage === 1) {
      temp_result.sort(compareLeverage);
    } else if (current.leverage === 2) {
      temp_result.sort(compareLeverageAsc);
    } else {
      temp_result = state.tokenMap.get(token_index).concat();
    }
  }
  if (type === "time") {
    if (current.time === 1) {
      temp_result.sort(compareTime);
    } else if (current.time === 2) {
      temp_result.sort(compareTimeAsc);
    } else {
      temp_result = state.tokenMap.get(token_index).concat();
    }
  }
  token.sub_pool = temp_result;
}

const poolUrl = computed(() => {
  return window.location.origin + "/pools/";
});

function compareAPY(a, b) {
  if (a.apySort > b.apySort) {
    return -1;
  }

  if (a.apySort < b.apySort) {
    return 1;
  }
  return 0;
}
function compareAPYAsc(a, b) {
  if (a.apySort > b.apySort) {
    return 1;
  }

  if (a.apySort < b.apySort) {
    return -1;
  }
  return 0;
}
function compareLeverage(a, b) {
  if (Number(a.maxLeverage) > Number(b.maxLeverage)) {
    return -1;
  }

  if (Number(a.maxLeverage) < Number(b.maxLeverage)) {
    return 1;
  }
  return 0;
}
function compareLeverageAsc(a, b) {
  if (Number(a.maxLeverage) > Number(b.maxLeverage)) {
    return 1;
  }

  if (Number(a.maxLeverage) < Number(b.maxLeverage)) {
    return -1;
  }
  return 0;
}
function compareTime(a, b) {
  if (new Date(a.endTime) > new Date(b.endTime)) {
    return -1;
  }

  if (new Date(a.endTime) < new Date(b.endTime)) {
    return 1;
  }
  return 0;
}
function compareTimeAsc(a, b) {
  if (new Date(a.endTime) > new Date(b.endTime)) {
    return 1;
  }

  if (new Date(a.endTime) < new Date(b.endTime)) {
    return -1;
  }
  return 0;
}

const dialogsVisible = reactive({
  createPool: false,
  poolActivities: false,
});

function openToken(token) {
  token.isExpand = !token.isExpand;
  emit("open", token);
}

function openActivity() {
  if (!account.value) {
    Message.warning("Connect your wallet to continue");
    return;
  }
  dialogsVisible.poolActivities = true;
}

function toCreatePool(token) {
  if (wallet.isConnected) {
    state.createPoolDefaultToken = token;
    dialogsVisible.createPool = true;
  } else {
    wallet.visible = true;
  }
}
</script>

<style lang="scss" scoped src="./table-provider.scss"></style>
