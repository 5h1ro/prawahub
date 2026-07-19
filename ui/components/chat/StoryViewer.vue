<script setup>
import {ref, computed, watch, onUnmounted} from "vue";
import {resolveMediaUrl} from "../../utils/media";

const props = defineProps({
  story: {type: Object, default: null}, // { author, name, number, fromMe, items: [] }
  serverId: {type: [String, Number], default: null},
  sessionName: {type: String, default: null},
  cache: {type: Object, default: null}, // messageId -> { url, mime } (prefetched)
})
const emit = defineEmits(["close", "prev-story", "next-story"]);

const store = useServerStore();

const index = ref(0);
const thumbUrl = ref(null);
const blobUrl = ref(null);
const blobMime = ref(null);
const loadingMedia = ref(false);
const failed = ref(false);
let timer = null;
let objectUrl = null;

const items = computed(() => props.story?.items || []);
const current = computed(() => items.value[index.value] || null);

const isMedia = computed(() => {
  const c = current.value;
  if (!c) return false;
  return c.hasMedia || (c.type && c.type !== "text" && c.type !== "chat");
});

const declaredMime = ref(null);

const isVideo = computed(() => {
  const c = current.value;
  const t = String(c?.type || "");
  if (t.includes("video") || t.includes("ptv")) return true;
  const m = blobMime.value || declaredMime.value || "";
  return m.startsWith("video");
});

function clearTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function revoke() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

const progress = ref(0);

function startTimer() {
  clearTimer();
  progress.value = 0;
  // Videos advance on their own 'ended' event; use a long safety fallback
  const durationMs = isVideo.value ? 30000 : 5000;
  const step = 100;
  timer = setInterval(() => {
    progress.value += (step / durationMs) * 100;
    if (progress.value >= 100) {
      next();
    }
  }, step);
}

async function loadCurrent() {
  revoke();
  thumbUrl.value = null;
  blobUrl.value = null;
  blobMime.value = null;
  declaredMime.value = null;
  failed.value = false;
  const c = current.value;
  if (!c) return;
  if (!isMedia.value) {
    startTimer();
    return;
  }
  // instant thumbnail (used as image or as video poster)
  if (c.thumbnail) {
    thumbUrl.value = c.thumbnail;
  }
  // Prefetched by SnapView? Use it directly, no download needed.
  const cached = props.cache && props.cache[c.id];
  if (cached && cached.url) {
    blobUrl.value = cached.url;
    blobMime.value = cached.mime || "";
    declaredMime.value = cached.mime || "";
    startTimer();
    return;
  }
  startTimer();
  loadingMedia.value = true;
  try {
    const full = await store.getChatMessage(props.serverId, props.sessionName, c.id, "status@broadcast");
    const rawUrl = full?.media?.url;
    const mime = full?.media?.mimetype || "";
    if (!rawUrl) {
      failed.value = !thumbUrl.value;
      return;
    }
    declaredMime.value = mime; // lets isVideo switch to the <video> element early
    const server = store.getServer(props.serverId);
    const url = resolveMediaUrl(rawUrl, server?.connection?.url);
    const key = server?.connection?.key;
    const headers = key ? {"X-Api-Key": key} : {};
    const res = await fetch(url, {headers});
    if (!res.ok) {
      failed.value = !thumbUrl.value;
      return;
    }
    const blob = await res.blob();
    revoke();
    objectUrl = URL.createObjectURL(blob);
    blobUrl.value = objectUrl;
    blobMime.value = mime || blob.type;
    // restart timing now that real media (esp. video) is ready
    startTimer();
  } catch (e) {
    failed.value = !thumbUrl.value;
  } finally {
    loadingMedia.value = false;
  }
}

function next() {
  if (index.value < items.value.length - 1) {
    index.value += 1;
  } else {
    emit("next-story");
  }
}

function prev() {
  if (index.value > 0) {
    index.value -= 1;
  } else {
    emit("prev-story");
  }
}

function close() {
  emit("close");
}

watch(() => props.story, () => {
  index.value = 0;
}, {immediate: true});

watch([current], () => {
  loadCurrent();
}, {immediate: true});

onUnmounted(() => {
  clearTimer();
  revoke();
});

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts * (String(ts).length > 12 ? 1 : 1000));
  return d.toLocaleString();
}
</script>

<template>
  <div v-if="story" class="story" @click.self="close">
    <!-- progress segments -->
    <div class="story__bars">
      <div v-for="(it, i) in items" :key="it.id" class="story__bar">
        <div
            class="story__bar-fill"
            :style="{ width: i < index ? '100%' : (i === index ? progress + '%' : '0%') }"
        ></div>
      </div>
    </div>

    <!-- header -->
    <div class="story__header">
      <div class="story__avatar">
        <img v-if="story.picture" :src="story.picture" alt=""/>
        <i v-else class="pi pi-user"></i>
      </div>
      <div class="story__who">
        <div class="story__name">{{ story.fromMe ? story.name : story.name }}</div>
        <div class="story__sub">
          <span v-if="story.number">{{ story.number }} · </span>{{ fmtTime(current?.timestamp) }}
        </div>
      </div>
      <Button icon="pi pi-times" text rounded class="story__close" @click="close"/>
    </div>

    <!-- content -->
    <div class="story__content">
      <div class="story__nav story__nav--left" @click="prev"></div>
      <div class="story__nav story__nav--right" @click="next"></div>

      <template v-if="isMedia">
        <!-- Video: poster shows immediately, plays once the blob is fetched -->
        <video
            v-if="isVideo && (blobUrl || thumbUrl)"
            :key="blobUrl || 'poster'"
            :src="blobUrl || undefined"
            :poster="thumbUrl || undefined"
            class="story__media"
            autoplay
            muted
            playsinline
            controls
            @ended="next"
        />
        <img
            v-else-if="!isVideo && (blobUrl || thumbUrl)"
            :src="blobUrl || thumbUrl"
            class="story__media"
            alt="status"
        />
        <div v-else-if="loadingMedia" class="story__loading">
          <ProgressSpinner style="width:2.5rem;height:2.5rem"/>
        </div>
        <div v-else-if="failed" class="story__failed">
          <i class="pi pi-exclamation-triangle"></i>
          <span>Media unavailable</span>
        </div>

        <div v-if="isVideo && loadingMedia && !blobUrl" class="story__spinner-overlay">
          <ProgressSpinner style="width:2rem;height:2rem"/>
        </div>
      </template>
      <div v-else class="story__text">
        {{ current?.body }}
      </div>

      <!-- caption -->
      <div v-if="isMedia && current?.body" class="story__caption">{{ current.body }}</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.story {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  flex-direction: column;
}

.story__bars {
  display: flex;
  gap: 4px;
  padding: 10px 14px 4px;
}

.story__bar {
  flex: 1;
  height: 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.story__bar-fill {
  height: 100%;
  background: #fff;
  transition: width 0.1s linear;
}

.story__header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1rem;
  color: #fff;
}

.story__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: #2a3942;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  i {
    color: #8696a0;
  }
}

.story__who {
  flex: 1;
  min-width: 0;
}

.story__name {
  font-weight: 600;
}

.story__sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.story__close {
  color: #fff !important;
}

.story__content {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.story__nav {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 35%;
  z-index: 5;
  cursor: pointer;
}

.story__nav--left {
  left: 0;
}

.story__nav--right {
  right: 0;
}

.story__media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.story__text {
  color: #fff;
  font-size: 1.8rem;
  text-align: center;
  padding: 2rem;
  max-width: 600px;
  word-break: break-word;
}

.story__spinner-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 6;
}

.story__loading,
.story__failed {
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.story__failed i {
  font-size: 2rem;
  color: #f59e0b;
}

.story__caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  color: #fff;
  text-align: center;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}
</style>
