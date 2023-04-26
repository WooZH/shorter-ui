<!-- shorter-ui button -->
<template>
  <button
    class="s-button"
    :disabled="disabled"
    :class="{
      loading: loading,
      default: type,
      primary: primary || type == 'primary',
      'is-plain': plain,
      'is-disabled': disabled,
    }"
  >
    <span v-if="hasSlot" class="text-default"><slot /></span>
    <span class="text-loading" :class="{ 'no-slot': !hasSlot }"><span class="circle" /></span>
  </button>
</template>

<script>
export default {
  name: "ShorterButton"
}
</script>

<script setup>
defineProps({
  plain: {
    default: false,
    type: Boolean,
  },
  type: {
    default: "default",
    type: String,
  },
  primary: {
    default: false,
    type: Boolean,
  },
  disabled: {
    default: false,
    type: Boolean,
  },
  loading: {
    default: false,
    type: Boolean,
  },
  hasSlot: {
    default: true,
    type: Boolean,
  },
});
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";
.s-button {
  // width: 100%;
  font-size: 14px;
  border-radius: 12px;
  font-family: "Haas Grot Text";
  // display: inline-block;
  line-height: 1;
  // min-height: 40px;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid $primary;
  text-align: center;
  outline: none;
  margin: 0;
  transition: all 0.1s;
  padding: 0 20px;
  display: -moz-box;
  display: -ms-flexbox;
  display: flex;
  -moz-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
  -moz-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  -webkit-box-sizing: border-box;
  -moz-box-sizing: border-box;
  box-sizing: border-box;

  .circle {
    display: none;
    width: 0;
  }
}
.default {
  color: #606266;
  border-color: #a4a5b2;
  background: #fff;
  &:not(.is-disabled):hover {
    background: $primary-dark;
    border-color: $primary-dark;
    color: #ffffff;
  }
  &:focus,
  &:active {
    color: #606266;
    border-color: #a4a5b2;
    background: #fff;
  }
  &.is-disabled {
    color: rgba(#bfbfbf, 0.3);
    border-color: rgba(#bfbfbf, 0.3);
    background: #fff;
    cursor: not-allowed;
  }
}

.primary {
  color: #ffffff;
  background-color: $primary;
  border-color: $primary;
  font-weight: 500;
  &:not(.is-disabled):hover {
    background: $primary-dark;
    border-color: $primary-dark;
    color: #ffffff;
  }
  &.is-disabled {
    background: #eee9e7;
    border-color: #eee9e7;
    color: #c3bcb9;
    cursor: not-allowed;
  }
  &:active,
  &:focus {
    color: #fff;
    background: $primary;
    border-color: $primary;
  }
  &:disabled:active {
    background: #eee9e7;
    border-color: #eee9e7;
    color: #c3bcb9;
  }

  &.is-plain {
    background: #fff;
    color: $primary;
    border-color: $primary;
    font-weight: 400;
    &.is-disabled {
      background: #fff;
      border-color: rgba($primary, 0.3);
      color: rgba($primary, 0.3);
      cursor: not-allowed;
    }
    &:active,
    &:focus {
      background: #fff;
      border-color: $primary;
      color: $primary;
    }
  }
}
// .small {
// }
.medium {
  height: 32px;
  border-radius: 8px;
}
.large {
  height: 40px;
  border-radius: 10px;
}
.big {
  height: 50px;
}
.huge {
  height: 60px;
  font-size: 16px;
}
.massive {
  height: 70px;
}

.full {
  width: 100%;
}

.text-loading {
  transition: all 0.1s;
  width: 0;
  opacity: 0;
}
.text-default {
  transition: all 0.1s;
}
.loading {
  opacity: 0.9;
  display: flex;
  transition: all 0.1s;

  background-color: rgba($primary, 0.8);
  cursor: not-allowed;
  pointer-events: none;
  .text-loading {
    width: 16px;
    height: 16px;
    opacity: 1;
    transform: translateX(14px);
    transform-origin: left center;
  }
  .no-slot {
    transform: translateX(0);
  }
  .circle {
    display: inline-block;
    width: 14px;
  }
}

.circle {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid #fff;
  border-color: rgba($primary, 0.8);
  border-right-color: transparent;
  border-width: 2px;
  animation: round 1s infinite;
  border-radius: 50%;
}
.primary .circle {
  border-color: #fff;
  border-right-color: rgba($primary, 0);
}
.is-plain .circle {
  border-color: $primary;
  border-right-color: rgba($primary, 0);
}

@keyframes round {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
