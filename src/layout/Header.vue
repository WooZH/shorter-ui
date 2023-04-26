<template>
  <div class="header">
    <div class="main">
      <div v-if="back" class="back">
        <div class="container" @click="goBack(back)">
          <svg class="icon shorter-icon" aria-hidden="true">
            <use xlink:href="#icon-back" />
          </svg>
          <div v-if="back.breadcrumb && back.breadcrumb.length > 0" class="breadcrumb">
            <div v-for="(item, index) in back.breadcrumb" :key="index" class="breadcrumb-item">
              <i v-if="index > 0">/</i>
              <span>
                {{ item }}
              </span>
            </div>
          </div>
          <template v-else>
            <span v-if="back.text">{{ back.text }}</span>
            <span v-else>{{ back }}</span>
          </template>
        </div>
      </div>
      <div class="title-container">
        <slot name="title" />
        <span>{{ title }}</span>
      </div>
      <p :class="{ hidden: !subtitle }" class="subtitle">
        {{ subtitle }}
      </p>
    </div>
    <div class="rt">
      <AccountWidget />
    </div>
  </div>
</template>

<script>
export default {
  name: "Header",
};
</script>

<script setup>
import { useRouter, useRoute } from "vue-router";

import AccountWidget from "./AccountWidget.vue";

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  back: {
    type: [String, Object],
    default: () => {},
  },
  subtitle: {
    type: String,
    default: "",
  },
});

const router = useRouter();
const route = useRoute();

function goBack(back) {
  if (typeof back === "object" && back.name) {
    router.push({ name: back.name, query: route.query });
  } else if (typeof back === "string") {
    router.push({ name: back, query: route.query });
  }
}
</script>
<style lang="scss" scoped>
.header {
  @include flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: 1536px;
  padding: 32px 0;
  margin: 0 3%;
  .main {
    flex: 1;
    margin-top: -4px;
    .back {
      @include flex-center-v;
      margin-bottom: 14px;
      color: #a4a5b2;
      font-family: Haas Grot Disp;
      font-weight: 600;
      font-size: 18px;
      cursor: pointer;
      .container {
        @include flex-center-v;
      }
      .icon {
        width: 24px;
        height: 24px;
        margin-right: 12px;
      }
      span {
        transform: translateY(1px);
      }

      &:hover {
        color: $primary;
      }
    }
    .subtitle {
      &.hidden {
        visibility: hidden;
      }
      margin-top: 14px;
      color: #a4a5b2;
      font-family: Haas Grot Text;
      font-size: 16px;
    }
  }
  .title-container {
    // min-width: 645px;
    max-width: 1100px;
    padding-right: 100px;
    span {
      font-family: Haas Grot Disp;
      font-weight: 600;
      font-size: 32px;
    }
  }
  .rt {
    @include flex-center-v;
    flex-shrink: 0;
  }
}
.btn-beta-program {
  line-height: 48px;
  justify-content: center;
  height: 48px;
  margin-right: 25px;
  padding: 0 20px;
  border-radius: 16px;
  font-size: 14px;
  border: 1px solid #ef7f45;
  cursor: pointer;
  color: #ef7f45;
  min-width: 165px;
  user-select: none;
}

.breadcrumb {
  @include flex-center-v;
  .breadcrumb-item {
    @include flex-center-v;
    position: relative;

    i {
      position: absolute;
      left: -20px;
      top: 58%;
      transform: translateY(-50%);
      font-size: 22px;
    }
    &:not(&:first-child) {
      margin-left: 30px;
      // span {
      //   margin-left: 12px;
      // }
    }
  }
}
</style>
<style lang="scss" scoped>
@media (min-width: 1920px) {
  .header {
    margin: 0 auto;
  }
}
</style>
