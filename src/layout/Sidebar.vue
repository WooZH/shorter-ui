<template>
  <div class="sidebar" :class="{ fold: isFold }">
    <div class="sidebar-header" :class="[{ 'sidebar-header-active': isFold }]">
      <Logo :fold="isFold" />
      <div class="folder-btn" @click="isFold = !isFold">
        <svg :class="['folder', { active: isFold }]" aria-hidden="true">
          <use xlink:href="#icon-burger" />
        </svg>
      </div>
    </div>
    <div class="sidebar-content">
      <ul class="menu-list">
        <li v-for="(item, index) in siderbar" :key="index">
          <router-link
            class="menu-item"
            :class="{ active: checkIsActive(item.name) }"
            :to="{ name: item.name, query: route.query }"
          >
            <svg class="shorter-icon menu-icon" aria-hidden="true">
              <use :xlink:href="item.icon" />
            </svg>
            <span class="menu-text">{{ item.text || item.name }}</span>
          </router-link>
        </li>
      </ul>
      <BalanceCard v-if="!isFold" />
    </div>
  </div>
</template>

<script>
export default {
  name: "Sidebar",
};
</script>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";

import Logo from "./Logo.vue";
import BalanceCard from "@/layout/BalanceCard.vue";

import { useSidebar } from "@/hooks/useSidebar";

const route = useRoute();
const { isFold, handleResize } = useSidebar();

const siderbar = ref(
  ["Dashboard", "Pools", "Farming", "Governance", "Liquidations"].map(item => ({
    name: item,
    text: item,
    icon: `#icon-${item.toLowerCase()}`,
  })),
);

let hasActiveItem = false;
function checkIsActive(name) {
  if (hasActiveItem) return false;
  hasActiveItem = name === route.matched[0].name || name == route.meta.root;
  return hasActiveItem;
}

onMounted(() => {
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style lang="scss" scoped>
.sidebar {
  @include flex;
  flex-direction: column;
  position: absolute;
  left: 0;
  top: 0;
  overflow-y: auto;
  height: 100%;
  width: 256px;
  background: #fff;
  box-shadow: 1px 0 0 #e4e4e4;
  transition: 0.3s;
  overflow: hidden;
}

.sidebar.fold {
  width: 96px;
  .folder {
    top: 36px;
    right: 50%;
    transform: translateX(50%);
    z-index: 1;
  }
  .sidebar-content {
    padding: 0;
  }
  .menu-item {
    @include flex-center;
    width: 48px;
    height: 48px;
    overflow: hidden;
    margin: auto;
    padding: 0;
    span,
    i {
      visibility: hidden;
      display: none;
    }
  }
}
.folder-btn {
  cursor: pointer;
  margin-right: 20px;
  @include flex-center;
}
.folder {
  right: 20px;
  top: 42px;
  width: 24px;
  height: 24px;
  cursor: pointer;
}
.sidebar-header {
  position: relative;
  display: flex;
  justify-content: space-between;
}
.sidebar-header-active {
  flex-direction: column-reverse;
  .folder-btn {
    .folder {
      transform: rotate(180deg);
    }
    margin: 20px 0;
  }
}
.sidebar-content {
  @include flex;
  flex-direction: column;
  flex: 1;
  padding: 0 20px;
  overflow-y: auto;
  transition: 0.3s;
  &::-webkit-scrollbar {
    display: none;
  }
}

.menu-list {
  flex: 1;
  line-height: 20px;
  font-weight: 600;
  .menu-item {
    font-size: 14px;
    color: #999;
    position: relative;
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 10px;
    border-radius: 12px;
    margin: 2px 0;
    transition: 0.3s;
    .menu-icon {
      width: 24px;
      height: 24px;
    }
    .menu-text {
      flex: 1;
      font-size: 16px;
      font-weight: 500;
      margin-left: 10px;
      letter-spacing: 0.1px;
    }
  }

  .menu-item {
    cursor: pointer;
    &:hover:not(.active) {
      color: $primary;
    }
  }
  .active {
    background: #fff5f0;
    color: $primary;
    transition: padding 0.2s ease;
  }
}
</style>
