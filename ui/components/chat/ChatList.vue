<script setup>
import {computed, ref} from "vue";
import {useI18n} from "vue-i18n";

const {t} = useI18n();

const props = defineProps({
      chats: Array,
      pending: Boolean,
      merge: {
        type: Boolean,
        default: true,
      },
      loadMoreChats: Function,
      loadingMoreChats: Boolean,
    }
)
const emit = defineEmits(['clickOnChat',
  'refreshChats',
  'update:merge'
])

const search = ref('')
const filter = ref('all') // all | unread | favorites | groups

function unreadCount(c) {
  return c?.unreadCount ?? c?._chat?.unreadCount ?? 0
}

function isPinned(c) {
  return !!(c?.pinned || c?._chat?.pinned || c?.isPinned)
}

function isFavorite(c) {
  return !!(c?.isFavorite || c?._chat?.isFavorite) || isPinned(c)
}

function isGroup(c) {
  return String(c?.id || '').includes('@g.us')
}

const counts = computed(() => {
  const list = props.chats || []
  return {
    all: list.length,
    unread: list.filter(c => unreadCount(c) > 0).length,
    favorites: list.filter(isFavorite).length,
    groups: list.filter(isGroup).length,
  }
})

const filters = computed(() => [
  {key: 'all', label: t('chat.filter.all'), count: counts.value.all},
  {key: 'unread', label: t('chat.filter.unread'), count: counts.value.unread},
  {key: 'favorites', label: t('chat.filter.favorites'), count: counts.value.favorites},
  {key: 'groups', label: t('chat.filter.groups'), count: counts.value.groups},
])

const displayed = computed(() => {
  let list = props.chats || []
  if (filter.value === 'unread') list = list.filter(c => unreadCount(c) > 0)
  else if (filter.value === 'favorites') list = list.filter(isFavorite)
  else if (filter.value === 'groups') list = list.filter(isGroup)

  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(c =>
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.id || '').toLowerCase().includes(q) ||
        String(c.lastMessage?.body || '').toLowerCase().includes(q)
    )
  }
  return list
})
</script>

<template>
  <div style="width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column;">
    <!-- Search -->
    <div class="wa-list__search">
      <span class="p-input-icon-left w-full">
        <i class="pi pi-search"></i>
        <InputText
            v-model="search"
            class="w-full"
            :placeholder="$t('chat.searchPlaceholder')"
        />
      </span>
      <RefreshButton
          @click="emit('refreshChats')"
          :refreshing="pending"
      ></RefreshButton>
    </div>

    <!-- Filter chips -->
    <div class="wa-list__filters">
      <button
          v-for="f in filters"
          :key="f.key"
          class="wa-list__chip"
          :class="{ 'wa-list__chip--active': filter === f.key }"
          @click="filter = f.key"
      >
        {{ f.label }}
        <span v-if="f.count" class="wa-list__chip-count">{{ f.count }}</span>
      </button>
      <div
          class="wa-list__merge"
          v-tooltip.bottom="$t('chat.mergeToggleTooltip')"
      >
        <i class="pi pi-object-ungroup text-sm"></i>
        <InputSwitch
            :modelValue="props.merge"
            @update:modelValue="value => emit('update:merge', value)"
        />
      </div>
    </div>

    <!-- List -->
    <div style="flex: 1; overflow: auto;">
      <DataTable
          :value="displayed"
          :loading="pending"
          style="width: 100%"
          class="p-datatable--clickable"
          @row-click="emit('clickOnChat', $event.data)"
          :rowHover="true"
      >
        <Column>
          <template #body="{ data }">
            <ChatPreview
                :id="data.id"
                :name="data.name"
                :picture="data.picture"
                :message="data.lastMessage"
                :pinned="!!(data.pinned || data._chat?.pinned || data.isPinned)"
                :unread="data.unreadCount ?? data._chat?.unreadCount ?? 0"
            />
          </template>
        </Column>
      </DataTable>
      <div v-if="filter === 'all' && !search" class="flex justify-content-center py-4">
        <Button
            :label="$t('chat.showMoreChats')"
            icon="pi pi-arrow-down"
            size="small"
            outlined
            :loading="loadingMoreChats"
            @click="loadMoreChats"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.wa-list__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.wa-list__filters {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.75rem 0.5rem;
  flex-wrap: wrap;
}

.wa-list__chip {
  border: none;
  background: var(--surface-hover);
  color: var(--text-color-secondary);
  border-radius: 16px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.wa-list__chip--active {
  background: rgba(0, 168, 132, 0.18);
  color: #008069;
  font-weight: 600;
}

.wa-list__chip-count {
  font-size: 0.72rem;
  opacity: 0.85;
}

.wa-list__merge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}
</style>
