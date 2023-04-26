<template>
  <div class="panel-container">
    <div class="panel">
      <ExpCountdown
        v-if="info.poolInfo?.stateFlag * 1 !== 4"
        :loading="loading.pool"
        :start-time="new Date().getTime()"
        :end-time="realEndTime"
        :is-liquidating="info.poolInfo?.stateFlag * 1 == 2 || info.poolInfo?.stateFlag * 1 == 3"
      />
      <header class="header">
        <div class="lt">
          <span>Created by</span>
          <shorterSkeleton :loading="loading.pool" animated style="height: 34px">
            <template #template>
              <shorterSkeletonItem style="width: 200px; height: 34px" />
            </template>
            <template #default>
              <a v-tooltip.top="`${info.poolInfo?.creator}`" @click="onContract(info.poolInfo?.creator)">
                {{ ellipsisStr(info.poolInfo?.creator) }}
                <svg class="shorter-icon" aria-hidden="true">
                  <use xlink:href="#icon-share" />
                </svg>
              </a>
            </template>
          </shorterSkeleton>
        </div>
        <div class="rt">
          <a class="view-pool" target="_blank" :href="viewLink" style="visibility: hidden">
            <svg class="shorter-icon block-explorer" aria-hidden="true">
              <use xlink:href="#icon-go_to_etherscan" />
            </svg>
          </a>
        </div>
      </header>
      <div style="padding-top: 24px">
        <section class="main">
          <header>
            <shorterSkeleton
              :loading="loading.pool"
              animated
              style="width: 124px; height: 34px; margin-right: 8px; padding-top: 4.5px"
            >
              <template #template>
                <shorterSkeletonItem style="height: 34px" />
              </template>
              <template #default>
                <div class="coin-info">
                  <Image circle :src="info.token ? info.token.logoURI : ''" style="width: 34px; height: 34px" />
                  <span>
                    {{ info.token ? info.token.symbol : info.poolInfo?.tokenName }}
                  </span>
                </div>
              </template>
            </shorterSkeleton>

            <div class="price">
              <small>Current Price</small>
              <shorterSkeleton :loading="loading.pool" animated style="margin-top: 4px; height: 22px">
                <template #template>
                  <shorterSkeletonItem style="width: 80px; height: 22px" />
                </template>
                <template #default>
                  <p>
                    <SmartNumber type="price" :value="info.poolInfo.stakedTokenPrice" />
                  </p>
                </template>
              </shorterSkeleton>
            </div>
            <div class="rating">
              <small>Rating</small>
              <shorterSkeleton :loading="loading.pool" animated style="margin-top: 4px; height: 22px">
                <template #template>
                  <shorterSkeletonItem style="width: 80px; height: 22px" />
                </template>
                <template #default>
                  <p class="color-primary">
                    {{ info.token ? info.token.ratingText : "B" }}
                  </p>
                </template>
              </shorterSkeleton>
            </div>
            <div v-if="info.token" class="links">
              <div class="link-item" @click="onWebsite(info.token?.website)">
                <div class="link-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" data-v-0312bc9b="">
                    <path
                      fill="currentColor"
                      d="M715.648 625.152 670.4 579.904l90.496-90.56c75.008-74.944 85.12-186.368 22.656-248.896-62.528-62.464-173.952-52.352-248.96 22.656L444.16 353.6l-45.248-45.248 90.496-90.496c100.032-99.968 251.968-110.08 339.456-22.656 87.488 87.488 77.312 239.424-22.656 339.456l-90.496 90.496zm-90.496 90.496-90.496 90.496C434.624 906.112 282.688 916.224 195.2 828.8c-87.488-87.488-77.312-239.424 22.656-339.456l90.496-90.496 45.248 45.248-90.496 90.56c-75.008 74.944-85.12 186.368-22.656 248.896 62.528 62.464 173.952 52.352 248.96-22.656l90.496-90.496 45.248 45.248zm0-362.048 45.248 45.248L398.848 670.4 353.6 625.152 625.152 353.6z"
                    />
                  </svg>
                </div>
                <span>Website</span>
              </div>
              <div class="link-item" @click="onContract(info.poolInfo?.tokenAddress)">
                <div class="link-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" data-v-0312bc9b="">
                    <path
                      fill="currentColor"
                      d="M192 128v768h640V128H192zm-32-64h704a32 32 0 0 1 32 32v832a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32zm160 448h384v64H320v-64zm0-192h192v64H320v-64zm0 384h384v64H320v-64z"
                    />
                  </svg>
                </div>
                <span>Contract</span>
              </div>
            </div>
          </header>
          <shorterSkeleton v-if="false" :loading="loading.pool" animated style="margin-top: 16px">
            <template #template>
              <shorterSkeletonItem style="height: 16px" />
              <shorterSkeletonItem style="height: 16px; width: 40%; margin-top: 6px" />
              <shorterSkeletonItem style="height: 16px; margin-top: 20px" />
            </template>
          </shorterSkeleton>
        </section>
        <footer class="footer">
          <div class="lt">
            <div class="info">
              <p>Supply APY</p>
              <shorterSkeleton :loading="loading.pool" animated style="width: 200px; height: 34px">
                <template #template>
                  <shorterSkeletonItem style="height: 34px" />
                </template>
                <template #default>
                  <h2 :class="info.APY === 'Initializing' ? 'color-gray' : 'color-green'">
                    {{ info.APY }}
                  </h2>
                </template>
              </shorterSkeleton>
            </div>
            <div class="info">
              <p>Leverage</p>
              <shorterSkeleton :loading="loading.pool" animated style="width: 200px; height: 34px">
                <template #template>
                  <shorterSkeletonItem style="height: 34px" />
                </template>
                <template #default>
                  <h2>
                    <span v-if="info.poolInfo?.maxLeverage">{{ info.poolInfo?.maxLeverage }}×</span>
                    <span v-else>-</span>
                  </h2>
                </template>
              </shorterSkeleton>
            </div>
            <div class="info">
              <p v-if="info.poolInfo?.stateFlag * 1 === 4">Ended on ({{ tz.text }})</p>
              <p v-else>Ends on ({{ tz.text }})</p>
              <shorterSkeleton :loading="loading.pool" animated>
                <template #template>
                  <shorterSkeletonItem style="width: 200px; height: 19px" />
                </template>
                <template #default>
                  <h2>{{ formatDate(realEndTime) }}</h2>
                </template>
              </shorterSkeleton>
            </div>
          </div>
          <div v-if="info.poolInfo" class="rt">
            <div class="total-deposited">
              <h4>
                <span># of Providers</span>
                <shorterSkeleton :loading="loading.counts" animated style="width: 200px; height: 28px">
                  <template #template>
                    <shorterSkeletonItem style="height: 28px" />
                  </template>
                  <template #default>
                    <p class="right">{{ count.providerCount }}</p>
                  </template>
                </shorterSkeleton>
              </h4>
              <h4>
                <span>Total Deposited</span>
                <shorterSkeleton :loading="loading.pool" animated style="width: 200px; height: 28px">
                  <template #template>
                    <shorterSkeletonItem style="height: 28px" />
                  </template>
                  <template #default>
                    <p class="right">
                      <!-- <SmartNumber -->
                      <!--   type="amount" -->
                      <!--   :speical-amount="'poolDetail'" -->
                      <!--   :value="info.poolInfo?.stakedAmount * info.poolInfo.stakedTokenPrice" -->
                      <!-- /> -->
                      <!-- <span class="color-gray">/</span> -->
                      <SmartNumber type="quantity" :value="info.poolInfo?.stakedAmount" />
                      <Tag class="tag">
                        {{ info.token ? info.token.symbol : info.poolInfo?.tokenName }}
                      </Tag>
                    </p>
                  </template>
                </shorterSkeleton>
              </h4>
            </div>
            <div class="total-borrowed">
              <h4>
                <span># of Traders</span>
                <shorterSkeleton :loading="loading.counts" animated style="width: 200px; height: 28px">
                  <template #template>
                    <shorterSkeletonItem style="height: 28px" />
                  </template>
                  <template #default>
                    <p class="right">{{ count.traderCount }}</p>
                  </template>
                </shorterSkeleton>
              </h4>
              <h4>
                <span>Total Borrowed</span>
                <shorterSkeleton :loading="loading.pool" animated style="width: 200px; height: 28px">
                  <template #template>
                    <shorterSkeletonItem style="height: 28px" />
                  </template>
                  <template #default>
                    <p class="right">
                      <!-- <SmartNumber -->
                      <!--   type="amount" -->
                      <!--   :speical-amount="'poolDetail'" -->
                      <!--   :value="info.poolInfo?.borrowedAmount * info.poolInfo.stakedTokenPrice" -->
                      <!-- /> -->
                      <!-- <span class="color-gray">/</span> -->
                      <SmartNumber type="quantity" :value="info.poolInfo?.borrowedAmount" />
                      <Tag class="tag">
                        {{ info.token ? info.token.symbol : info.poolInfo?.tokenName }}
                      </Tag>
                    </p>
                  </template>
                </shorterSkeleton>
              </h4>
            </div>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { getContractAddress } from "@/contract";
import ExpCountdown from "./ExpCountdown.vue";

import { useTimezone } from "@/hooks/useTimezone";

import { openUrl } from "@/utils/url";
import { ellipsisStr, formatDate } from "@/utils/format";

const props = defineProps({
  loading: {
    type: Object,
    default: () => {},
  },
  info: {
    type: Object,
    default: () => {},
  },
  count: {
    type: Object,
    default: () => {},
  },
  endTime: {
    type: String,
    default: "",
  },
});

const { tz } = useTimezone();

const realEndTime = computed(() => {
  if (props.info.poolInfo?.stateFlag * 1 == 2 || props.info.poolInfo?.stateFlag * 1 == 3) {
    return new Date(props.endTime).getTime() + getContractAddress().blockSpeed * 1000 * 1000;
  } else {
    return new Date(props.endTime).getTime();
  }
});

/**
 * @description: 从链上查看合约地址
 * @param {*} address
 * @return {*}
 */
function onContract(address) {
  const contractAddress = getContractAddress();

  openUrl(`${contractAddress.scanURL}/address/${address}`, "onContract");
}

const viewLink = computed(() => {
  const contractAddress = getContractAddress();

  return `${contractAddress.scanURL}/address/${props.info.poolInfo.sTokenAddress}`;
});

/**
 * @description: 计算池子倒计时所需要的块高度
 * @param {*}
 * @return {*}
 */

function onWebsite(url) {
  openUrl(url, "onWebsite");
}
</script>

<style lang="scss" scoped>
.panel {
  position: relative;
}

.header {
  @include flex-center-v;
  height: 86px;
  margin: -32px -32px 0;
  padding: 0 32px;
  background: #fffaf7;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  color: #a4a5b2;
  font-size: 26px;
  .lt {
    @include flex-center-v;
    flex: 1;
    span {
      flex-shrink: 0;
      margin-right: 10px;
    }
    a {
      @include flex-center-v;
      color: #ef814f;
      &:hover {
        cursor: pointer;
        text-decoration: underline;
        svg {
          display: unset;
        }
      }
    }
    svg {
      display: none;
      color: $primary;
      width: 20px;
      height: 20px;
      margin-left: 10px;
    }
  }
  .rt {
    @include flex-center-h;
    flex-direction: column;
    text-align: right;
    small {
      height: 18px;
      font-size: 14px;
      font-family: $caption;
      line-height: 18px;
    }
    p {
      height: 20px;
      font-size: 16px;
      color: #333;
      line-height: 20px;
    }
  }
}

.main {
  padding: 20px;
  background: #f8f8f8;
  border-radius: 16px;
  header {
    @include flex;
  }
  .coin-info {
    @include flex-center-v;
    margin-right: 8px;
    span {
      margin-left: 12px;
      font-size: 27px;
      transform: translateY(2px);
      font-weight: 600;
    }
  }
  .price,
  .rating {
    margin-left: 40px;
    small {
      color: #a4a5b2;
      font-size: 14px;
      font-family: $caption;
    }
    p {
      font-size: 18px;
      margin-top: 4px;
    }
  }

  .links {
    @include flex-center-v;
    flex: 1;
    justify-content: flex-end;
    transform: translateY(1px);
    color: #a4a5b2;
    .link-item {
      @include flex-center-v;
      margin-left: 10px;
      padding: 6px;
      transition: all 0.3s;
      cursor: pointer;
      font-size: 14px;
      border-radius: 8px;
      .link-icon {
        width: 16px;
        height: 16px;
        // transform: translateY(-1px);
      }
      &:hover {
        background: #909399;
        color: #fff;
      }
      span {
        margin-left: 5px;
        transform: translateY(1px);
        font-size: 16px;
      }
    }
  }

  .information {
    position: relative;
    height: 48px;
    margin-top: 12px;
    p {
      position: absolute;
      left: 0;
      top: 50%;
      @include ellipsis(2);
      line-height: 24px;
      font-size: 14px;
      color: #a4a5b2;
      transform: translateY(-50%);
    }
  }

  .alert {
    position: relative;
    margin-top: 12px;
    color: $primary;
    &.hidden {
      visibility: hidden;
    }
    .icon {
      position: absolute;
      left: 0;
      top: 1px;
    }
    p {
      @include ellipsis(2);
      padding: 0 6px;
      margin-left: 12px;
    }
  }
}

.footer {
  @include flex;
  justify-content: space-between;
  margin-top: 24px;
  .lt {
    @include flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 4.5;
    .info {
      p {
        color: #a4a5b2;
        margin-bottom: 6px;
        font-family: $caption;
        font-size: 16px;
        line-height: 28px;
      }
      h2 {
        font-size: 22px;
        height: 28px;
      }
    }
  }

  .rt {
    @include flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 7;
    .total-deposited,
    .total-borrowed {
      .right {
        display: flex;
        justify-content: flex-end;
      }
      h4 {
        @include flex-center-v;
        justify-content: space-between;

        &:last-child {
          margin-top: 9px;
          padding-top: 9px;
          border-top: 1px solid #ebebeb;
        }
        span {
          font-size: 16px;
          color: #a4a5b2;
          font-family: $caption;
        }
        p {
          @include flex-center-v;
          font-size: 22px;
          span {
            margin-left: 10px;
            margin-right: 8px;
          }
          .tag {
            margin-left: 4px;
            font-size: 14px;
          }
        }
      }
    }
    .total-borrowed {
      margin-top: 56px;
    }
  }
}
.view-pool {
  width: 72px;
  height: 40px;
  border-radius: 8px;
  padding: 4px 10px;
  transition: all 0.2s;
  .block-explorer {
    width: 48px;
    height: 32px;
    opacity: 0.6;
  }

  &:hover {
    background-color: #fef0e9;
    .block-explorer {
      opacity: 1;
    }
  }
}
</style>
