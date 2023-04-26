<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Proposals Stats</h4>
    </header>

    <div class="panel">
      <ul class="proposal-list">
        <li v-for="item in state.counter" :key="item.status" class="proposal-item">
          <div class="proposal-info">
            <span class="status">{{ item.status }}</span>
            <div class="num">
              <shorterSkeleton v-if="loading.getProposalsCounter" style="padding: 1px 0; width: 60px" animated>
                <template #template>
                  <shorterSkeletonItem style="height: 17px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ getCount(item.status, proposalsCounter) }}
              </span>
            </div>
          </div>
          <shorterProgress
            :color="item.color"
            :stroke-width="8"
            :percentage="getPercentage(item.status, proposalsCounter)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { inject, reactive } from "vue";

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
});

const loading = inject("loading");
const proposalsCounter = inject("proposalsCounter");
const state = reactive({
  counter: [
    {
      status: "Active",
      color: "#d08fff",
      count: 0,
      percentage: 0,
    },
    {
      status: "Passed",
      color: "#02d396",
      count: 0,
      percentage: 0,
    },
    {
      status: "Failed",
      color: "#FD7676",
      count: 0,
      percentage: 0,
    },
  ],
});

function getCount(status, counter) {
  status = status.toLowerCase();
  return counter[status];
}

function getPercentage(status, counter) {
  status = status.toLowerCase();
  return (counter[status] * 100) / counter["total"] || 0;
}
</script>

<style lang="scss" scoped>
.panel {
  padding: 24px 32px;
}

.proposal-list {
  @include flex;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
}

.proposal-item {
  width: 100%;
  height: 56px;
  .proposal-info {
    @include flex-center-v;
    justify-content: space-between;
    margin-bottom: 8px;
    .status {
      font-size: 16px;
    }
  }
  .progress-bar {
    // margin-top: 8px;
    width: 100%;
    height: 8px;
    background: #f8f8f8;
    border-radius: 4px;
  }
}
</style>
