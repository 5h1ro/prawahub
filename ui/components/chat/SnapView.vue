<script setup>
import {ref, computed, watch} from "vue";
import {useI18n} from "vue-i18n";
import StoryViewer from "./StoryViewer.vue";
import {resolveContact, isStatusBroadcast} from "../../utils/waContacts";

const props = defineProps({
  serverId: {type: [String, Number], default: null},
  sessionName: {type: String, default: null},
  contactIndex: {type: Object, default: null},
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

// --- View ---
const statuses = ref([]);
const loadingView = ref(false);
const viewUnavailable = ref(false);
const pictures = ref({});
const activeStoryIdx = ref(-1);

function extractThumb(m) {
  const body = m._data?.body;
  const type = m._data?.type;
  if (body && (type === 'image' || type === 'video') && typeof body === 'string' && body.length > 100) {
    return `data:image/jpeg;base64,${body}`;
  }
  const raw = m._data?.Message || m._data?.message;
  const img = raw?.imageMessage;
  const vid = raw?.videoMessage;
  const thumb = (img?.JPEGThumbnail || img?.jpegThumbnail || vid?.JPEGThumbnail || vid?.jpegThumbnail);
  return thumb ? `data:image/jpeg;base64,${thumb}` : null;
}

function normalizeMessage(m) {
  const author = m.author || m.participant || m.from || m.sender || '';
  return {
    id: m.id?._serialized || m.id || `${author}-${m.timestamp}`,
    author,
    body: m.body || m.caption || m._data?.caption || '',
    type: m.type || (m.hasMedia ? 'media' : 'text'),
    hasMedia: !!m.hasMedia,
    thumbnail: extractThumb(m),
    timestamp: m.timestamp || m.messageTimestamp || 0,
    fromMe: !!m.fromMe,
  };
}

async function loadStatuses() {
  if (!props.serverId || !props.sessionName) return;
  loadingView.value = true;
  viewUnavailable.value = false;
  activeStoryIdx.value = -1;
  let ok = false;
  const collected = [];
  try {
    const data = await store.getChatsMessages(
        props.serverId, props.sessionName, 'status@broadcast', 100, 0, false, false,
    );
    if (Array.isArray(data)) {
      ok = true;
      for (const m of data) {
        const n = normalizeMessage(m);
        // skip entries with no real author (the broadcast container itself)
        if (!n.author || isStatusBroadcast(n.author)) continue;
        collected.push(n);
      }
    }
  } catch (e) {
    // engine may not expose status messages
  }
  statuses.value = collected.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  viewUnavailable.value = !ok && collected.length === 0;
  loadingView.value = false;
  loadAuthorPictures();
}

function loadAuthorPictures() {
  const authors = [...new Set(statuses.value.filter(s => !s.fromMe).map(s => s.author))];
  authors.forEach(async (id) => {
    if (!id || pictures.value[id] !== undefined) return;
    pictures.value[id] = null;
    try {
      const data = await store.getProfilePicture(props.serverId, props.sessionName, id);
      pictures.value = {...pictures.value, [id]: data?.profilePictureURL || data || null};
    } catch (e) {
      // keep placeholder
    }
  });
}

// Group by author into stories with resolved name/number
const stories = computed(() => {
  const map = new Map();
  for (const s of statuses.value) {
    if (!map.has(s.author)) {
      const r = resolveContact(props.contactIndex, s.author);
      map.set(s.author, {
        author: s.author,
        name: s.fromMe ? t('chat.snap.myStatus') : r.name,
        number: s.fromMe ? '' : r.number,
        fromMe: s.fromMe,
        items: [],
        latest: 0,
      });
    }
    const g = map.get(s.author);
    g.items.push(s);
    if (s.timestamp > g.latest) g.latest = s.timestamp;
  }
  const list = [...map.values()];
  list.forEach(g => g.items.sort((a, b) => a.timestamp - b.timestamp));
  list.sort((a, b) => b.latest - a.latest);
  list.sort((a, b) => (b.fromMe ? 1 : 0) - (a.fromMe ? 1 : 0));
  return list;
});

const activeStory = computed(() => {
  const g = stories.value[activeStoryIdx.value];
  if (!g) return null;
  return {...g, picture: pictures.value[g.author] || null};
});

function openStory(idx) {
  activeStoryIdx.value = idx;
}

function closeStory() {
  activeStoryIdx.value = -1;
}

function nextStory() {
  if (activeStoryIdx.value < stories.value.length - 1) activeStoryIdx.value += 1;
  else closeStory();
}

function prevStory() {
  if (activeStoryIdx.value > 0) activeStoryIdx.value -= 1;
}

watch(() => tab.value, (v) => {
  if (v === 'view') loadStatuses();
});
watch(() => [props.serverId, props.sessionName], () => {
  if (tab.value === 'view') loadStatuses();
});

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
        <div v-if="!imagePreview" class="wa-snap__canvas" :style="{ background: bgColor }">
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
          <Button v-if="!imagePreview" icon="pi pi-image" :label="t('chat.snap.addPhoto')" text @click="pickImage"/>
          <Button v-else icon="pi pi-times" :label="t('chat.snap.removePhoto')" text severity="secondary" @click="clearImage"/>
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

        <div v-else class="wa-snap__list">
          <button
              v-for="(g, idx) in stories"
              :key="g.author"
              class="wa-snap__row"
              @click="openStory(idx)"
          >
            <div class="wa-snap__ring" :class="{ 'wa-snap__ring--me': g.fromMe }">
              <img v-if="pictures[g.author]" :src="pictures[g.author]" class="wa-snap__ring-img" alt=""/>
              <i v-else class="pi pi-user"></i>
              <span class="wa-snap__count">{{ g.items.length }}</span>
            </div>
            <div class="wa-snap__row-info">
              <div class="wa-snap__row-name">{{ g.name }}</div>
              <div class="wa-snap__row-sub">
                <span v-if="g.number">{{ g.number }} · </span>{{ fmtTime(g.latest) }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <StoryViewer
        :story="activeStory"
        :serverId="serverId"
        :sessionName="sessionName"
        @close="closeStory"
        @next-story="nextStory"
        @prev-story="prevStory"
    />
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

.wa-snap__empty {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 2rem 0;
}

.wa-snap__list {
  display: flex;
  flex-direction: column;
}

.wa-snap__row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.55rem 0.4rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  width: 100%;
}

.wa-snap__row:hover {
  background: rgba(0, 168, 132, 0.08);
}

.wa-snap__ring {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dfe5e7;
  border: 3px solid #00a884;
  flex-shrink: 0;

  i {
    font-size: 1.4rem;
    color: #8696a0;
  }
}

.wa-snap__ring--me {
  border-color: #0b93f6;
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

.wa-snap__row-info {
  min-width: 0;
}

.wa-snap__row-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wa-snap__row-sub {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}
</style>
