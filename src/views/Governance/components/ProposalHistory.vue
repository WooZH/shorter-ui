<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Proposal Timeline</h4>
    </header>
    <div class="panel">
      <ul v-if="!loading">
        <li v-for="(item, index) in history" :key="index" class="history-item" :class="{ active: item.status > 1 }">
          <div :class="['icon', item.status == 2 ? 'error' : 'success']">
            <CircleCheckFilled />
          </div>
          <div class="main">
            <span v-if="item.status">{{ getProposalStatusText(item.status) }}</span>
            <p v-else>
              Created by
              <span class="color-primary">
                {{ ellipsisStr(creator) }}
              </span>
            </p>
            <div class="date">{{ formatDate(item.time) }} ({{ tz.text }})</div>
          </div>
          <div v-if="item.hash" class="link" @click="onBrowser(item.hash)">
            <svg class="shorter-icon" aria-hidden="true">
              <use xlink:href="#icon-share" />
            </svg>
          </div>
        </li>
      </ul>
      <ul v-else>
        <li v-for="i in 3" :key="i">
          <shorterSkeleton height="42px" animated>
            <template #template>
              <shorterSkeletonItem style="width: 30%; height: 20px" />
              <br />
              <shorterSkeletonItem style="width: 60%; height: 20px; margin-top: 6px; margin-bottom: 20px" />
            </template>
          </shorterSkeleton>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { useProposal } from "@/hooks/useProposal";
import { formatDate, ellipsisStr } from "@/utils/format";
import { openUrl } from "@/utils/url";
import { useTimezone } from "@/hooks/useTimezone";
import { getContractAddress } from "@/contract";
import { Message } from "@/hooks/useMessage";

const props = defineProps({
  history: {
    type: Array,
    default: () => [],
  },
  creator: {
    type: String,
    default: "",
  },
  loading: {
    type: Boolean,
    default: () => true,
  },
});

const { getProposalStatusText } = useProposal();
const { tz } = useTimezone();

function onBrowser(hash) {
  if (hash) {
    const contractAddress = getContractAddress();
    openUrl(`${contractAddress.scanURL}/tx/${hash}`, "onBrower");
  } else {
    Message.warning("Unavailable transaction data");
  }
}
</script>

<style lang="scss" scoped>
.panel {
  align-self: start;
  min-height: 161px;
}
.history-item {
  @include flex-center-v;
  margin-top: 24px;
  .icon {
    position: relative;
    color: #a4a5b2;
    font-size: 24px;
    width: 24px;
    height: 24px;
  }
  .main {
    flex: 1;
    margin-left: 11px;
    .date {
      margin-top: 8px;
      color: #a4a5b2;
    }
  }
  .link {
    width: 20px;
    height: 20px;
    cursor: pointer;
    svg {
      width: 20px;
      height: 20px;
      color: #909399;
    }
    &:hover {
      svg {
        color: $primary;
      }
    }
  }
  &:not(&:last-child) .icon::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translateX(-50%) translateY(4px);
    width: 0;
    height: 32px;
    border-left: 1px dashed #a4a5b2;
  }
  &:first-child {
    margin-top: 0;
  }
}

.history-item.active {
  .success {
    color: #02d396;
    &::after {
      border-color: #02d396 !important;
    }
  }
  .error {
    color: #f79f8b;
    &::after {
      border-color: #f79f8b !important;
    }
  }
}
</style>
