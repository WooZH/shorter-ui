<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Latest Proposals</h4>
    </header>
    <div class="panel">
      <shorterSkeleton v-if="state.loading.fetchProposals" animated>
        <template #template>
          <div v-for="i in 3" :key="i" class="skeleton-container">
            <div class="lt">
              <shorterSkeletonItem style="height: 20px" />
              <footer>
                <shorterSkeletonItem style="height: 20px; width: 50px" />
                <shorterSkeletonItem style="height: 20px; width: 50%; margin-left: 12px" />
              </footer>
            </div>
            <shorterSkeletonItem style="width: 58px; height: 24px" />
          </div>
        </template>
      </shorterSkeleton>
      <template v-else>
        <ProposalList :proposal-list="state.proposals" />
        <footer v-if="state.proposalsCount > 5" class="footer">
          <router-link :to="{ name: 'Proposals', query: route.query }" class="link">View all proposals</router-link>
        </footer>
      </template>
    </div>
  </div>
</template>

<script setup>
import { inject, reactive, watch } from "vue";
import { useRoute } from "vue-router";

import ProposalList from "./ProposalList";

import * as Committee from "@/contract/committee";

import { getProposalIdList } from "@/api/governance";

import { useWallet } from "@/hooks/useWallet";
import { useProposal } from "@/hooks/useProposal";

import { blockToTime } from "@/utils/format";

const loading = inject("loading");
const proposalsCounter = inject("proposalsCounter");

const route = useRoute();
const { chain } = useWallet();
const { getLastTimeMap, getTokenNameMap } = useProposal();

const state = reactive({
  proposals: [],
  loading: {
    fetchProposals: false,
  },
  proposalsCount: 0,
});

watch(
  () => chain.id,
  () => {
    state.proposals = [];
    resetProposalCounter();
    initData(true);
  },
);

initData(true);
async function initData(withLoading = false) {
  try {
    state.loading.fetchProposals = withLoading;
    loading["getProposalsCounter"] = withLoading;

    const idList = (await getIdsList()) || [];
    getProposalsCounter(idList);
    await getProposals(idList.slice(0, 5));

    state.proposalsCount = idList.length;
  } catch (error) {
    console.error("getProposals", error);
  } finally {
    state.loading.fetchProposals = false;
  }
}

async function getIdsList() {
  try {
    const res = await getProposalIdList();
    const list = _.orderBy(res, ["blockNumber"], ["desc"]);
    return list;
  } catch (e) {
    console.error("get proposal list error =>", e);
  }
}

async function getProposals(idList) {
  try {
    if (!idList.length) {
      state.proposals = [];
      return false;
    }

    const proposals = await Committee.getProposals(idList);

    proposals.forEach(async item => {
      if (item.status === 0) {
        const time = await blockToTime(item.startBlock, "MMM DD, YYYY HH:mm");
        item.lastTime = time;
      }
    });

    const [nameMap, timeMap] = await Promise.all([getTokenNameMap(proposals), getLastTimeMap(proposals)]);
    proposals.forEach((item, index) => {
      const id = item.id;
      if (nameMap[id]) {
        proposals[index].tokenName = nameMap[id];
      }
      if (timeMap[id]) {
        proposals[index].lastTime = timeMap[id];
      }
    });

    state.proposals = proposals;
    return true;
  } catch (error) {
    console.error("get Proposals", error);
  }
}

async function getProposalsCounter(idList) {
  try {
    if (!idList.length) {
      resetProposalCounter();
      return;
    }

    loading["getProposalsCounter"] = true;

    const allProposals = (await Committee.getProposalsCounter(idList)) || [];
    resetProposalCounter();
    //status
    //active:0
    //passed:1,3,4
    //failed:2
    allProposals.forEach(({ status }) => {
      proposalsCounter.total += 1;
      if (status == 0) {
        proposalsCounter.active += 1;
      } else if (status == 2) {
        proposalsCounter.failed += 1;
      } else if (status == 1 || status == 3 || status == 4) {
        proposalsCounter.passed += 1;
      } else {
        proposalsCounter.error += 1;
      }
    });
  } finally {
    loading["getProposalsCounter"] = false;
  }
}

function resetProposalCounter() {
  proposalsCounter.active = 0;
  proposalsCounter.passed = 0;
  proposalsCounter.failed = 0;
  proposalsCounter.error = 0;
  proposalsCounter.total = 0;
}
</script>

<style lang="scss" scoped>
.panel-container {
  margin-top: 16px;
  .panel {
    .footer {
      @include flex-center;
      margin-bottom: -32px;
      padding-top: 22px;
      padding-bottom: 20px;
      .link {
        font-weight: 600;
        &:hover {
          color: $primary;
        }
      }
    }
  }
}
.skeleton-container {
  @include flex-center-v;
  height: 84px;
  justify-content: space-between;
  .lt {
    width: 50%;
    footer {
      margin-top: 12px;
    }
  }
}
</style>
