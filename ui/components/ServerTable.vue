<script setup>
import {ref, onMounted, onBeforeMount} from 'vue';
import {useToast} from 'primevue/usetoast';
import {ServerInfoService} from "../service/ServerInfoService";
import {FilterMatchMode, FilterOperator} from "primevue/api";

const toast = useToast();

const servers = ref(null);
const dt = ref(null);
const filters = ref({});
const loading = ref(null);
const statuses = ref([
  {label: 'INSTOCK', value: 'instock'},
  {label: 'LOWSTOCK', value: 'lowstock'},
  {label: 'OUTOFSTOCK', value: 'outofstock'}
]);

const serverInfoService = new ServerInfoService()

const getBadgeSeverity = (inventoryStatus) => {
  switch (inventoryStatus.toLowerCase()) {
    case 'instock':
      return 'success';
    case 'lowstock':
      return 'warning';
    case 'outofstock':
      return 'danger';
    default:
      return 'info';
  }
};

onBeforeMount(() => {
  serverInfoService.list().then(data => {
    servers.value = data;
  });
  initFilters()
});
onMounted(() => {
});

const initFilters = () => {
  filters.value = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
  };
};

const openNew = () => {
  toast.add({severity: 'success', summary: 'Success', detail: 'Server Created', life: 3000});
};

</script>

<template>
  <h5>Servers</h5>

  <DataTable
      :value="servers"
      :paginator="true"
      :rows="10"
      dataKey="id"
      :rowHover="true"
      v-model:filters="filters"
      filterDisplay="menu"
      :loading="loading"
      :filters="filters"
      :globalFilterFields="['name', 'id', 'connection.url']"
      showGridlines
  >

    <template #header>
      <div class="flex justify-content-between flex-column sm:flex-row gap-2 sm:gap-0">
        <Button label="New" icon="pi pi-plus" severity="success" @click="openNew"/>
        <IconField iconPosition="left">
          <InputIcon class="pi pi-search"/>
          <InputText v-model="filters['global'].value" placeholder="Keyword Search" style="width: 100%"/>
        </IconField>
      </div>
    </template>
    <template #empty> No servers found</template>
    <template #loading> Loading servers...</template>


    <Column field="name" header="Server">
      <template #body="{ data }">
        {{ data.name }}
      </template>
    </Column>

    <Column header="Connection">
      <template #body="{ data }">
        <div>
          <i class="pi"
             :class="{ 'text-green-500 pi-check-circle': data.connected, 'text-pink-500 pi-times-circle': !data.connected }"></i>
          <a
              class="ml-1"
              :href="data.connection.url" target="_blank">
            {{ data.connection.url }}
          </a>
        </div>
      </template>
    </Column>

    <Column field="id" header="Id">
      <template #body="{ data }">
        <code>
          {{ data.id }}
        </code>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped lang="scss">

</style>
