<script setup>
const props = defineProps({
  server: {
    type: Object,
    required: true
  },
  submitted: {
    type: Boolean,
    required: false,
    default: false
  },

});
const visible = defineModel("visible");
const toast = useToast();
const server = reactive({...props.server});

function saveServer() {
  toast.add({severity: 'success', summary: 'Success', detail: 'Server Saved', life: 3000});
  hide()
}

function hide() {
  visible.value = false;
}

</script>

<template>
  <Dialog v-model:visible="visible" :style="{ width: '450px' }" header="Server" :modal="true" class="p-fluid">
    <img :src="'/demo/images/product/' + server.image" :alt="server.image" v-if="server.image" width="150"
         class="mt-0 mx-auto mb-5 block shadow-2"/>
    <div class="field">
      <label for="name">Name</label>
      <InputText id="name" v-model.trim="server.name" required="true" autofocus :invalid="submitted && !server.name"/>
      <small class="p-invalid" v-if="submitted && !server.name">Name is required.</small>
    </div>
    <div class="field">
      <label for="connection-url">API URL</label>
      <InputText id="connection-url" v-model.trim="server.connection.url" required="true"
                 :invalid="submitted && !server.connection.url"/>
      <small class="p-invalid" v-if="submitted && !server.connection.url">URL is required.</small>
    </div>
    <div class="field">
      <label for="name">API Key</label>
      <Password id="name" v-model.trim="server.connection.key" :feedback="false"/>
    </div>

    <template #footer>
      <Button label="Cancel" icon="pi pi-times" text="" @click="hide"/>
      <Button label="Save" icon="pi pi-check" text="" @click="saveServer"/>
    </template>
  </Dialog>

</template>

<style scoped lang="scss">

</style>
