<script setup>
const props = defineProps(['disabled', 'session']);
const op = ref(null);
const toggle = (event) => {
  op.value.toggle(event);
};

</script>

<template>
  <Button :disabled="disabled" type="button" icon="pi pi-camera" @click="toggle" rounded outlined/>
  <OverlayPanel ref="op" appendTo="body" :showCloseIcon="true">
    <SessionScreenshot :session="session"></SessionScreenshot>
  </OverlayPanel>
</template>

<style scoped lang="scss">

</style>
