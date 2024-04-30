<script setup>
import {computed} from "vue";

const props = defineProps({
  data: String,
  mimetype: String,
})

const imageSrc = computed(() => `data:${props.mimetype};base64, ${props.data}`)

</script>

<template>
  <img :src="imageSrc" style="max-width:100%"/>
</template>

<style scoped lang="scss">

</style>
