<script setup>
import {useI18n} from "vue-i18n";

import {ref} from "vue";

const visible = defineModel("visible");
const props = defineProps({
  from: {type: String, default: ""},
  busy: Boolean,
  greetings: {type: Array, default: () => []}, // GreetingMeta[]
});
const emit = defineEmits(["accept", "reject", "answer-audio", "add-greeting", "remove-greeting"]);
const {t} = useI18n();

const audioPanel = ref(null);

function toggleAudioPanel(event) {
  audioPanel.value?.toggle(event);
}

function chooseGreeting(id) {
  audioPanel.value?.hide();
  emit("answer-audio", id);
}

function displayFrom(value) {
  return (value || "").replace("@c.us", "").replace("@s.whatsapp.net", "");
}
</script>

<template>
  <Dialog
      v-model:visible="visible"
      modal
      :closable="false"
      :showHeader="false"
      :dismissableMask="false"
      :pt="{ root: { class: 'wa-incoming-root' }, content: { class: 'wa-incoming-content' } }"
      :style="{ width: '360px', borderRadius: '18px', overflow: 'hidden' }"
  >
    <div class="wa-incoming">
      <div class="wa-incoming__label">{{ t('chat.incoming.subtitle') }}</div>

      <div class="wa-incoming__avatar-wrap">
        <span class="wa-incoming__pulse"></span>
        <span class="wa-incoming__pulse wa-incoming__pulse--delay"></span>
        <div class="wa-incoming__avatar">
          <i class="pi pi-user"></i>
        </div>
      </div>

      <div class="wa-incoming__from">{{ displayFrom(from) }}</div>
      <div class="wa-incoming__type">
        <i class="pi pi-phone"></i> {{ t('chat.incoming.audioCall') }}
      </div>

      <div class="wa-incoming__actions">
        <div class="wa-incoming__action">
          <Button
              icon="pi pi-phone-slash"
              severity="danger"
              rounded
              class="wa-incoming__btn wa-incoming__btn--reject"
              :loading="busy"
              @click="emit('reject')"
          />
          <span>{{ t('chat.incoming.decline') }}</span>
        </div>
        <div class="wa-incoming__action">
          <Button
              icon="pi pi-phone"
              severity="success"
              rounded
              class="wa-incoming__btn wa-incoming__btn--accept"
              :loading="busy"
              @click="emit('accept')"
          />
          <span>{{ t('chat.incoming.accept') }}</span>
        </div>
        <div class="wa-incoming__action">
          <Button
              icon="pi pi-volume-up"
              severity="info"
              rounded
              class="wa-incoming__btn wa-incoming__btn--audio"
              :loading="busy"
              @click="toggleAudioPanel"
          />
          <span>{{ t('chat.incoming.acceptAudio') }}</span>
        </div>
      </div>
    </div>

    <!-- Clip picker: choose which mp3 answers this call (swappable per call) -->
    <OverlayPanel ref="audioPanel">
      <div class="wa-greetings">
        <div class="wa-greetings__title">{{ t('chat.incoming.pickAudio') }}</div>
        <div v-if="!greetings.length" class="wa-greetings__empty">
          {{ t('chat.incoming.noAudio') }}
        </div>
        <ul v-else class="wa-greetings__list">
          <li v-for="g in greetings" :key="g.id" class="wa-greetings__item">
            <button class="wa-greetings__play" :disabled="busy" @click="chooseGreeting(g.id)">
              <i class="pi pi-play"></i>
              <span class="wa-greetings__name">{{ g.name }}</span>
            </button>
            <Button
                icon="pi pi-trash"
                text
                rounded
                size="small"
                severity="danger"
                @click="emit('remove-greeting', g.id)"
            />
          </li>
        </ul>
        <Button
            class="wa-greetings__add"
            icon="pi pi-plus"
            :label="t('chat.incoming.addAudio')"
            text
            size="small"
            @click="emit('add-greeting')"
        />
      </div>
    </OverlayPanel>
  </Dialog>
</template>

<style scoped lang="scss">
.wa-incoming {
  background: linear-gradient(160deg, #1f2c34 0%, #0b141a 100%);
  color: #e9edef;
  text-align: center;
  padding: 2rem 1.5rem 1.75rem;
  margin: -1.5rem;
}

.wa-incoming__label {
  color: #8696a0;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.wa-incoming__avatar-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 1.5rem auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wa-incoming__avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #2a3942;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;

  i {
    font-size: 3rem;
    color: #8696a0;
  }
}

.wa-incoming__pulse {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(0, 168, 132, 0.4);
  animation: wa-pulse 1.8s ease-out infinite;
}

.wa-incoming__pulse--delay {
  animation-delay: 0.9s;
}

.wa-incoming__from {
  font-size: 1.6rem;
  font-weight: 500;
}

.wa-incoming__type {
  color: #8696a0;
  margin-top: 0.25rem;
}

.wa-incoming__actions {
  display: flex;
  justify-content: space-around;
  margin-top: 2rem;
}

.wa-incoming__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #8696a0;
  font-size: 0.85rem;
}

.wa-incoming__btn {
  width: 60px !important;
  height: 60px !important;
}

.wa-greetings {
  min-width: 220px;
  max-width: 300px;
}

.wa-greetings__title {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.wa-greetings__empty {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  padding: 0.25rem 0 0.5rem;
}

.wa-greetings__list {
  list-style: none;
  margin: 0 0 0.25rem;
  padding: 0;
  max-height: 220px;
  overflow: auto;
}

.wa-greetings__item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.wa-greetings__play {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  color: inherit;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  min-width: 0;
}

.wa-greetings__play:hover:not(:disabled) {
  background: rgba(0, 168, 132, 0.12);
}

.wa-greetings__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wa-greetings__add {
  width: 100%;
  justify-content: flex-start;
}

.wa-incoming__btn--accept {
  animation: wa-bounce 1.2s ease-in-out infinite;
}

@keyframes wa-pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

@keyframes wa-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
</style>
