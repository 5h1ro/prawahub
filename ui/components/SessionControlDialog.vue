<script setup>

const visible = defineModel("visible");
const session = defineModel("session");

const toast = useToast();

function hide() {
  visible.value = false;
}
</script>

<template>
  <Dialog
      v-model:visible="visible"
      :modal="true"
  >
    <template #header>
      <span class="p-dialog-title flex gap-1">
        <span>
          {{ session?.name }}
        </span>
          <SessionStatusTag
              :status="session.status"
          ></SessionStatusTag>
        <span>({{ session?.server?.name }})</span>
      </span>

    </template>
    <SessionControl :session="session"></SessionControl>
  </Dialog>

</template>

<style scoped lang="scss">

</style>
