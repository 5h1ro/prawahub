<script setup>
import {ref, watch} from "vue";
import {useI18n} from "vue-i18n";

const props = defineProps({
  serverId: {type: [String, Number], default: null},
  sessionName: {type: String, default: null},
})

const {t} = useI18n();
const toast = useToast();
const store = useServerStore();

const tab = ref('compose'); // 'compose' | 'view'

// --- Compose ---
const text = ref("");
const bgColors = ["#00a884", "#0b93f6", "#8b5cf6", "#ef4444", "#f59e0b", "#374151"];
const bgColor = ref(bgColors[0]);
const posting = ref(false);
const fileInput = ref(null);
const imageFile = ref(null);
const imagePreview = ref(null);
const caption = ref("");

function pickImage() {
  fileInput.value?.click();
}

function onFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  imageFile.value = file;
  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.value = reader.result;
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  imageFile.value = null;
  imagePreview.value = null;
  caption.value = "";
  if (fileInput.value) fileInput.value.value = "";
}

function base64Of(dataUrl) {
  const s = String(dataUrl || "");
  const idx = s.indexOf(",");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

async function postStatus() {
  posting.value = true;
  try {
    if (imageFile.value) {
      const mediaFile = {
        data: base64Of(imagePreview.value),
        mimetype: imageFile.value.type,
        filename: imageFile.value.name,
      };
      if (imageFile.value.type.startsWith('video')) {
        await store.sendStatusVideo(props.serverId, props.sessionName, mediaFile, caption.value);
      } else {
        await store.sendStatusImage(props.serverId, props.sessionName, mediaFile, caption.value);
      }
      clearImage();
    } else {
      const value = text.value.trim();
      if (!value) return;
      await store.sendStatusText(props.serverId, props.sessionName, value, bgColor.value);
      text.value = "";
    }
    toast.add({severity: 'success', summary: t('chat.snap.posted'), life: 3000});
    loadStatuses();
  } catch (e) {
    toast.add({severity: 'error', summary: t('chat.snap.postFailed'), detail: e?.message || String(e), life: 5000});
  } finally {
    posting.value = false;
  }
}

// --- View (best-effort) ---
const statuses = ref([]);
const loadingView = ref(false);
const viewUnavailable = ref(false);
const pictures = ref({}); // authorId -> profilePictureURL
const selectedAuthor = ref(null);

function normalizeMessage(m) {
  const author = m.author || m.participant || m.from || m.sender || 'status@broadcast';
  return {
    id: m.id?._serialized || m.id || `${author}-${m.timestamp}`,
    author,
    body: m.body || m.caption || m._data?.caption || '',
    type: m.type || (m.hasMedia ? 'media' : 'text'),
    hasMedia: !!m.hasMedia,
    timestamp: m.timestamp || m.messageTimestamp || 0,
    fromMe: !!m.fromMe,
  };
}

async function loadStatuses() {
  if (!props.serverId || !props.sessionName) return;
  loadingView.value = true;
  viewUnavailable.value = false;
  selectedAuthor.value = null;
  let ok = false;
  const collected = [];
  // 1) Messages of the status@broadcast chat (works on engines that store status)
  try {
    const data = await store.getChatsMessages(
        props.serverId, props.sessionName, 'status@broadcast', 100, 0, false, false,
    );
    if (Array.isArray(data)) {
      ok = true;
      data.forEach(m => collected.push(normalizeMessage(m)));
    }
  } catch (e) {
    // engine may not expose status messages this way
  }
  if (collected.length === 0) {
    statuses.value = [];
    viewUnavailable.value = !ok;
    loadingView.value = false;
    return;
  }
  statuses.value = collected.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  loadingView.value = false;
  loadAuthorPictures();
}

function loadAuthorPictures() {
  const authors = [...new Set(statuses.value.filter(s => !s.fromMe).map(s => s.author))];
  authors.forEach(async (id) => {
    if (!id || id === 'status@broadcast' || pictures.value[id] !== undefined) return;
    pictures.value[id] = null;
    try {
      const data = await store.getProfilePicture(props.serverId, props.sessionName, id);
      pictures.value = {...pictures.value, [id]: data?.profilePictureURL || data || null};
    } catch (e) {
      // ignore, keep placeholder
    }
  });
}

// Group statuses by author into story "rings"
const stories = computed(() => {
  const map = new Map();
  for (const s of statuses.value) {
    if (!map.has(s.author)) {
      map.set(s.author, {author: s.author, fromMe: s.fromMe, items: [], latest: 0});
    }
    const g = map.get(s.author);
    g.items.push(s);
    if (s.timestamp > g.latest) g.latest = s.timestamp;
  }
  const list = [...map.values()].sort((a, b) => b.latest - a.latest);
  // my status first
  list.sort((a, b) => (b.fromMe ? 1 : 0) - (a.fromMe ? 1 : 0));
  return list;
});

const selectedStory = computed(() =>
    stories.value.find(s => s.author === selectedAuthor.value) || null
);

function openStory(author) {
  selectedAuthor.value = author;
}

function closeStory() {
  selectedAuthor.value = null;
}

watch(() => tab.value, (v) => {
  if (v === 'view') loadStatuses();
});
watch(() => [props.serverId, props.sessionName], () => {
  if (tab.value === 'view') loadStatuses();
});

function displayAuthor(value) {
  return (value || "").replace("@c.us", "").replace("@s.whatsapp.net", "").replace("@broadcast", "");
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts * (String(ts).length > 12 ? 1 : 1000));
  return d.toLocaleString();
}
</script>

<template>
  <div class="wa-snap">
    <div class="wa-snap__header">
      <span class="wa-snap__title">{{ t('chat.snap.title') }}</span>
      <div class="wa-snap__tabs">
        <Button
            :label="t('chat.snap.compose')"
            :severity="tab === 'compose' ? 'success' : 'secondary'"
            :text="tab !== 'compose'"
            size="small"
            @click="tab = 'compose'"
        />
        <Button
            :label="t('chat.snap.view')"
            :severity="tab === 'view' ? 'success' : 'secondary'"
            :text="tab !== 'view'"
            size="small"
            @click="tab = 'view'"
        />
      </div>
    </div>

    <div class="wa-snap__body">
      <!-- Compose -->
      <div v-if="tab === 'compose'" class="wa-snap__compose">
        <div
            v-if="!imagePreview"
            class="wa-snap__canvas"
            :style="{ background: bgColor }"
        >
          <textarea
              v-model="text"
              class="wa-snap__text"
              :placeholder="t('chat.snap.textPlaceholder')"
              rows="4"
          ></textarea>
        </div>
        <div v-else class="wa-snap__canvas wa-snap__canvas--media">
          <img :src="imagePreview" class="wa-snap__preview" alt="preview"/>
          <InputText v-model="caption" class="wa-snap__caption" :placeholder="t('chat.snap.captionPlaceholder')"/>
        </div>

        <div v-if="!imagePreview" class="wa-snap__colors">
          <button
              v-for="c in bgColors"
              :key="c"
              class="wa-snap__color"
              :class="{ 'wa-snap__color--active': c === bgColor }"
              :style="{ background: c }"
              @click="bgColor = c"
          ></button>
        </div>

        <div class="wa-snap__actions">
          <input ref="fileInput" type="file" accept="image/*,video/*" style="display:none" @change="onFileChange"/>
          <Button
              v-if="!imagePreview"
              icon="pi pi-image"
              :label="t('chat.snap.addPhoto')"
              text
              @click="pickImage"
          />
          <Button
              v-else
              icon="pi pi-times"
              :label="t('chat.snap.removePhoto')"
              text
              severity="secondary"
              @click="clearImage"
          />
          <Button
              icon="pi pi-send"
              :label="t('chat.snap.post')"
              severity="success"
              rounded
              :loading="posting"
              :disabled="!imagePreview && !text.trim()"
              @click="postStatus"
          />
        </div>
      </div>

      <!-- View -->
      <div v-else class="wa-snap__view">
        <div class="wa-snap__view-toolbar">
          <span class="wa-snap__view-title">{{ t('chat.snap.recentUpdates') }}</span>
          <RefreshButton :refreshing="loadingView" @click="loadStatuses"/>
        </div>

        <div v-if="loadingView" class="wa-snap__empty">
          <ProgressSpinner style="width:2rem;height:2rem"/>
        </div>
        <div v-else-if="viewUnavailable" class="wa-snap__empty">
          {{ t('chat.snap.viewUnavailable') }}
        </div>
        <div v-else-if="stories.length === 0" class="wa-snap__empty">
          {{ t('chat.snap.noStatuses') }}
        </div>

        <template v-else>
          <!-- Story rings (WhatsApp Updates style) -->
          <div class="wa-snap__stories">
            <button
                v-for="g in stories"
                :key="g.author"
                class="wa-snap__story"
                @click="openStory(g.author)"
            >
              <div class="wa-snap__ring" :class="{ 'wa-snap__ring--me': g.fromMe }">
                <img v-if="pictures[g.author]" :src="pictures[g.author]" class="wa-snap__ring-img" alt=""/>
                <i v-else class="pi pi-user"></i>
                <span class="wa-snap__count">{{ g.items.length }}</span>
              </div>
              <div class="wa-snap__story-name">
                {{ g.fromMe ? t('chat.snap.myStatus') : displayAuthor(g.author) }}
              </div>
              <div class="wa-snap__story-time">{{ fmtTime(g.latest) }}</div>
            </button>
          </div>
        </template>

        <!-- Selected story viewer -->
        <Dialog
            :visible="!!selectedStory"
            modal
            :showHeader="false"
            :style="{ width: '380px' }"
            @update:visible="v => { if (!v) closeStory() }"
        >
          <div v-if="selectedStory" class="wa-snap__viewer">
            <div class="wa-snap__viewer-head">
              <div class="wa-snap__ring wa-snap__ring--sm" :class="{ 'wa-snap__ring--me': selectedStory.fromMe }">
                <img v-if="pictures[selectedStory.author]" :src="pictures[selectedStory.author]" class="wa-snap__ring-img" alt=""/>
                <i v-else class="pi pi-user"></i>
              </div>
              <div class="wa-snap__viewer-name">
                {{ selectedStory.fromMe ? t('chat.snap.myStatus') : displayAuthor(selectedStory.author) }}
              </div>
              <Button icon="pi pi-times" text rounded @click="closeStory"/>
            </div>
            <div
                v-for="s in selectedStory.items"
                :key="s.id"
                class="wa-snap__viewer-item"
            >
              <div class="wa-snap__viewer-body">
                <i v-if="s.hasMedia || (s.type !== 'text' && s.type !== 'chat')" class="pi pi-image mr-2"></i>
                <span>{{ s.body || t('chat.snap.mediaStatus') }}</span>
              </div>
              <div class="wa-snap__viewer-time">{{ fmtTime(s.timestamp) }}</div>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.wa-snap {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wa-snap__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.5rem;
}

.wa-snap__title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #00a884;
}

.wa-snap__tabs {
  display: flex;
  gap: 0.25rem;
}

.wa-snap__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1rem 1.25rem;
}

.wa-snap__compose {
  max-width: 420px;
  margin: 0 auto;
}

.wa-snap__canvas {
  border-radius: 12px;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.wa-snap__canvas--media {
  flex-direction: column;
  gap: 0.75rem;
  background: #111b21;
}

.wa-snap__text {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: #fff;
  font-size: 1.5rem;
  text-align: center;

  &::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }
}

.wa-snap__preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  object-fit: contain;
}

.wa-snap__caption {
  width: 100%;
}

.wa-snap__colors {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.75rem;
}

.wa-snap__color {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.wa-snap__color--active {
  border-color: #111b21;
  transform: scale(1.15);
}

.wa-snap__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}

.wa-snap__view-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.wa-snap__view-title {
  font-weight: 600;
  color: var(--text-color-secondary);
}

.wa-snap__stories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 0.75rem;
}

.wa-snap__story {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 10px;
}

.wa-snap__story:hover {
  background: rgba(0, 168, 132, 0.08);
}

.wa-snap__ring-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.wa-snap__count {
  position: absolute;
  bottom: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #00a884;
  color: #fff;
  font-size: 0.7rem;
  line-height: 18px;
  text-align: center;
  border: 2px solid var(--surface-card);
}

.wa-snap__story-name {
  font-size: 0.8rem;
  max-width: 84px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.wa-snap__story-time {
  font-size: 0.68rem;
  color: var(--text-color-secondary);
}

.wa-snap__viewer-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--surface-border);
  margin-bottom: 0.5rem;
}

.wa-snap__viewer-name {
  flex: 1;
  font-weight: 600;
}

.wa-snap__viewer-item {
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.wa-snap__viewer-body {
  display: flex;
  align-items: center;
}

.wa-snap__viewer-time {
  font-size: 0.72rem;
  color: var(--text-color-secondary);
  margin-top: 0.2rem;
}

.wa-snap__empty {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 2rem 0;
}

.wa-snap__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.4rem;
  border-bottom: 1px solid var(--surface-border);
}

.wa-snap__ring {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dfe5e7;
  border: 3px solid #00a884;
  flex-shrink: 0;
  overflow: visible;

  i {
    font-size: 1.5rem;
    color: #8696a0;
  }
}

.wa-snap__ring--sm {
  width: 40px;
  height: 40px;
  border-width: 2px;

  i {
    font-size: 1.1rem;
  }
}

.wa-snap__ring--me {
  border-color: #0b93f6;
}

.wa-snap__item-info {
  flex: 1;
  min-width: 0;
}

.wa-snap__item-author {
  font-weight: 500;
}

.wa-snap__item-body {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wa-snap__item-time {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}
</style>
