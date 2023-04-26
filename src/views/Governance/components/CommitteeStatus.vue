<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Committee</h4>
    </header>

    <div class="panel">
      <ul>
        <li class="list-item">
          <div>
            <div class="item-con">
              <span>Rulers</span>
            </div>
            <shorterSkeleton v-if="state.loading.fetchRulers" style="padding: 5px 0; width: 120px" animated>
              <template #template>
                <shorterSkeletonItem style="width: 60px; height: 26px" />
              </template>
            </shorterSkeleton>
            <h3 v-else class="text-content">
              {{ rulersCount }}
            </h3>
          </div>

          <div>
            <div class="item-con align-right">
              <span>Your Share</span>
            </div>
            <shorterSkeleton v-if="state.loading.fetchShares" style="padding: 5px 0; width: 120px" animated>
              <template #template>
                <shorterSkeletonItem style="width: 60px; height: 26px" />
              </template>
            </shorterSkeleton>
            <h3 v-else-if="!wallet.isConnected" class="text-content empty">-</h3>
            <h3 v-else class="text-content">{{ state.voteWeight ? toPercent(state.voteWeight * 100, 2) : 0 }}%</h3>
          </div>
        </li>

        <li class="list-item">
          <div>
            <div class="item-con">
              <span>Total Locked</span>
            </div>
            <shorterSkeleton v-if="state.loading.fetchBalance" style="padding: 5px 0; width: 120px" animated>
              <template #template>
                <shorterSkeletonItem style="width: 160px; height: 26px" />
              </template>
            </shorterSkeleton>
            <h3 v-else class="text-content">
              {{ formatNum(state.committeeBalance, 2, true) }}
              <Tag class="tag">IPISTR</Tag>
            </h3>
          </div>

          <shorterButton
            v-if="wallet.isConnected"
            class="committee-ruler-btn large"
            type="primary"
            plain
            @click="dialogsVisible.joinCommittee = true"
          >
            <span v-if="account.isRuler">Get involved</span>
            <span v-else>Join now</span>
          </shorterButton>
        </li>
      </ul>

      <div class="cm-bg-con" />
    </div>

    <Dialog v-model="dialogsVisible.joinCommittee" width="560px">
      <BeRuler
        :committee-balance="state.committeeBalance"
        :total-share="state.totalShare"
        :available-share="state.availableShare"
        :vote-weight="state.voteWeight"
        @update-data="updateData"
        @close-dialog="dialogsVisible.joinCommittee = false"
      />
    </Dialog>
  </div>
</template>

<script setup>
import { inject, ref, reactive, watch } from "vue";
import NP from "number-precision";

import BeRuler from "@/components/Dialogs/BeRuler.vue";

import { getContractAddress } from "@/contract";
import * as IpistrAction from "@/contract/ipistr";
import * as Committee from "@/contract/committee";

import { getRulerCount } from "@/api/governance";

import { useWallet } from "@/hooks/useWallet";

import { formatNum, toPercent } from "@/utils/format";

const { wallet, account, chain, setAccount } = useWallet();

const events = inject("events");
const rulersCount = ref(null);

const state = reactive({
  loading: {
    fetchBalance: true,
    fetchRulers: false,
    fetchShares: false,
  },
  committeeBalance: 0,
  totalShare: 0,
  availableShare: 0,
  voteWeight: 0,
});

const dialogsVisible = reactive({
  joinCommittee: false,
});

function initData() {
  fetchCommitteeBalance(true);
  getRulers();
  getUserShares(account.value);
}
initData();

function updateData() {
  setAccount(account.value);
  if (typeof events.getTopRulers === "function") {
    events.getTopRulers();
  }

  initData();
}

async function fetchCommitteeBalance(withLoading = false) {
  let contractAddress = getContractAddress();
  try {
    state.loading.fetchBalance = withLoading;
    state.committeeBalance = await IpistrAction.balanceOf(contractAddress.Committee);
  } catch (error) {
    console.error(error.message);
  } finally {
    state.loading.fetchBalance = false;
  }
}

watch(
  () => chain.id,
  () => {
    initData();
  },
);

watch(
  () => account.value,
  val => getUserShares(val),
);

async function getRulers() {
  try {
    state.loading.fetchRulers = true;
    rulersCount.value = await getRulerCount();
    state.loading.fetchRulers = false;
  } catch (e) {
    console.error("get rules error:", e);
  }
}

async function getUserShares(accountValue) {
  try {
    state.fetchShares = true;
    const [userShares, totalIpistrStakedShare] = await Promise.all([
      Committee.getUserShares(accountValue),
      Committee.getTotalIpistrStakedShare(),
    ]);

    state.totalShare = userShares?.totalShare ?? 0;
    state.availableShare = userShares?.availableShare ?? 0;
    state.voteWeight = NP.divide(state.totalShare, totalIpistrStakedShare);
    console.log(totalIpistrStakedShare);

    state.fetchShares = false;
  } catch (e) {
    console.error("get user shares error =>", e);
  }
}
</script>

<style lang="scss" scoped>
.panel-container {
  min-width: 230px;
  flex: 1;

  .panel-header {
    height: 22px;
  }

  .panel {
    padding: 24px 32px;
    position: relative;
    overflow: hidden;
  }

  .cm-bg-con {
    background: url("~@/assets/images/committee-status-bg.png");
    width: 240px;
    height: 240px;
    position: absolute;
    right: -30px;
    bottom: -55px;
    z-index: 0;
  }

  .list-item {
    @include flex;
    align-items: center;
    justify-content: space-between;

    &:last-child {
      margin-top: 32px;
    }

    .item-con {
      @include flex-center-v;
      color: #a4a5b2;
      font-family: $caption;
      .icon {
        width: 24px;
        height: 24px;
        margin-right: 4px;
        color: #a4a5b2;
      }

      &.align-right {
        justify-content: flex-end;
      }
    }

    .text-content {
      @include flex-center-v;

      margin-top: 15px;
      height: 36px;
      line-height: 36px;
      font-size: 28px;

      .tag {
        font-size: 14px;
        margin-left: 4px;
      }

      &.empty {
        padding-left: 20px;
        padding-bottom: 10px;
      }
    }

    .committee-ruler-btn {
      width: 200px;
      z-index: 1;
    }
  }
}
</style>
