<template>
  <div v-if="wallet.isConnected" class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">
        Open Short Positions
        <span v-if="myOpenPositions.length">({{ myOpenPositions.length }})</span>
      </h4>
      <div v-if="positionCount > 0" class="link">
        <router-link :to="{ name: 'Positions', query: route.query }">My positions →</router-link>
      </div>
    </header>
    <div class="positions">
      <div v-if="position.loading" class="panel">
        <shorterSkeleton animated :loading="position.loading">
          <template #template>
            <div class="skeleton-container">
              <ul class="header">
                <li>
                  <shorterSkeletonItem variant="circle" style="width: 40px; height: 40px" />
                  <shorterSkeletonItem style="width: 40%; height: 32px; margin-left: 16px" />
                </li>
                <li>
                  <shorterSkeletonItem style="width: 80%; height: 32px" />
                </li>
                <li>
                  <shorterSkeletonItem style="width: 80%; height: 32px" />
                </li>
              </ul>
              <ul class="footer">
                <li v-for="i in 4" :key="i">
                  <shorterSkeletonItem style="width: 70%; height: 24px" />
                  <br />
                  <shorterSkeletonItem style="width: 40%; height: 20px; margin-top: 6px" />
                </li>
              </ul>
            </div>
          </template>
        </shorterSkeleton>
      </div>
      <template v-else>
        <ul v-if="myOpenPositions.length > 0" class="position-list">
          <li
            v-for="(item, index) in myOpenPositions.slice(0, 3 * state.loadMoreCount)"
            :key="index"
            class="position-item"
          >
            <div class="main-content">
              <header class="header">
                <div class="lt">
                  <Image class="coin-icon" :src="item.token ? item.token.logoURI : ''" circle />
                  <div>
                    <router-link
                      class="link"
                      :to="{
                        name: 'PoolDetail',
                        params: { id: item.poolId },
                        query: route.query,
                      }"
                    >
                      #{{ item.poolId }}
                    </router-link>
                    <p>{{ item.token.symbol }} ({{ item.leverage }}×)</p>
                  </div>
                </div>
                <div class="holding-period">
                  <div v-tooltip.top="'Holding Period'" class="content">
                    <svg class="shorter-icon" aria-hidden="true">
                      <use xlink:href="#icon-time" />
                    </svg>
                    <span>
                      {{ item.holdingPeriod }}
                    </span>
                  </div>
                </div>
                <div v-copy="{ text: item.hash, success: handleCopySuccess }" class="hash-address">
                  {{ ellipsisStr(item.hash) }}
                  <svg class="shorter-icon" aria-hidden="true">
                    <use xlink:href="#icon-copy" />
                  </svg>
                </div>
              </header>
              <section>
                <ul class="infos">
                  <li>
                    <span>
                      <SmartNumber prefix="-" type="quantity" :value="item.totalSize" />
                    </span>

                    <label>Size</label>
                  </li>
                  <li>
                    <span>
                      <SmartNumber type="price" :value="item.avgHoldPrice" />
                    </span>
                    <label>Avg. Open Price</label>
                  </li>
                  <li>
                    <span>
                      <SmartNumber type="price" :value="item.stakedTokenPrice" />
                    </span>
                    <label>Last Price</label>
                  </li>
                </ul>
                <div class="pl-container" :class="item.earnAmount * 1 >= 0 ? 'up' : 'down'">
                  <div class="lt">
                    <p>
                      <SmartNumber
                        :prefix="item.earnAmount * 1 >= 0 ? '+' : '-' "
                        type="amount"
                        :value="Math.abs(item.earnAmount)"
                      />
                    </p>
                    <p>{{ item.earnAmount * 1 >= 0 ? "+" : "-" }}{{ toPercent(Math.abs(item.plPercent * 100)) }}%</p>
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress"
                      :style="{
                        height: `${item.progress > 100 ? 100 : item.progress}%`,
                      }"
                    />
                  </div>
                </div>
              </section>
            </div>
            <div class="popover" @click="openPosition(item)">
              <svg class="shorter-icon" aria-hidden="true">
                <use xlink:href="#icon-short-position" />
              </svg>
            </div>
          </li>
          <div
            v-if="myOpenPositions.length > 3 && myOpenPositions.length > 3 * state.loadMoreCount"
            class="btn-load-more"
            @click="state.loadMoreCount += 1"
          >
            <span>Load More</span>
          </div>
        </ul>
        <div v-else class="panel empty-container">
          <Empty class="empty" content="No positions yet" />
          <router-link :to="{ path: '/pools/trader#table-pool', query: route.query }">
            <shorterButton class="big" style="width: 240px" type="primary" plain>Jump start your trading</shorterButton>
          </router-link>
        </div>
      </template>
      <Dialog v-model="dialogsVisible.trade" width="976px" top="4vh">
        <DialogPosition @closeDialog="dialogsVisible.trade = false" />
      </Dialog>
    </div>
  </div>
  <div v-else class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Open Short Positions</h4>
    </header>
    <div class="positions">
      <div class="panel empty-container">
        <Empty class="empty" content="No positions yet" />
        <shorterButton class="big" style="width: 240px" type="primary" plain @click="wallet.visible = true">
          Unlock wallet
        </shorterButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from "vue";
import { useRoute } from "vue-router";

import DialogPosition from "@/views/Positions/components/DialogPosition.vue";

import { usePosition } from "@/hooks/usePosition";
import { useWallet } from "@/hooks/useWallet";
import { Message } from "@/hooks/useMessage";

import { ellipsisStr, toPercent } from "@/utils/format";

const props = defineProps({
  positions: {
    type: Object,
    default: () => {},
  },
  positionCount: {
    type: Number,
    default: () => {},
  },
});

const state = reactive({
  loadMoreCount: 1,
});

const route = useRoute();

const dialogsVisible = reactive({ trade: false });
const { position } = usePosition();
const { wallet } = useWallet();

let myOpenPositions = computed(() => {
  let result = [];
  if (props.positions?.list && props.positions?.list.length > 0) {
    result = props.positions?.list.filter(item => item.state * 1 === 1);
    result = _.orderBy(result, ["createBlock"], ["asc"]);
    return result;
  } else {
    return [];
  }
});

function handleCopySuccess() {
  Message.success("Copied");
}

function openPosition(item) {
  position.detail = item;
  dialogsVisible.trade = true;
}
</script>

<style lang="scss" scoped>
.panel-container {
  margin-top: 16px;
}
.panel-header {
  .link {
    @include flex-center-v;
    // font-weight: 600;
    font-size: 16px;
    color: #909399;
    cursor: pointer;
    &:hover {
      color: $primary;
    }
  }
}

.position-list {
  margin-top: 24px;
  .position-item {
    position: relative;
    &:not(&:first-child) {
      margin-top: 32px;
    }
  }
}

.main-content {
  position: relative;
  width: 100%;
  // height: 153px;
  padding: 32px;
  background: #fff;
  border-radius: 24px;
  border: 1px solid transparent;
  z-index: 1;
  .header {
    @include flex-center-v;
    justify-content: space-between;
    .lt {
      @include flex-center-v;
      min-width: 130px;
      width: 160px;
      .coin-icon {
        width: 40px;
        height: 40px;
        margin-right: 12px;
      }
      .link {
        font-size: 16px;
        font-weight: 600;
        text-decoration: underline;
      }
      p {
        margin-top: 6px;
        color: #909399;
      }
    }
    .holding-period {
      @include flex-center-v;
      flex: 1;
      font-size: 16px;
      .content {
        @include flex-center-v;
        span {
          margin-left: 8px;
          transform: translateY(1px);
        }
        svg {
          width: 16px;
          height: 16px;
          color: #a4a5b2;
        }
        &:hover {
          cursor: pointer;
          svg {
            color: $primary;
          }
        }
      }
      .popper-content {
        width: 80px;
        text-align: center;
        padding: 3px 0;
        word-break: keep-all;
        font-size: 12px;
      }
    }

    .hash-address {
      @include flex-center-v;
      height: 32px;
      padding-left: 16px;
      padding-right: 12px;
      font-size: 16px;
      color: #909399;
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      cursor: pointer;
      svg {
        width: 16px;
        height: 16px;
        margin-left: 8px;
        transform: translateY(-1px);
      }
    }
  }
  section {
    @include flex-center-v;
    justify-content: space-between;
    margin-top: 46px;
  }
  .infos {
    @include flex;
    justify-content: space-between;
    flex: 1;
    min-width: 70%;
    li {
      label {
        display: block;
        color: #a4a5b2;
        margin-top: 8px;
        font-family: $caption;
      }
      span {
        display: block;
        font-size: 24px;
        color: #303133;
      }
    }
  }
  .pl-container {
    @include flex;
    justify-content: flex-end;
    flex: 1;
    &.up {
      .lt {
        color: $green;
      }
      .progress-bar {
        background: rgba($green, 0.2);
        .progress {
          background: $green;
        }
      }
    }
    &.down {
      .lt {
        color: $red;
      }
      .progress-bar {
        background: rgba($red, 0.2);
        .progress {
          background: $red;
        }
      }
    }
    .lt {
      p {
        font-size: 24px;
        height: 20px;
        line-height: 20px;
        text-align: right;
        &:last-child {
          margin-top: 8px;
        }
      }
    }
    .progress-bar {
      @include flex;
      align-items: flex-end;
      width: 4px;
      height: 48px;
      margin-left: 16px;
      margin-right: 16px;
      background: $red;
      border-radius: 4px;
      .progress {
        position: relative;
        width: 100%;
        height: 0%;
        border-radius: 0px 0px 4px 4px;
        &::after {
          content: "";
          position: absolute;
          border: 4px solid transparent;
          border-right-color: #333;
          right: -4px;
          top: 0;
          transform: translate(100%, -50%);
        }
      }
    }
  }
}

.popover {
  @include flex-center;
  position: absolute;
  top: 50%;
  right: 0;
  width: 56px;
  height: 88px;
  transform: translateY(-50%);
  background: $primary;
  border-radius: 0px 16px 16px 0px;
  color: #fff;
  transition: 0.3s;
  z-index: 0;
  cursor: pointer;
  svg {
    width: 24px;
    height: 24px;
    color: #fff;
  }
}

.position-item:hover {
  .main-content {
    border-color: $primary;
  }
  .popover {
    transform: translateY(-50%) translateX(100%);
  }
}
.empty-container {
  @include flex-center;
  flex-direction: column;
  .empty {
    padding-top: 8px;
    padding-bottom: 24px;
  }
  .btn {
    width: 240px;
    // height: 40px;
    // border-radius: 8px;
    margin-bottom: 16px;
  }
}

.skeleton-container {
  .header {
    @include flex;
    li {
      @include flex-center-v;
      flex: 1;
    }
  }
  .footer {
    @include flex;
    margin-top: 24px;
    li {
      flex: 1;
    }
  }
}
.btn-load-more {
  @include flex-center;
  width: 240px;
  height: 40px;
  margin: 24px auto 0 auto;
  background: #ffffff;
  border-radius: 12px;
  cursor: pointer;
  span {
    font-weight: 600;
    color: #606266;

    &:hover {
      color: $primary;
    }
  }
}
</style>
