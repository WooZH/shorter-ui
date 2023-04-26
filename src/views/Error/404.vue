<template>
  <Layout :hide-footer="true" :hide-header="true">
    <div class="page-error">
      <div class="notice-content">
        <h2>PAGE NOT FOUND</h2>
        <div>
          <p>The page you're looking for was not found.</p>
          <p>Please check the URL.</p>
        </div>
        <shorterButton
          class="btn huge"
          type="primary"
          @click="
            () => {
              router.push({
                name: 'Dashboard',
                query: route.query,
              });
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
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
</script>

<style lang="scss" scoped>
@import "~@/layout/layout.scss";
@import "~@/views/Error/error.scss";
</style>
