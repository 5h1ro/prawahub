<script setup>
const props = defineProps({
  id: String,
  name: String,
  image: String,
  id2: String,
})
const ids = computed(() => {
  const list = [props.id, props.id2]
  return list.filter(Boolean)
})
</script>

<template>
  <div>
    <Chip
        :label="id"
        :image="image"
        icon="pi pi-user"
    >
      <div class="flex">
        <div class="mt-2">
          <template v-if="image">
            <img
                :src="image"
                data-pc-section="image"
            >
          </template>
          <template v-else-if="id?.includes('@g.us')">
            <i class="mr-2 pi pi-users" style="color: slateblue; font-size:1.4rem"></i>
          </template>
          <template v-else>
            <i class="mr-3 pi pi-user" style="color: #34d399"></i>
          </template>
        </div>

        <div class="p-chip-text" data-pc-section="label">
          <b>{{ name || id }}</b>
          <br/>
          <div>
            <template v-for="id in ids">
              <div class="p-text-secondary" style="font-size: 0.9rem">{{ id }}</div>
            </template>
          </div>
        </div>
      </div>
    </Chip>
  </div>
</template>

<style scoped lang="scss">

</style>