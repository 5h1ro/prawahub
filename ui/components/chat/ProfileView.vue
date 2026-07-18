<script setup>
import {ref, watch} from "vue";
import {useI18n} from "vue-i18n";

const props = defineProps({
  serverId: {type: [String, Number], default: null},
  sessionName: {type: String, default: null},
  me: {type: Object, default: null},
  mePicture: {type: String, default: null},
})

const {t} = useI18n();
const toast = useToast();
const store = useServerStore();

const loading = ref(false);
const savingName = ref(false);
const savingStatus = ref(false);
const name = ref("");
const status = ref("");

async function load() {
  if (!props.serverId || !props.sessionName) return;
  loading.value = true;
  try {
    const data = await store.getProfile(props.serverId, props.sessionName);
    name.value = data?.name || props.me?.pushName || "";
    status.value = data?.status || "";
  } catch (e) {
    // profile endpoint may be unavailable on some engines; fall back to session me
    name.value = props.me?.pushName || "";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.serverId, props.sessionName], load, {immediate: true});

async function saveName() {
  savingName.value = true;
  try {
    await store.setProfileName(props.serverId, props.sessionName, name.value);
    toast.add({severity: 'success', summary: t('chat.profile.savedName'), life: 3000});
  } catch (e) {
    toast.add({severity: 'error', summary: t('chat.profile.saveFailed'), detail: e?.message || String(e), life: 5000});
  } finally {
    savingName.value = false;
  }
}

async function saveStatus() {
  savingStatus.value = true;
  try {
    await store.setProfileStatus(props.serverId, props.sessionName, status.value);
    toast.add({severity: 'success', summary: t('chat.profile.savedStatus'), life: 3000});
  } catch (e) {
    toast.add({severity: 'error', summary: t('chat.profile.saveFailed'), detail: e?.message || String(e), life: 5000});
  } finally {
    savingStatus.value = false;
  }
}

function displayId(value) {
  return (value || "").replace("@c.us", "").replace("@s.whatsapp.net", "");
}
</script>

<template>
  <div class="wa-profile">
    <div class="wa-profile__header">{{ t('chat.profile.title') }}</div>

    <div class="wa-profile__avatar-wrap">
      <img v-if="mePicture" :src="mePicture" class="wa-profile__avatar" alt="me"/>
      <div v-else class="wa-profile__avatar wa-profile__avatar--placeholder">
        <i class="pi pi-user"></i>
      </div>
    </div>

    <div class="wa-profile__phone">{{ displayId(me?.id) }}</div>

    <div class="wa-profile__field">
      <label>{{ t('chat.profile.name') }}</label>
      <div class="wa-profile__row">
        <InputText v-model="name" class="w-full" :placeholder="t('chat.profile.namePlaceholder')"/>
        <Button icon="pi pi-check" severity="success" rounded :loading="savingName" @click="saveName"/>
      </div>
    </div>

    <div class="wa-profile__field">
      <label>{{ t('chat.profile.about') }}</label>
      <div class="wa-profile__row">
        <InputText v-model="status" class="w-full" :placeholder="t('chat.profile.aboutPlaceholder')"/>
        <Button icon="pi pi-check" severity="success" rounded :loading="savingStatus" @click="saveStatus"/>
      </div>
    </div>

    <div v-if="loading" class="wa-profile__loading">
      <ProgressSpinner style="width:2rem;height:2rem"/>
    </div>
  </div>
</template>

<style scoped lang="scss">
.wa-profile {
  height: 100%;
  overflow: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.wa-profile__header {
  align-self: flex-start;
  font-size: 1.2rem;
  font-weight: 600;
  color: #00a884;
}

.wa-profile__avatar-wrap {
  margin-top: 0.5rem;
}

.wa-profile__avatar {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  object-fit: cover;
}

.wa-profile__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dfe5e7;

  i {
    font-size: 4rem;
    color: #8696a0;
  }
}

.wa-profile__phone {
  color: var(--text-color-secondary);
}

.wa-profile__field {
  width: 100%;
  max-width: 420px;

  label {
    display: block;
    font-size: 0.85rem;
    color: #00a884;
    margin-bottom: 0.35rem;
  }
}

.wa-profile__row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.wa-profile__loading {
  margin-top: 1rem;
}
</style>
