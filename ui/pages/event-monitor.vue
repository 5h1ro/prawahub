<script setup>
import {onBeforeMount} from "vue";
import EventTable from "../components/events/EventTable.vue";

const store = useServerStore()
onBeforeMount(() => {
  store.refresh()
});
</script>

<template>
  <div class="grid">
    <div class="col-12">
      <div class="card">
        <EventTable></EventTable>
      </div>
    </div>
  </div>
</template>
