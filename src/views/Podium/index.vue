<template>
  <Layout title="IPISTR Podium">
    <transition name="fade">
      <div v-show="pageStatus.pageLoading">
        <div class="podium-wrap">
          <div class="podium-card">
            <div class="panel-container">
              <header class="panel-header">
                <h4 class="panel-title">
                  <span>Available Claim</span>
                </h4>
              </header>
              <div class="panel available-claim">
                <shorterSkeleton animated style="margin-top: 0">
                  <template #template>
                    <shorterSkeletonItem style="display: block; margin-bottom: 12px; height: 18px; width: 40%" />
                    <shorterSkeletonItem style="display: block; margin-bottom: 22px; height: 28px; width: 50%" />
                    <shorterSkeletonItem style="display: block; margin-bottom: 12px; height: 18px; width: 30%" />
                    <shorterSkeletonItem style="display: block; margin-bottom: 12px; height: 28px; width: 40%" />
                    <shorterSkeletonItem style="display: block; margin-top: 32px; height: 48px; width: 100%" />
                  </template>
                </shorterSkeleton>
              </div>
            </div>
          </div>
          <div class="podium-card">
            <div class="panel-container">
              <header class="panel-header">
                <h4 class="panel-title">
                  <span>Next Upcoming Claim</span>
                </h4>
              </header>
              <div class="panel next-claim">
                <shorterSkeleton animated style="margin-top: 0">
                  <template #template>
                    <shorterSkeletonItem style="display: block; margin-bottom: 12px; height: 18px; width: 40%" />
                    <shorterSkeletonItem style="display: block; margin-bottom: 22px; height: 28px; width: 55%" />
                    <shorterSkeletonItem style="display: block; margin-bottom: 12px; height: 18px; width: 30%" />
                    <shorterSkeletonItem style="display: block; margin-bottom: 12px; height: 28px; width: 40%" />
                    <shorterSkeletonItem style="display: block; margin-top: 32px; height: 48px; width: 100%" />
                  </template>
                </shorterSkeleton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <div v-show="!pageStatus.pageLoading">
      <div v-show="canClaim">
        <div class="podium-wrap">
          <div v-show="unClaimedList.length > 0" class="podium-card">
            <div class="panel-container">
              <header class="panel-header">
                <h4 class="panel-title">
                  <span>Available Claim</span>
                </h4>
              </header>
              <div class="panel available-claim">
                <div class="blocks-wrap">
                  <div v-for="(item, index) in unClaimedList" :key="`${index}_past_block`" class="past-blocks">
                    <p class="sm-title">Unlocked at</p>
                    <p class="number">#{{ item.unlockBlock }}</p>
                    <p class="sm-title">Amount</p>
                    <p class="number">
                      <TextTag>{{ addThousandsSep(item.balance) }}</TextTag>
                    </p>
                  </div>
                </div>
                <shorterButton type="primary" plain class="claim-btn" :loading="pageStatus.claimLoading" @click="claim">
                  Claim
                </shorterButton>
              </div>
            </div>
          </div>

          <!-- next block -->
          <div v-if="nextBlock" class="podium-card">
            <div class="panel-container">
              <header class="panel-header">
                <h4 class="panel-title">
                  <span>Next Upcoming Claim</span>
                </h4>
              </header>
              <div class="panel">
                <div class="next-block">
                  <lineTitleVue class="title">
                    <template #title>Available at Block</template>
                  </lineTitleVue>
                  <p class="number block-number">#{{ nextBlock.unlockBlock }}</p>
                </div>
                <div class="next-value">
                  <lineTitleVue class="title">
                    <template #title>Claimable Amount</template>
                  </lineTitleVue>
                  <p class="number block-number">
                    <TextTag>{{ addThousandsSep(nextBlock.balance) }}</TextTag>
                  </p>
                </div>
                <!-- leftover blocks -->
                <shorterButton disabled type="primary" plain class="leftover-btn">
                  <p class="btn-content">
                    <svg class="btn-icon" aria-hidden="true">
                      <use xlink:href="#icon-podium-time" />
                    </svg>
                    <span>{{ remainingBlocks }} blocks leftover</span>
                  </p>
                </shorterButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="!canClaim">
        <div class="no-claims">
          <p class="title">You’re all caught up. No claims for now.</p>
          <p class="subtitle">DID YOU KNOW</p>
          <p class="describe">You can get FREE claims by:</p>
          <ul class="task-list">
            <li v-for="(item, index) in taskList" :key="`${index}_task`" class="task">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Layout>
</template>
<script setup>
import { computed, onBeforeMount, onBeforeUnmount, watch, ref } from "vue";

import * as Podium from "@/contract/podium";

import { addThousandsSep } from "@/utils/format";
import { getCurBlockNumber } from "@/utils/block";

import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";
import { useInterval } from "@/hooks/useInterval";

import TextTag from "./components/text-tag.vue";
import lineTitleVue from "./components/line-title.vue";

const { account, chain } = useWallet();
const { addBlockSpeedInterval, clearTimerInterval } = useInterval();

let blockTimer = ref(null);
const curBlockNumber = ref(0);
const resArray = ref([]);

const pageStatus = ref({
  claimLoading: false,
  pageLoading: false,
});

const canClaim = computed(() => {
  const can = resArray.value.filter(item => !item.isClaimed);
  return can.length > 0;
});

const unClaimedList = computed(() => {
  const uc = resArray.value.filter(item => {
    return !item.isClaimed && item.unlockBlock < curBlockNumber.value;
  });

  return uc;
});

const futureList = computed(() => {
  const future = resArray.value.filter(item => {
    return !item.isClaimed && item.unlockBlock > curBlockNumber.value;
  });
  return future;
});

const nextBlock = computed(() => {
  if (futureList.value.length > 0) return futureList.value[0];
  return false;
});

const remainingBlocks = computed(() => {
  if (nextBlock.value && nextBlock.value.unlockBlock) {
    return nextBlock.value.unlockBlock - curBlockNumber.value;
  }
  return 0;
});

// fill task list
const taskList = ref([
  "Engaging in periodically official activities",
  "Refer friends to Shorter",
  "Enriching Shorter’s ecosytem with your intellect",
]);

watch(
  () => [chain.id, account.value],
  () => {
    if (account.value) {
      pageStatus.value.pageLoading = true;
      refreshClaims();
    } else {
      pageStatus.value.pageLoading = false;
      resArray.value = [];
    }
  },
  { immediate: true },
);

onBeforeMount(async () => {
  curBlockNumber.value = await getCurBlockNumber();
});

onBeforeUnmount(() => {
  clearInterval(blockTimer.value);
});

async function refreshClaims() {
  pageStatus.value.pageLoading = true;
  resArray.value = [];
  await getAllClaims();

  if (remainingBlocks.value > 0) {
    addTimerInterval();
  }
  pageStatus.value.pageLoading = false;
}

function addTimerInterval() {
  const cb = async () => {
    curBlockNumber.value = await getCurBlockNumber();

    if (remainingBlocks.value <= 0) {
      clearTimerInterval();
      await refreshClaims();
    }
  };

  addBlockSpeedInterval(cb);
}

async function claim() {
  pageStatus.value.claimLoading = true;
  try {
    await Podium.claim();
    refreshClaims();
  } catch (e) {
    Message.error(e.error?.message ? "Insufficient spendable amount" : "Something went wrong");
  } finally {
    pageStatus.value.claimLoading = false;
    pageStatus.value.pageLoading = true;
  }
}

async function getAllClaims() {
  let flag = false;
  let startIndex = 0;
  while (!flag) {
    try {
      const userInfo = await Podium.getUserInfo(account.value, startIndex);
      resArray.value.push(userInfo);
      startIndex++;
    } catch (e) {
      return;
    }
  }
}
</script>

<style lang="scss" scoped>
.podium-wrap {
  display: flex;
}

.panel-container {
  padding: 0;
}

.podium-card {
  width: 440px;
  margin-right: 32px;
}

.available-claim {
  background-image: url(../../assets/images/podium-bg-available.svg);
  background-size: 120px 120px;
  background-repeat: no-repeat;
  background-position: calc(100% + 22px) -25px;

  .sm-title {
    font-size: 12px;
    line-height: 18px;
    color: #909399;
    margin-bottom: 8px;

    &:not(:first-child) {
      margin-top: 20px;
    }
  }

  .past-blocks {
    padding-bottom: 16px;

    &:not(:last-child) {
      border-bottom: 1px solid #eeeeee;
      margin-bottom: 16px;
    }
  }

  .claim-btn {
    margin-top: 16px;
    width: 100%;
    height: 48px;
  }
}

.no-claims {
  .title {
    font-family: $caption;
    font-weight: 600;
    font-size: 20px;
    line-height: 30px;
    color: #303133;
    margin-bottom: 44px;
  }

  .subtitle {
    font-size: 20px;
    font-weight: 600;
    line-height: 24px;
    color: #909399;
    margin-bottom: 8px;
  }

  .describe {
    font-size: 18px;
    line-height: 24px;
    margin-bottom: 24px;
  }

  .task-list {
    .task {
      font-size: 16px;
      line-height: 28px;
      color: #909399;

      &::before {
        content: "▪︎";
        margin-right: 10px;
      }
    }
  }
}

.number {
  font-size: 32px;
  line-height: 28px;
  color: #3d3d3d;
}

.next-block {
  margin-bottom: 40px;

  .title {
    margin-bottom: 24px;
  }
}

.next-value {
  .title {
    margin-bottom: 24px;
  }
}

.leftover-btn {
  margin-top: 32px;
  width: 100%;
  height: 48px;
}

.btn-content {
  display: flex;
  align-items: center;
}

.btn-icon {
  width: 24px;
  height: 24px;
  margin-right: 4px;
  opacity: 0.4;
}
</style>
