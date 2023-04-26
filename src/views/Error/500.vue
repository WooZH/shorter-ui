<template>
  <Layout :hide-footer="true" :hide-header="true">
    <div class="page-error">
      <div class="notice-content">
        <div>
          <p>Sorry! Something went wrong.</p>
          <p>Please try again later.</p>
        </div>
        <shorterButton
          class="btn huge"
          type="primary"
          @click="
            () => {
              router.push('/dashboard');
            }
          "
        >
          <span>Navigate back home</span>
        </shorterButton>
      </div>
    </div>
  </Layout>
</template>

<script>
export default {
  name: "Error",
};
</script>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<style lang="scss" scoped>
@import "~@/layout/layout.scss";
@import "~@/views/Error/error.scss";

.page-error {
  .notice-content {
    width: 798px;
    height: 515px;
    background: url("~@/assets/images/500.svg") no-repeat;
    background-size: 798px 515px;
    padding-bottom: 0;
    margin-bottom: 40px;
    > div {
      margin-top: 0px;
    }
  }
  .btn {
    margin-bottom: -30px;
  }
}
</style>
