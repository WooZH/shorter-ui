<template>
  <div class="logo-container" :class="{ fold: fold }" @click="goHome">
    <svg v-show="!fold" class="logo shorter-icon" aria-hidden="true">
      <use xlink:href="#icon-logo" />
    </svg>
    <svg v-show="fold" class="logo-2 shorter-icon" aria-hidden="true">
      <use xlink:href="#icon-logo_2" />
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  fold: Boolean,
});

function goHome() {
  console.log("window.location", window.location);
  const PRE_APP_SITE = "https://pre.ipilabs.com";
  const PRE_HOME_SITE = "https://pre-site.ipilabs.com";
  const HOME_SITE = "https://shorter.finance";
  if (window.location.origin === PRE_APP_SITE) {
    window.location.href = PRE_HOME_SITE;
  } else {
    window.location.href = HOME_SITE;
  }
}
</script>

<style lang="scss" scoped>
.logo-container {
  position: relative;
  display: block;
  margin: 28px 0 30px 28px;
  transition: 0.18s;
  z-index: 0;
  .logo {
    width: 158px;
    height: 52px;
  }
  .logo-2 {
    width: 40px;
    height: 40px;
  }
  cursor: pointer;
  &.fold {
    width: 40px;
    height: 40px;
    margin: 13px auto 13px auto;
    .beta-tag {
      right: -18px;
      top: -18px;
    }
  }
  .beta-tag {
    @include flex-center;
    position: absolute;
    right: 0px;
    top: -8px;
    background: $primary;
    height: 16px;
    padding: 0 5px;
    border-radius: 8px 8px 8px 0px;
    span {
      font-size: 10px;
      font-weight: 600;
      color: #ffffff;
    }
  }
}
</style>
