<script setup>
import {computed, ref, watch} from "vue";
import {useI18n} from "vue-i18n";

const props = defineProps({
  serverId: {type: [String, Number], default: null},
  sessionName: {type: String, default: null},
  busy: Boolean,
})
const emit = defineEmits(["call"]);

const {t} = useI18n();
const store = useServerStore();

const number = ref("");
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

const contacts = ref([]);
const loadingContacts = ref(false);
const search = ref("");

async function loadContacts() {
  if (!props.serverId || !props.sessionName) return;
  loadingContacts.value = true;
  try {
    const data = await store.getContacts(props.serverId, props.sessionName);
    contacts.value = (Array.isArray(data) ? data : [])
        .filter(c => c?.id && String(c.id).endsWith('@c.us') && !c.isMe)
  } catch (e) {
    contacts.value = [];
  } finally {
    loadingContacts.value = false;
  }
}

watch(() => [props.serverId, props.sessionName], loadContacts, {immediate: true});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = contacts.value.slice(0, 300);
  if (!q) return list.slice(0, 60);
  return list.filter(c =>
      (c.name || c.pushname || "").toLowerCase().includes(q) ||
      String(c.id).includes(q)
  ).slice(0, 60);
});

function press(k) {
  number.value += k;
}

function backspace() {
  number.value = number.value.slice(0, -1);
}

function callNumber() {
  const value = number.value.trim();
  if (value) emit("call", value);
}

function callContact(c) {
  emit("call", c.id);
}

function displayId(value) {
  return (value || "").replace("@c.us", "").replace("@s.whatsapp.net", "");
}
</script>

<template>
  <div class="wa-calls">
    <div class="wa-calls__header">{{ t('chat.calls.title') }}</div>

    <div class="wa-calls__body">
      <div class="wa-calls__keypad-col">
        <InputText
            v-model="number"
            class="wa-calls__display"
            :placeholder="t('chat.dialer.placeholder')"
            @keyup.enter="callNumber"
        />
        <div class="wa-calls__keypad">
          <Button
              v-for="k in keys"
              :key="k"
              :label="k"
              text
              class="wa-calls__key"
              @click="press(k)"
          />
        </div>
        <div class="wa-calls__controls">
          <Button icon="pi pi-delete-left" text severity="secondary" @click="backspace"/>
          <Button
              icon="pi pi-phone"
              :label="t('chat.dialer.call')"
              severity="success"
              rounded
              :loading="busy"
              :disabled="!number"
              @click="callNumber"
          />
          <span style="width:2.5rem"></span>
        </div>
      </div>

      <div class="wa-calls__contacts-col">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search"></i>
          <InputText v-model="search" class="w-full" :placeholder="t('chat.calls.searchContacts')"/>
        </span>
        <div class="wa-calls__contacts">
          <div v-if="loadingContacts" class="wa-calls__empty">
            <ProgressSpinner style="width:2rem;height:2rem"/>
          </div>
          <div v-else-if="filtered.length === 0" class="wa-calls__empty">
            {{ t('chat.calls.noContacts') }}
          </div>
          <div
              v-for="c in filtered"
              :key="c.id"
              class="wa-calls__contact"
              @click="callContact(c)"
          >
            <div class="wa-calls__contact-avatar">
              <i class="pi pi-user"></i>
            </div>
            <div class="wa-calls__contact-info">
              <div class="wa-calls__contact-name">{{ c.name || c.pushname || displayId(c.id) }}</div>
              <div class="wa-calls__contact-id">{{ displayId(c.id) }}</div>
            </div>
            <Button icon="pi pi-phone" severity="success" text rounded :loading="busy"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.wa-calls {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wa-calls__header {
  font-size: 1.2rem;
  font-weight: 600;
  color: #00a884;
  padding: 1rem 1.25rem 0.5rem;
}

.wa-calls__body {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  padding: 1rem 1.25rem;
  min-height: 0;
}

.wa-calls__keypad-col {
  width: 260px;
  flex-shrink: 0;
}

.wa-calls__display {
  width: 100%;
  text-align: center;
  font-size: 1.4rem;
  margin-bottom: 0.75rem;
}

.wa-calls__keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.wa-calls__key {
  font-size: 1.3rem;
  height: 3rem;
}

.wa-calls__controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
}

.wa-calls__contacts-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wa-calls__contacts {
  margin-top: 0.75rem;
  overflow: auto;
  flex: 1;
}

.wa-calls__empty {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 2rem 0;
}

.wa-calls__contact {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.4rem;
  border-radius: 8px;
  cursor: pointer;
}

.wa-calls__contact:hover {
  background: rgba(0, 168, 132, 0.08);
}

.wa-calls__contact-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #dfe5e7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 1.3rem;
    color: #8696a0;
  }
}

.wa-calls__contact-info {
  flex: 1;
  min-width: 0;
}

.wa-calls__contact-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wa-calls__contact-id {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}
</style>
