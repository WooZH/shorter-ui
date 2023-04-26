<template>
  <div class="sub-pools-empty-notice">
    <div class="wrap-content">
      <div class="container">
        <svg class="shorter-icon" aria-hidden="true">
          <use xlink:href="#icon-crown-coin" />
        </svg>
      </div>
      <h4>No {{ poolName }} pools yet</h4>
      <template v-if="create">
        <p>
          Want to create a pool as a Provider to gain passive income?
          <a href="https://docs.shorter.finance/roles/provider/create-a-pool.html" target="_blank">Learn more</a>
        </p>
        <shorterButton plain type="primary" class="btn-create-pool" @click="createPool">
          <svg class="shorter-icon" aria-hidden="true">
            <use xlink:href="#icon-farming" />
          </svg>
          <span>Yes, create my own pool</span>
        </shorterButton>
      </template>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  poolName: {
    type: String,
    default: () => "",
  },
  token: {
    type: Object,
    default: () => {},
  },
  create: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toCreatePool"]);

function createPool() {
  emit("toCreatePool", props.token);
}
</script>

<style lang="scss" scoped>
.sub-pools-empty-notice {
  width: 100%;
  height: 338px;
  @include flex-center;

  .wrap-content {
    text-align: center;
  }

  .container {
    .shorter-icon {
      width: 100px;
      height: 100px;
    }
  }

  h4 {
    margin-top: 16px;
    font-family: "Haas Grot Disp";
    font-weight: 700;
    color: #303133;
    font-size: 16px;
  }

  p {
    display: flex;
    margin-top: 17px;
    color: #909399;
    line-height: 17px;
    a {
      cursor: pointer;
      color: $primary;
      margin-left: 5px;
      text-decoration: underline dashed;
    }
  }

  .btn-create-pool {
    width: 260px;
    height: 48px;
    border-radius: 8px;
    margin-top: 24px;
    display: inline-block;
    svg {
      margin-right: 4px;
      transform: translateY(-1px) scale(1.2);
    }
  }
}
</style>
