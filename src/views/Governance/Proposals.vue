<template>
  <Layout title="Proposals" :back="{ name: 'Governance', text: 'Governance' }">
    <Tabs v-model="state.curTab">
      <TabItem :title="getTabTitle('All')" />
      <TabItem :title="getTabTitle('Active')" />
      <TabItem :title="getTabTitle('Community')" />
      <TabItem :title="getTabTitle('Pools')" />
      <TabItem :title="getTabTitle('Failed')" />
    </Tabs>
    <div class="tab-content">
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
        <ProposalList v-else :proposal-list="state.proposalList" />
      </div>
    </div>
  </Layout>
</template>
<script setup>
import { computed, reactive } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";

import ProposalList from "./components/ProposalList";

import * as Committee from "@/contract/committee";

import { getProposalIdList } from '@/api/governance';
import { useProposal } from "@/hooks/useProposal";
import { blockToTime } from "@/utils/format";

const router = useRouter();
const { getLastTimeMap, getTokenNameMap } = useProposal();

const state = reactive({
  curTab: 0,
  proposals: [],
  loading: {
    fetchProposals: false,
  },
  proposalList: computed(() => {
    let result = [];
    const curTab = state.curTab;
    if (curTab == 0) {
      // All
      result = state.proposals;
    } else if (curTab == 1) {
      // Active
      result = state.proposals.filter(item => item.status * 1 === 0 || item.status * 1 === 1);
    } else if (curTab == 2) {
      // Community
      result = state.proposals.filter(item => item.tag == 0);
    } else if (curTab == 3) {
      // Pools
      result = state.proposals.filter(item => item.status * 1 == 3 || item.status * 1 == 4);
    } else if (curTab == 4) {
      // Failed
      result = state.proposals.filter(item => item.status * 1 == 2);
    }
    return result;
  }),
});

const counter = reactive({
  all: 0,
  active: 0,
  community: 0,
  pools: 0,
  failed: 0,
});

getProposals(true);
async function getProposals(withLoading = false) {
  try {
    state.loading.fetchProposals = withLoading;
    const res = await getProposalIdList();
    const list = _.orderBy(res, ["blockNumber"], ["desc"]);

    const listLength = list.length || 0;
    const callList = [];
    let proposals = [];
    const requestStep = 100;

    if (listLength > requestStep) {
      const callCount = Math.ceil(listLength / requestStep);
      console.log("proposals count", listLength, callCount);
      for (let i = 0; i < callCount; i++) {
        const tmpList = list.concat();
        callList.push(tmpList.splice(i * requestStep, requestStep));
      }

      const promiseList = callList.map(item => {
        return Committee.getProposals(item);
      });
      const resultArr = await Promise.all(promiseList);
      resultArr.forEach(res => {
        proposals.push(...res);
      });
    } else {
      console.log("list", list, list.length);
      proposals = await Committee.getProposals(list);
    }

    getCounter(proposals);

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
    });

    proposals.forEach((item, index) => {
      const id = item.id;
      if (timeMap[id]) {
        proposals[index].lastTime = timeMap[id];
      }
    });

    state.proposals = proposals;
  } catch (error) {
    console.log(error, "getProposals");
  } finally {
    state.loading.fetchProposals = false;
  }
}

function getCounter(proposals = []) {
  counter.active = 0;
  counter.failed = 0;
  counter.pools = 0;
  counter.community = 0;

  proposals.forEach(({ status, tag }) => {
    if (status == 0 || status == 1) {
      counter.active += 1;
    } else if (status == 2) {
      counter.failed += 1;
    }
    if (status == 4 || status == 3) {
      counter.pools += 1;
    } else if (tag == 0) {
      counter.community += 1;
    }
  });
  counter.all = proposals.length;
}

function getTabTitle(title) {
  let key = String(title).toLowerCase();
  const amount = counter[key];
  return amount > 0 ? `${title}(${amount})` : title;
}

const changeRouterKeepAlive = (name, keepAlive) => {
  router.options.routes.map(item => {
    if (item.name === name) {
      item.meta.keepAlive = keepAlive;
    }
  });
};

onBeforeRouteLeave((to, from) => {
  if (to.name !== "ProposalDetail") {
    changeRouterKeepAlive(from.name, false);
  } else {
    changeRouterKeepAlive(from.name, true);
  }
});
</script>

<style lang="scss" scoped>
.panel {
  border-top-left-radius: 0;
}

.pagination-container {
  margin-top: 32px;
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
