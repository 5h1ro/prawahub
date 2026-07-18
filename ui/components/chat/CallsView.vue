<script setup>
import {computed, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {resolveContact, isGroup, isStatusBroadcast, isNewsletter} from "../../utils/waContacts";

const props = defineProps({
  serverId: {type: [String, Number], default: null},
  sessionName: {type: String, default: null},
  contacts: {type: Array, default: () => []},
  contactIndex: {type: Object, default: null},
  busy: Boolean,
})
const emit = defineEmits(["call"]);

const {t} = useI18n();
const store = useServerStore();

const number = ref("");
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const search = ref("");
const showKeypad = ref(false);

// Use contacts passed from parent; fall back to fetching if none provided
const localContacts = ref([]);
const loadingContacts = ref(false);

async function loadContacts() {
  if (props.contacts && props.contacts.length) return;
  if (!props.serverId || !props.sessionName) return;
  loadingContacts.value = true;
  try {
    const data = await store.getContacts(props.serverId, props.sessionName);
    localContacts.value = Array.isArray(data) ? data : [];
  } catch (e) {
    localContacts.value = [];
  } finally {
    loadingContacts.value = false;
  }
}

watch(() => [props.serverId, props.sessionName], loadContacts, {immediate: true});

const sourceContacts = computed(() =>
    (props.contacts && props.contacts.length) ? props.contacts : localContacts.value
);

// Build displayable rows: real personal contacts only, resolved name + number
const rows = computed(() => {
  const list = sourceContacts.value || [];
  const out = [];
  const seen = new Set();
  for (const c of list) {
    const id = c?.id;
    if (!id || c.isMe || isGroup(id) || isStatusBroadcast(id) || isNewsletter(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const r = resolveContact(props.contactIndex, id);
    const contactName = c.name || c.pushname || c.shortName || "";
    const number = r.number || (c.number ? `+${String(c.number).split("@")[0]}` : "");
    // Skip unknown contacts: no real name and no phone number
    if (!contactName && !number) continue;
    out.push({
      id,
      name: contactName || number,
      number,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return rows.value;
  const digits = q.replace(/[^0-9]/g, "");
  return rows.value.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (digits && (r.number.replace(/[^0-9]/g, "").includes(digits) || r.id.includes(digits)))
  );
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

function callContact(r) {
  emit("call", r.id);
}
</script>

<template>
  <div class="wa-calls">
    <div class="wa-calls__header">
      <span class="wa-calls__title">{{ t('chat.calls.title') }}</span>
      <div class="wa-calls__header-actions">
        <span class="wa-calls__count">{{ filtered.length }}</span>
        <Button
            icon="pi pi-th-large"
            :severity="showKeypad ? 'success' : 'secondary'"
            text
            rounded
            v-tooltip.bottom="t('chat.calls.keypad')"
            @click="showKeypad = !showKeypad"
        />
      </div>
    </div>

    <div class="wa-calls__search">
      <span class="p-input-icon-left w-full">
        <i class="pi pi-search"></i>
        <InputText v-model="search" class="w-full" :placeholder="t('chat.calls.searchContacts')"/>
      </span>
    </div>

    <!-- Optional keypad -->
    <div v-if="showKeypad" class="wa-calls__keypad-panel">
      <InputText
          v-model="number"
          class="wa-calls__display"
          :placeholder="t('chat.dialer.placeholder')"
          @keyup.enter="callNumber"
      />
      <div class="wa-calls__keypad">
        <Button v-for="k in keys" :key="k" :label="k" text class="wa-calls__key" @click="press(k)"/>
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

    <div class="wa-calls__contacts">
      <div v-if="loadingContacts" class="wa-calls__empty">
        <ProgressSpinner style="width:2rem;height:2rem"/>
      </div>
      <div v-else-if="filtered.length === 0" class="wa-calls__empty">
        {{ t('chat.calls.noContacts') }}
      </div>
      <div
          v-for="r in filtered"
          :key="r.id"
          class="wa-calls__contact"
          @click="callContact(r)"
      >
        <div class="wa-calls__contact-avatar">
          <i class="pi pi-user"></i>
        </div>
        <div class="wa-calls__contact-info">
          <div class="wa-calls__contact-name">{{ r.name }}</div>
          <div class="wa-calls__contact-id">{{ r.number || r.id }}</div>
        </div>
        <Button icon="pi pi-phone" severity="success" text rounded :loading="busy"/>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.5rem;
}

.wa-calls__title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #00a884;
}

.wa-calls__header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wa-calls__count {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  background: var(--surface-hover);
  border-radius: 10px;
  padding: 0.1rem 0.5rem;
}

.wa-calls__search {
  padding: 0 1.25rem 0.5rem;
}

.wa-calls__keypad-panel {
  padding: 0.5rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--surface-border);
}

.wa-calls__display {
  width: 100%;
  text-align: center;
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}

.wa-calls__keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  max-width: 260px;
  margin: 0 auto;
}

.wa-calls__key {
  font-size: 1.3rem;
  height: 2.6rem;
}

.wa-calls__controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  max-width: 260px;
  margin-left: auto;
  margin-right: auto;
}

.wa-calls__contacts {
  flex: 1;
  overflow: auto;
  padding: 0.25rem 1rem 1rem;
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
