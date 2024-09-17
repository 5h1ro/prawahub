<script setup>
import {sleep} from "../../services/utils";

const store = useServerStore()
const props = defineProps({
  session: Object,
})

const {
  data,
  pending,
  error,
  refresh
} = useAsyncData(
    `session-qr-${props.session.server.id}-${props.session.name}`,
    async () => {
      await sleep(1000)
      return await store.getQR(props.session.server.id, props.session.name)
    })

</script>

<template>
  <div class="" style="min-width:20rem;">
    <div class="flex justify-content-center align-items-center">
      <h5 class="m-0">QR</h5>
      <RefreshButton @click="refresh"></RefreshButton>
    </div>
    <div class="m-auto w-full">
      <template v-if="pending">
        <ProgressBar mode="indeterminate" style="height: 3px"></ProgressBar>
        <Skeleton
            v-if="!data && !error"
            width="100%"
            height="20rem"
        ></Skeleton>
      </template>
      <div class="flex justify-content-center">
        <Base64Img
            v-if="data"
            :data="data.data"
            :mimetype="data.mimetype"
        ></Base64Img>
        <pre
            v-if="error"
            style="background-color: #f8f9fa; padding: 1rem; color: red; white-space: pre-wrap;"
        >
{{ error.cause.response.data.message || error.cause.response.data || error }}
  </pre>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
