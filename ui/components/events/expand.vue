<script setup>
const props = defineProps(['rows', "data"])

const expanded = computed(()=>{
  return !props.rows?.[props.data.id]
})

</script>

<template>
  <template v-if="expanded">
    <i class="pi pi-angle-down"></i>
  </template>
  <template v-else>
    <i class="pi pi-angle-up"></i>
  </template>

</template>

<style scoped lang="scss">

</style>