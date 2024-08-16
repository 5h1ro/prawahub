<script setup>
const props = defineProps(['status'])
const uptime = computed(() => {
  const ms = props.status.uptime
  if (!ms) {
    return
  }
  return formatUptime(ms)
})
const startTime = computed(() => {
  const timestamp = props.status.startTimestamp
  if (!timestamp) {
    return
  }
  return new Date(timestamp)
})

</script>

<template>
  {{ uptime }} up
  <i
      v-tooltip='`Start time: ${startTime?.toLocaleString()}`'
      class="pi pi-info-circle"
  ></i>
</template>

<style scoped lang="scss">

</style>
