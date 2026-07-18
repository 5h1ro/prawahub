<script setup>
import {useI18n} from "vue-i18n";

const props = defineProps({
  items: {type: Array, default: () => []},
  pending: Boolean,
})
const emit = defineEmits(["refresh", "open"]);
const {t} = useI18n();

function preview(chat) {
  const body = chat?.lastMessage?.body;
  if (!body) return "";
  return body.length > 60 ? body.slice(0, 60) + "…" : body;
}
</script>

<template>
  <div class="wa-news">
    <div class="wa-news__header">
      <span class="wa-news__title">{{ t('chat.newsletter.title') }}</span>
      <RefreshButton :refreshing="pending" @click="emit('refresh')"/>
    </div>

    <div class="wa-news__body">
      <div v-if="pending && items.length === 0" class="wa-news__empty">
        <ProgressSpinner style="width:2rem;height:2rem"/>
      </div>
      <div v-else-if="items.length === 0" class="wa-news__empty">
        {{ t('chat.newsletter.empty') }}
      </div>
      <div
          v-for="c in items"
          :key="c.id"
          class="wa-news__item wa-news__item--clickable"
          @click="emit('open', c)"
      >
        <div class="wa-news__avatar">
          <img v-if="c.picture" :src="c.picture" alt=""/>
          <i v-else class="pi pi-megaphone"></i>
        </div>
        <div class="wa-news__info">
          <div class="wa-news__name">{{ c.name || c.id }}</div>
          <div class="wa-news__preview">{{ preview(c) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.wa-news {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wa-news__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.5rem;
}

.wa-news__title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #00a884;
}

.wa-news__body {
  flex: 1;
  overflow: auto;
  padding: 0.5rem 0.75rem 1rem;
}

.wa-news__empty {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 2rem 0;
}

.wa-news__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.5rem;
  border-radius: 8px;
  cursor: default;
}

.wa-news__item--clickable {
  cursor: pointer;
}

.wa-news__item:hover {
  background: rgba(0, 168, 132, 0.06);
}

.wa-news__avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #dfe5e7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  i {
    font-size: 1.3rem;
    color: #8696a0;
  }
}

.wa-news__info {
  min-width: 0;
}

.wa-news__name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wa-news__preview {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
