<template>
  <Warn v-if="warn.visible" />
  <div class="layout" :class="{ down: warn.visible }">
    <Sidebar class="sidebar" />
    <main class="page" :class="{ expand: isFold }">
      <div class="main-container">
        <Header v-if="!hideHeader" v-bind="$attrs">
          <template #title>
            <slot name="title" />
          </template>
        </Header>
        <div class="wrap">
          <slot />
        </div>
        <Footer v-if="!hideFooter" />
      </div>
    </main>
    <Confirm v-if="transaction.visible" />
    <Dialog v-model="dialogsVisible.rpcNotice" width="560px">
      <DialogRPCNotice />
    </Dialog>
  </div>
</template>

<script>
export default {
  name: "Layout",
};
</script>

<script setup>
import { onMounted } from "vue";

import Sidebar from "./Sidebar.vue";
import Header from "./Header.vue";
import Warn from "./Warn.vue";
import Footer from "./Footer.vue";
import Confirm from "./Confirm.vue";
import DialogRPCNotice from "./DialogRPCNotice.vue";

import { useSidebar } from "@/hooks/useSidebar";
import { useDialog } from "@/hooks/useDialog";
import { warn } from "@/hooks/useWarning";
import { transaction } from "@/hooks/useTransaction";

const props = defineProps({
  hideFooter: {
    type: Boolean,
    default: () => false,
  },
  hideHeader: {
    type: Boolean,
    default: () => false,
  },
});

const { isFold } = useSidebar();
const { dialogsVisible } = useDialog();
onMounted(() => {
  const layout = document.querySelector(".layout");
  layout.setAttribute("title", "");
});
</script>

<style lang="scss" scoped src="./layout.scss" />
