<template>
  <ul v-if="proposalList.length > 0" class="proposal-list">
    <li v-for="(proposal, index) in proposalList" :key="index" class="proposal-item" @click="toDetail(proposal.id)">
      <div class="content">
        <div class="message">
          {{ generateTitle(proposal.tokenName, proposal.leverage, proposal.durationDays) }}
        </div>
        <div class="sponsor">
          <Tag class="tag">
            {{ getProposalTag(proposal.tag) }}
          </Tag>
          <div class="date" v-html="generateSubtitle(proposal.status, proposal.lastTime)" />
        </div>
      </div>
      <ProposalStatus :status="getTitleStatus(proposal.status).toLowerCase()">
        {{ getTitleStatus(proposal.status) }}
      </ProposalStatus>
    </li>
  </ul>
  <Empty v-else content="No proposals yet" />
</template>

<script setup>
import { useProposal } from "@/hooks/useProposal";
import ProposalStatus from "./ProposalStatus.vue";
import { useRouter, useRoute } from "vue-router";

const props = defineProps({
  proposalList: {
    type: Array,
    default: () => [],
  },
});

const { generateTitle, getTitleStatus, generateSubtitle, getProposalTag } = useProposal();
const router = useRouter();
const route = useRoute();

function toDetail(id) {
  router.push({
    name: "ProposalDetail",
    params: { id },
    query: route.query,
  });
}
</script>

<style lang="scss" scoped>
.proposal-list {
  .proposal-item {
    transition: all 0.3s;
    @include flex-center-v;
    height: 88px;
    border-left: 2px solid transparent;
    border-bottom: 1px solid #e4e4e4;
    &:hover {
      background: #f8f8f8;
      border-bottom-color: transparent;
      border-left: 2px solid $primary;
      margin: 0 -16px;
      padding: 0 16px;
      border-top-right-radius: 12px;
      border-bottom-right-radius: 12px;
      cursor: pointer;
      .tag.default {
        transition: all 0.3s;
        background: #fff;
        color: #a4a5b2;
      }
    }
    &:last-child {
      border-bottom: 1px solid transparent;
    }
    .content {
      flex: 1;
      .message {
        font-size: 16px;
      }
      .sponsor {
        @include flex-center-v;
        margin-top: 8px;
        color: #a4a5b2;
        .date {
          margin-left: 8px;
        }
      }
    }
    .status {
      font-size: 16px;
      &.status-0 {
        color: $purple;
      }
      &.status-1,
      &.status-3,
      &.status-4 {
        color: $green;
      }
      &.status-2 {
        color: $primary;
      }
    }
  }
}
</style>
