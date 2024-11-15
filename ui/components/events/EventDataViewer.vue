<script setup>
const props = defineProps(['data']);
const showData = computed(() => {
  const data = {...props.data}
  delete data._json
  return {
    payload: data.payload,
    id: data.id,
    session: data.session,
    event: data.event,
    ...data,
  }
})

async function copy(event) {
  await navigator.clipboard.writeText(JSON.stringify(
      showData.value,
      null,
      2
  ));
  event.preventDefault();
}

</script>

<template>
  <div class="flex gap-2">
    <div style="margin-top: -0.75rem">
      <Button
          rounded
          text=""
          v-tooltip.focus.bottom="{ value: 'Copied to clipboard' }"
          icon="pi pi-copy"
          severity="secondary"
          @click="copy($event)">
      </Button>
    </div>
    <div style="max-width: 100%">
      <vue-json-pretty
          :data="showData"
          :deep="2"
          :showLine="false"
          :showIcon="true"
          theme="dark"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>