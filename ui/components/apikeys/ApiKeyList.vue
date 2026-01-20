<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FilterMatchMode } from 'primevue/api';
import { useServerStore } from '../../stores/useServerStore';
import useShowToastOnResult from '../../composables/useShowToastOnResult';
import ApiKeyEdit from './ApiKeyEdit.vue';
import type { ApiKeyDTO, ApiKeyRequest } from '../../services/waha/dtos';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const store = useServerStore();
const req = useShowToastOnResult();

const props = defineProps({
  server: Object
});

const apiKeys = ref<ApiKeyDTO[]>([]);
const loading = ref(false);
const apiKeyDialog = ref(false);
const selectedApiKey = ref<ApiKeyDTO | null>(null);
const isNewApiKey = ref(false);
const filters = ref({
  id: { value: null, matchMode: FilterMatchMode.CONTAINS },
  key: { value: null, matchMode: FilterMatchMode.CONTAINS },
  session: { value: null, matchMode: FilterMatchMode.CONTAINS },
  isActive: { value: null, matchMode: FilterMatchMode.EQUALS },
  isAdmin: { value: null, matchMode: FilterMatchMode.EQUALS },
});
const revealedKeys = ref<Record<string, boolean>>({});

const statusOptions = computed(() => ([
  { label: t('apiKeys.activeOn'), value: true },
  { label: t('apiKeys.activeOff'), value: false },
]));

const adminOptions = computed(() => ([
  { label: t('apiKeys.scopeAdmin'), value: true },
  { label: t('apiKeys.scopeSession'), value: false },
]));

const sessionOptions = computed(() => {
  if (!props.server?.id) {
    return [];
  }
  const sessions = store.visibleSessionsByServer[props.server.id] || [];
  return sessions.map(session => ({
    label: session.name,
    value: session.name
  }));
});

function getDefaultSessionName() {
  if (sessionOptions.value.length > 0) {
    return sessionOptions.value[0].value;
  }
  return 'default';
}

onMounted(async () => {
  await loadApiKeys();
});

watch(() => props.server, async () => {
  await loadApiKeys();
}, { deep: true });

async function loadApiKeys() {
  if (!props.server || !props.server.id) {
    apiKeys.value = [];
    return;
  }

  try {
    loading.value = true;
    apiKeys.value = await req(
      store.getApiKeys(props.server.id),
      undefined,
      t('apiKeys.failedToLoad')
    );
  } catch (error) {
    console.error('Error loading API keys:', error);
  } finally {
    loading.value = false;
  }
}

function openNewApiKey() {
  selectedApiKey.value = {
    id: '',
    key: '',
    isActive: true,
    isAdmin: false,
    session: getDefaultSessionName(),
  };
  isNewApiKey.value = true;
  apiKeyDialog.value = true;
}

function editApiKey(apiKey: ApiKeyDTO) {
  selectedApiKey.value = { ...apiKey };
  isNewApiKey.value = false;
  apiKeyDialog.value = true;
}

function confirmDeleteApiKey(apiKey: ApiKeyDTO, event: Event) {
  confirm.require({
    target: event.currentTarget,
    message: t('apiKeys.deleteConfirm', { id: apiKey.id }),
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined p-button-sm',
    acceptClass: 'p-button-danger p-button-sm',
    rejectLabel: t('apiKeys.no'),
    acceptLabel: t('apiKeys.yesDelete'),
    accept: async () => {
      await deleteApiKey(apiKey);
    },
    reject: () => {
      // No-op
    }
  });
}

async function deleteApiKey(apiKey: ApiKeyDTO) {
  try {
    await req(
      store.deleteApiKey(props.server.id, apiKey.id),
      undefined,
      t('apiKeys.failedToDelete')
    );
    toast.add({
      severity: 'success',
      summary: t('apiKeys.deleted'),
      detail: apiKey.id,
      life: 3000
    });
    await loadApiKeys();
  } catch (error) {
    console.error('Error deleting API key:', error);
  }
}

function toRequest(apiKey: ApiKeyDTO): ApiKeyRequest {
  const isAdmin = !!apiKey.isAdmin;
  return {
    isAdmin: isAdmin,
    session: isAdmin ? null : apiKey.session || null,
    isActive: apiKey.isActive,
  };
}

async function saveApiKey(apiKey: ApiKeyDTO) {
  try {
    if (isNewApiKey.value) {
      await req(
        store.createApiKey(props.server.id, toRequest(apiKey)),
        undefined,
        t('apiKeys.failedToCreate')
      );
      toast.add({
        severity: 'success',
        summary: t('apiKeys.created'),
        detail: apiKey.session || t('apiKeys.adminLabel'),
        life: 3000
      });
    } else {
      await req(
        store.updateApiKey(props.server.id, apiKey.id, toRequest(apiKey)),
        undefined,
        t('apiKeys.failedToUpdate')
      );
      toast.add({
        severity: 'success',
        summary: t('apiKeys.updated'),
        detail: apiKey.id,
        life: 3000
      });
    }
    await loadApiKeys();
    apiKeyDialog.value = false;
    return true;
  } catch (error) {
    console.error('Error saving API key:', error);
    return false;
  }
}

function maskKey(key: string) {
  if (!key) {
    return '';
  }
  const prefix = key.startsWith('key_') ? 'key_' : '';
  const body = prefix ? key.slice(prefix.length) : key;
  const first = body.slice(0, 3);
  const last = body.slice(-3);
  return `${prefix}${first}****${last}`;
}

async function copyKey(key: string) {
  if (!key) {
    return;
  }
  await navigator.clipboard.writeText(key);
  toast.add({
    severity: 'success',
    summary: t('apiKeys.copied'),
    detail: t('apiKeys.copiedDetail'),
    life: 2000
  });
}

function toggleKeyVisibility(id: string) {
  revealedKeys.value = {
    ...revealedKeys.value,
    [id]: !revealedKeys.value[id]
  };
}

function isKeyRevealed(id: string) {
  return !!revealedKeys.value[id];
}
</script>

<template>
  <div class="api-key-list">
    <div class="flex justify-content-between align-items-center w-full mb-2">
      <div>
      </div>
      <div>
        <Button
          :label="t('apiKeys.createKey')"
          icon="pi pi-plus"
          @click="openNewApiKey"
          severity="success"
          text
        />
      </div>
    </div>

    <DataTable
      :value="apiKeys"
      :loading="loading"
      dataKey="id"
      :paginator="true"
      :rows="5"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      v-model:filters="filters"
      filterDisplay="row"
      showGridlines
    >
      <template #empty>
        <div class="text-center p-4 flex flex-column gap-2 align-items-center">
          <span>{{ t('apiKeys.noKeysFound') }}</span>
          <Button
            :label="t('apiKeys.createKey')"
            icon="pi pi-plus"
            severity="success"
            @click="openNewApiKey"
            class="w-auto"
          />
        </div>
      </template>

      <Column field="id" :showFilterMenu="false">
        <template #header>
          <div class="flex align-items-center gap-1">
            <span>{{ t('apiKeys.id') }}</span>
            <i v-tooltip="t('apiKeys.idTooltip')" class="pi pi-info-circle"></i>
          </div>
        </template>
        <template #filter>
          <InputText
            v-model="filters['id'].value"
            type="text"
            :placeholder="t('apiKeys.id')"
          />
        </template>
        <template #body="{ data }">
          {{ data.id }}
        </template>
      </Column>

      <Column field="isActive" :header="t('apiKeys.status')" :showFilterMenu="false" style="width: 10rem;">
        <template #body="{ data }">
          <Tag
            :value="data.isActive !== false ? t('apiKeys.activeOn').toUpperCase() : t('apiKeys.activeOff').toUpperCase()"
            :severity="data.isActive !== false ? 'success' : 'secondary'"
          />
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Dropdown
            v-model="filterModel.value"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('apiKeys.any')"
            class="p-column-filter"
            :showClear="true"
            @change="filterCallback()"
          />
        </template>
      </Column>

      <Column field="key" :showFilterMenu="false">
        <template #header>
          <div class="flex align-items-center gap-1">
            <span>{{ t('apiKeys.key') }}</span>
            <i v-tooltip="t('apiKeys.keyTooltip')" class="pi pi-info-circle"></i>
          </div>
        </template>
        <template #filter>
          <InputText
            v-model="filters['key'].value"
            type="text"
            :placeholder="t('apiKeys.key')"
          />
        </template>
        <template #body="{ data }">
          <div class="flex align-items-center gap-2 w-full">
            <span
              class="cursor-pointer flex-1"
              v-tooltip="t('apiKeys.copyHint')"
              @click="copyKey(data.key)"
            >
              <code>{{ isKeyRevealed(data.id) ? data.key : maskKey(data.key) }}</code>
            </span>
            <Button
              icon="pi pi-copy"
              text
              rounded
              v-tooltip="t('apiKeys.copyHint')"
              @click="copyKey(data.key)"
            />
            <Button
              :icon="isKeyRevealed(data.id) ? 'pi pi-eye-slash' : 'pi pi-eye'"
              text
              rounded
              v-tooltip="isKeyRevealed(data.id) ? t('apiKeys.hideKey') : t('apiKeys.showKey')"
              @click="toggleKeyVisibility(data.id)"
            />
          </div>
        </template>
      </Column>

      <Column field="session" :header="t('apiKeys.session')" :showFilterMenu="false" style="width: 12rem;">
        <template #filter>
          <InputText
            v-model="filters['session'].value"
            type="text"
            :placeholder="t('apiKeys.session')"
          />
        </template>
        <template #body="{ data }">
          <span v-if="data.isAdmin">{{ t('apiKeys.adminLabel') }}</span>
          <span v-else>{{ data.session }}</span>
        </template>
      </Column>

      <Column field="isAdmin" :header="t('apiKeys.scope')" :showFilterMenu="false" style="width: 9rem;">
        <template #body="{ data }">
          <div class="flex align-items-center gap-2">
            <i :class="data.isAdmin ? 'pi pi-shield' : 'pi pi-user'"></i>
            <Tag :value="data.isAdmin ? t('apiKeys.scopeAdmin') : t('apiKeys.scopeSession')" :severity="data.isAdmin ? 'info' : 'secondary'" />
          </div>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Dropdown
            v-model="filterModel.value"
            :options="adminOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('apiKeys.any')"
            class="p-column-filter"
            :showClear="true"
            @change="filterCallback()"
          />
        </template>
      </Column>

      <Column style="width: 10rem; text-align: right;">
        <template #body="{ data }">
          <div class="flex gap-2 justify-content-end">
            <Button
              icon="pi pi-pencil"
              @click="editApiKey(data)"
              outlined
              rounded
              severity="success"
              v-tooltip.top="t('apiKeys.editKey')"
            />
            <Button
              icon="pi pi-trash"
              @click="confirmDeleteApiKey(data, $event)"
              outlined
              rounded
              severity="danger"
              v-tooltip.top="t('apiKeys.deleteKey')"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <ConfirmPopup></ConfirmPopup>

    <ApiKeyEdit
      v-if="selectedApiKey"
      v-model="selectedApiKey"
      v-model:visible="apiKeyDialog"
      :sessions="sessionOptions"
      :isNewApiKey="isNewApiKey"
      :loading="loading"
      @save="saveApiKey"
      @cancel="apiKeyDialog = false"
    />
  </div>
</template>

<style scoped lang="scss">
.api-key-list {
  margin-bottom: 1rem;
}
</style>
