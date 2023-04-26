<template>
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" v-if="$route.meta.keepAlive" :key="$route.name" />
    </keep-alive>
    <component :is="Component" v-if="!$route.meta.keepAlive" :key="$route.name" />
  </router-view>
  <transition>
    <Splash v-if="isSplash" />
  </transition>
</template>

<script setup>
import { onMounted, watch, ref } from "vue";
import { useRoute } from "vue-router";

import { getTokenList, getTokenTop } from "./api/tokens";
import { load as loadIntercom, boot as bootIntercom, update as updateIntercom } from "@/plugins/intercom";
import { getContractAddress } from "@/contract";
import { Local } from "./utils/localStorage";
import Splash from "@/layout/Splash.vue";

const route = useRoute();
const isSplash = ref(true);

async function getToken() {
  getTokenList().then(res => {
    const shorterTokenList = res.tokens;

    const shorterStorage = Local.get("shorterStorage");
    shorterStorage[getContractAddress().networkName].common.token.list = shorterTokenList;
    Local.set("shorterStorage", shorterStorage);
  });

  getTokenTop().then(res => {
    const tokenTop = res;
    const shorterStorage = Local.get("shorterStorage");
    shorterStorage[getContractAddress().networkName].common.token.top = tokenTop;
    Local.set("shorterStorage", shorterStorage);
  });
}
getToken();

onMounted(() => {
  loadIntercom();
  bootIntercom();
  setTimeout(() => {
    isSplash.value = false;
  }, 2000);
});

watch(
  () => route.name,
  () => {
    updateIntercom();
  },
);
</script>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
