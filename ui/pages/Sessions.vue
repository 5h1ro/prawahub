<script setup>
import {onBeforeMount} from "vue";
import {useAsyncData} from "nuxt/app";

onBeforeMount(() => {
  useAsyncData('store', () =>
      store.refresh()
  )
});
</script>

<template>
  <div class="grid">
    <div class="col-12">
      <div class="card">
        <SessionTable></SessionTable>
      </div>
    </div>
  </div>
</template>
