<script setup>
import {useServerStore} from "../stores/useServerStore";

const store = useServerStore()
const props = defineProps({
  session: Object,
})

const {
  data,
  pending,
  error,
  refresh
} = useAsyncData(async () => {
  const result = await store.getScreenshot(props.session.server.id, props.session.name)
  console.log(result)
  return result
})

defineExpose({
  refresh,
})

</script>

<template>
  <Skeleton
      v-if="pending"
      width="40rem"
      height="20rem"
  ></Skeleton>
  <Base64Img
      v-if="!pending && data"
      :data="data.data"
      :mimetype="data.mimetype"
  ></Base64Img>
  <pre style="background-color: #f8f9fa; padding: 1rem; color: red" v-if="error">
    {{ error }}
  </pre>

</template>

<style scoped lang="scss">

</style>
