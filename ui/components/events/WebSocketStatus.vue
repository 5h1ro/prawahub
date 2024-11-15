<script setup>
const props = defineProps(['status'])

</script>

<template>
  <template v-if="status">
    Status: {{ status }}
  </template>
</template>

<style scoped lang="scss">

</style>