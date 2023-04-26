<template>
  <div v-if="wallet.isConnected" class="panel-container overview">
    <header class="panel-header">
      <h4 class="panel-title">Overview</h4>
    </header>
    <div class="panel">
      <div class="price-area">
        <shorterSkeleton animated style="height: 36px" :loading="form.totalDepositLoading">
          <template #template>
            <shorterSkeletonItem style="height: 36px; width: 80%" />
          </template>
          <template #default>
            <div class="main-price">
              <SmartNumber :prefix="totalCount >= 0 ? '' : '-'" type="amount" :value="Math.abs(totalCount)" />
            </div>
          </template>
        </shorterSkeleton>

        <shorterSkeleton animated style="height: 18px; margin-top: 15px" :loading="form.totalDepositLoading">
          <template #template>
            <shorterSkeletonItem style="height: 18px; width: 40%" />
          </template>
          <template #default>
            <div class="changed-price">
              <span v-if="accountChange * 1 > 0" class="color-green">
                <SmartNumber prefix="+" type="amount" :value="Math.abs(accountChange)" />
              </span>
              <span v-else-if="accountChange * 1 < 0" class="color-red">
                <SmartNumber prefix="-" type="amount" :value="Math.abs(accountChange)" />
              </span>
              <span v-else>$0</span>
              <Tag style="margin-left: 8px">24h</Tag>
            </div>
          </template>
        </shorterSkeleton>
      </div>
      <div class="overview-group">
        <div class="lt">
          <div class="info">
            <span>Unclosed Positions</span>
            <shorterSkeleton animated style="height: 22px; margin-top: 12px" :loading="overview.loading">
              <template #template>
                <shorterSkeletonItem style="height: 22px; width: 60%" />
              </template>
              <template #default>
                <div class="number">
                  {{ toAmount(overview.data.positions) }}
                </div>
              </template>
            </shorterSkeleton>
          </div>
          <div class="info">
            <span>Total Margin</span>
            <shorterSkeleton animated style="height: 22px; margin-top: 12px" :loading="overview.loading">
              <template #template>
                <shorterSkeletonItem style="height: 22px; width: 60%" />
              </template>
              <template #default>
                <div class="number">
                  <SmartNumber type="amount" :value="overview.data.margin" />
                </div>
              </template>
            </shorterSkeleton>
          </div>
          <div class="info">
            <span>Borrowed</span>
            <shorterSkeleton animated style="height: 22px; margin-top: 12px" :loading="overview.loading">
              <template #template>
                <shorterSkeletonItem style="height: 22px; width: 60%" />
              </template>
              <template #default>
                <div class="number">
                  <SmartNumber type="amount" :value="overview.data.borrow" />
                </div>
              </template>
            </shorterSkeleton>
          </div>
        </div>
        <div class="rt">
          <div class="info">
            <span>P/L</span>
            <shorterSkeleton animated style="height: 22px; margin-top: 12px" :loading="overview.loading">
              <template #template>
                <shorterSkeletonItem style="height: 22px; width: 60%" />
              </template>
              <template #default>
                <div v-if="overview.data.PL > 0" class="number color-green">
                  <SmartNumber prefix="+" type="amount" :value="Math.abs(overview.data.PL)" />
                </div>
                <div v-else-if="overview.data.PL < 0" class="number color-red">
                  <SmartNumber prefix="-" type="amount" :value="Math.abs(overview.data.PL)" />
                </div>
                <div v-else class="number color-gray">0</div>
              </template>
            </shorterSkeleton>
          </div>
          <div class="info">
            <span>Withdrawable</span>
            <shorterSkeleton animated style="height: 22px; margin-top: 12px" :loading="form.totalWithdrawLoading">
              <template #template>
                <shorterSkeletonItem style="height: 22px; width: 60%" />
              </template>
              <template #default>
                <div class="number">
                  <SmartNumber type="amount" :value="form.myTotalWithdraw" />
                </div>
              </template>
            </shorterSkeleton>
          </div>
          <div class="info">
            <span>Deposited</span>
            <shorterSkeleton style="height: 22px; margin-top: 12px" :loading="form.totalDepositLoading">
              <template #template>
                <shorterSkeletonItem style="height: 22px; width: 60%" />
              </template>
              <template #default>
                <div class="number">
                  <SmartNumber type="amount" :value="form.myTotalDeposit" />
                </div>
              </template>
            </shorterSkeleton>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="panel-container overview">
    <header class="panel-header">
      <h4 class="panel-title">Overview</h4>
    </header>
    <div class="panel">
      <div class="price-area">
        <div class="main-price">-</div>
        <div class="changed-price">
          - / -
          <Tag style="margin-left: 8px">24h</Tag>
        </div>
      </div>
      <div class="overview-group">
        <div class="lt">
          <div class="info">
            <span>Unclosed Positions</span>
            <div class="number">-</div>
          </div>
          <div class="info">
            <span>Total Margin</span>
            <div class="number">-</div>
          </div>
          <div class="info">
            <span>Borrowed</span>
            <div class="number">-</div>
          </div>
        </div>
        <div class="rt">
          <div class="info">
            <span>P/L</span>
            <div class="number">-</div>
          </div>
          <div class="info">
            <span>Withdrawable</span>
            <div class="number">-</div>
          </div>
          <div class="info">
            <span>Deposited</span>
            <div class="number">-</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { reactive, watchEffect, watch, computed } from "vue";
import NP from "number-precision";

import { useOverview } from "@/hooks/useOverview";
import { useWallet } from "@/hooks/useWallet";

import { toAmount } from "@/utils/format";

const props = defineProps({
  total: {
    type: Number,
    default: 0,
  },
  overview: {
    type: Object,
    default: () => {},
  },
});

const form = reactive({
  myTotalDeposit: 0,
  myTotalWithdraw: 0,
  totalDepositLoading: true,
  totalWithdrawLoading: true,
  totalLoading: true,
});

const totalCount = computed(() => {
  const overview = props.overview.data.data;
  const pl = overview?.PL || 0;
  const margin = overview?.margin || 0;
  return NP.plus(form.myTotalDeposit, pl, margin);
});

let { fetchMyPools, getMyDepositValue, getMyWithdrawValue } = useOverview();
let { account, wallet, chain } = useWallet();

watchEffect(async () => {
  refreshOverview();
});

function refreshOverview() {
  if (wallet.isConnected) {
    loadTotalDate();
    fetchMyPools(account.value);
  }
}

watch(
  () => chain.id,
  () => {
    refreshOverview();
  },
);

async function loadTotalDate() {
  form.totalDepositLoading = true;
  form.totalWithdrawLoading = true;

  getMyDepositValue(account.value).then(res => {
    form.myTotalDeposit = res;
    form.totalDepositLoading = false;
  });

  getMyWithdrawValue(account.value).then(res => {
    form.myTotalWithdraw = res;
    form.totalWithdrawLoading = false;
  });
}

const accountChange = computed(() => {
  return totalCount.value - props.total;
});
</script>

<style lang="scss" scoped>
.overview {
  .panel {
    padding-bottom: 16px;
  }
}
.price-area {
  .main-price {
    height: 36px;
    font-size: 36px;
    color: #333;
  }
  .changed-price {
    @include flex-center-v;
    height: 18px;
    color: #a4a5b2;
    margin-top: 15px;
    font-size: 18px;
    .time {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 24px;
      background: #f8f8f8;
      border-radius: 8px;
      font-size: 14px;
      color: #a4a5b2;
      margin: 8px;
    }
  }
}

.overview-group {
  display: flex;
  height: 212px;
  margin-top: 43px;
  .lt,
  .rt {
    @include flex;
    flex: 1;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 16px;
  }
  .rt {
    border-left: 1px solid #eee;
    text-align: right;
  }
  .info {
    span {
      color: #a4a5b2;
      font-family: "Haas Grot Disp";
    }
    .number {
      font-size: 18px;
      margin-top: 12px;
    }
    .down {
      color: $primary;
    }
    .up {
      color: #43ac8d;
    }
  }
}
</style>
