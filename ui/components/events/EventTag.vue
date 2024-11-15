<script setup>
import {WAHAEventColor} from "../../services/WAHAEvents";

const props = defineProps(["event"])
const color = computed(() => {
  return WAHAEventColor[props.event] || "rgb(114,166,234)"

})
const style = computed(() => {
  return {
    background: "transparent",
    border: "2px solid rgb(66, 75, 87)",
    color: color.value,
    "font-size": "0.9rem",
  }
})

</script>

<template>
  <Tag
      :style="style"
      :value="props.event"
  >
  </Tag>
</template>

<style scoped lang="scss">

</style>