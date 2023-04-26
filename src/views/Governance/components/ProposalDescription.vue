<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Description</h4>
    </header>
    <div class="panel">
      <template v-if="!loading && !state.loading.fetchDescription">
        <div class="address-container">
          <span>Token Contract Address</span>
          <Copy v-model="state.tokenContract">
            <p>{{ tokenContract }}</p>
          </Copy>
        </div>
        <div class="description">
          {{ state.describe }}
        </div>
      </template>
      <shorterSkeleton v-else animated>
        <template #template>
          <div class="skeleton-container">
            <shorterSkeletonItem style="height: 20px; width: 30%" />
            <br />
            <shorterSkeletonItem style="height: 24px; width: 80%; margin-top: 10px" />
            <br />
            <shorterSkeletonItem style="height: 24px; width: 50%; margin-top: 15px" />
          </div>
        </template>
      </shorterSkeleton>
    </div>
  </div>
</template>

<script setup>
import { watchEffect, reactive } from "vue";
// import * as TokenAction from "@/api/tokens";

const props = defineProps({
  loading: {
    type: Boolean,
    default: () => true,
  },
  tokenContract: {
    type: String,
    default: () => "",
  },
});

const state = reactive({
  describe: "",
  tokenContract: "",
  loading: {
    fetchDescription: false,
  },
});

watchEffect(() => {
  if (props.tokenContract) {
    state.tokenContract = props.tokenContract;
  }
});
</script>

<style lang="scss" scoped>
.panel {
  align-self: start;
  min-height: 161px;
}

.address-container {
  span {
    color: #11142d;
  }
  p {
    margin-top: 4px;
    color: #a4a5b2;
  }
}
.description {
  padding-top: 20px;
  margin-top: 20px;
  color: #a4a5b2;
  line-height: 18px;
  border-top: 1px solid #e4e4e4;
}
</style>
