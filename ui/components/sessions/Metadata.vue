<script setup>
const props = defineProps(['metadata'])
/**
 * metadata here is key=value object
 */

</script>

<template>
  <div class="metadata">
    <pre v-for="(value, key) in metadata" :key="key">{{ key }}={{ value }}</pre>
  </div>

</template>

<style scoped lang="scss">
.metadata {
  font-size: 0.9rem
}
.metadata__value {
  margin: 0.5rem
}


</style>
