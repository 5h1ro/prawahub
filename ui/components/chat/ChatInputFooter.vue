<script setup>
import ChatMediaAttachment from "./ChatMediaAttachment.vue"
import AIRichComposer from "./AIRichComposer.vue"
import RichMessage from "./RichMessage.vue"
import {useI18n} from "vue-i18n"

const {t} = useI18n()

const props = defineProps({
  disabled: Boolean,
  sendText: Function,
  sendAiRich: Function,
  sendAiRichBlocks: Function,
  sendMedia: Function,
})

const loading = ref(false)
const text = ref('')
const attachments = ref([]) // { type, file, previewUrl }
const sendProgress = ref(null) // { current, total }

// AI rich composer
const composerVisible = ref(false)
const stagedBlocks = ref([]) // blocks staged from the composer, sent as one message
const hasStagedBlocks = computed(() => stagedBlocks.value.length > 0)

function onComposerSubmit(blocks) {
  stagedBlocks.value = blocks
}

function clearStagedBlocks() {
  stagedBlocks.value = []
}

// Convert a composer block into the WAHA rich-submessage shape so the
// preview renders exactly like the recipient will see it (via RichMessage).
function blockToSubmessage(block) {
  switch (block.type) {
    case 'code':
      return {
        messageType: 5,
        codeMetadata: {
          codeLanguage: block.language || '',
          codeBlocks: [{codeContent: block.text || ''}],
        },
      }
    case 'table': {
      const rows = []
      if ((block.headers || []).length) rows.push({isHeading: true, items: block.headers})
      for (const r of (block.rows || [])) rows.push({isHeading: false, items: r})
      return {messageType: 4, tableMetadata: {title: block.title || '', rows}}
    }
    case 'latex':
      return {messageType: 8, latexMetadata: {text: block.text || ''}}
    default:
      return {messageType: 2, messageText: block.text || ''}
  }
}

const hasAttachments = computed(() => attachments.value.length > 0)
const allAudio = computed(() => hasAttachments.value && attachments.value.every(a => a.type === 'audio'))
const captionDisabled = computed(() => allAudio.value)

const sendDisabled = computed(() =>
    props.disabled || loading.value || (!hasAttachments.value && !text.value && !hasStagedBlocks.value)
)

//
// File picker
//
const fileInputRef = ref(null)
const pickerType = ref(null)

const menuRef = ref(null)
const menuItems = computed(() => [
  {
    label: t('chat.send.attach.image'),
    icon: 'pi pi-image',
    command: () => openPicker('image', 'image/*'),
  },
  {
    label: t('chat.send.attach.video'),
    icon: 'pi pi-video',
    command: () => openPicker('video', 'video/*'),
  },
  {
    label: t('chat.send.attach.audio'),
    icon: 'pi pi-microphone',
    command: () => openPicker('audio', 'audio/*'),
  },
  {
    label: t('chat.send.attach.file'),
    icon: 'pi pi-file',
    command: () => openPicker('file', '*/*'),
  },
])
function openPicker(type, accept) {
  pickerType.value = type
  fileInputRef.value.accept = accept
  fileInputRef.value.click()
}

function onFilesChanged(event) {
  const files = [...event.target.files]
  event.target.value = ''
  for (const file of files) {
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    attachments.value.push({ type: pickerType.value, file: file, previewUrl: previewUrl })
  }
}

function removeAttachment(index) {
  const att = attachments.value[index]
  if (att.previewUrl) URL.revokeObjectURL(att.previewUrl)
  attachments.value.splice(index, 1)
}

//
// Sending
//
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Enter sends (Shift+Enter makes a new line via the textarea default).
function onEnterSend(event) {
  if (event?.isComposing) return // don't send mid IME composition
  event?.preventDefault()
  if (sendDisabled.value) return
  send()
}

async function send() {
  if (hasStagedBlocks.value) {
    await sendStagedRich()
  } else if (hasAttachments.value) {
    await sendAttachments()
  } else {
    await sendTextMessage()
  }
}

async function sendTextMessage() {
  loading.value = true
  try {
    await props.sendText(text.value)
    text.value = ''
  } finally {
    loading.value = false
  }
}

async function sendStagedRich() {
  if (!props.sendAiRichBlocks) return
  // A single message: the typed text (if any) becomes a leading text block,
  // followed by the blocks composed in the popup.
  const blocks = []
  if (text.value.trim()) {
    blocks.push({ type: 'text', text: text.value })
  }
  blocks.push(...stagedBlocks.value)
  loading.value = true
  try {
    await props.sendAiRichBlocks(blocks)
    text.value = ''
    stagedBlocks.value = []
  } finally {
    loading.value = false
  }
}

async function sendAttachments() {
  loading.value = true
  const total = attachments.value.length
  try {
    for (let i = 0; i < total; i++) {
      sendProgress.value = { current: i + 1, total: total }
      const att = attachments.value[i]
      const base64 = await fileToBase64(att.file)
      const caption = (i === 0 && !captionDisabled.value) ? text.value : undefined
      await props.sendMedia(att.type, att.file, base64, caption)
    }
    attachments.value.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl) })
    attachments.value = []
    text.value = ''
  } finally {
    sendProgress.value = null
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-column" style="width: 100%">
    <!-- Attachment previews -->
    <div v-if="hasAttachments" class="flex flex-wrap gap-2 mb-2">
      <ChatMediaAttachment
          v-for="(att, i) in attachments"
          :key="i"
          :attachment="att"
          @remove="removeAttachment(i)"
      />
    </div>

    <!-- Staged rich message preview -->
    <div v-if="hasStagedBlocks" class="wa-rich-preview mb-2">
      <div class="flex align-items-center gap-2 mb-2">
        <font-awesome-icon icon="wand-magic-sparkles" class="text-primary"/>
        <span class="text-sm font-medium">{{ t('chat.rich.preview') }}</span>
        <span class="text-xs text-color-secondary">
          {{ t('chat.rich.blockCount', { count: stagedBlocks.length }) }}
        </span>
        <div class="flex-1"></div>
        <Button label="Edit" text size="small" icon="pi pi-pencil" @click="composerVisible = true"/>
        <Button icon="pi pi-times" text rounded size="small" severity="secondary" @click="clearStagedBlocks"/>
      </div>
      <div class="wa-rich-preview__body">
        <template v-for="(b, i) in stagedBlocks" :key="i">
          <div v-if="b.type === 'image'" class="wa-rich-preview__img">
            <img :src="b.imageUrl" alt=""/>
            <small v-if="b.imageText" class="block mt-1">{{ b.imageText }}</small>
          </div>
          <RichMessage v-else :submessages="[blockToSubmessage(b)]"/>
        </template>
      </div>
    </div>

    <div class="flex align-items-center" style="width: 100%; gap: 0.5rem">
      <!-- Text / caption input with clip button overlaid inside on the right -->
      <div style="flex: 1; position: relative">
        <Textarea
            v-model="text"
            rows="2"
            :disabled="captionDisabled"
            :placeholder="captionDisabled ? t('chat.send.placeholder.noAudioCaption') : (hasAttachments ? t('chat.send.placeholder.caption') : '')"
            @keydown.enter.exact="onEnterSend"
            style="width: 100%; padding-right: 5rem"
        />
        <Button
            icon="pi pi-paperclip"
            text
            rounded
            size="small"
            :disabled="disabled || loading"
            @click="menuRef.toggle($event)"
            style="position: absolute; right: 2.55rem; top: 50%; transform: translateY(-50%)"
        />
        <Menu ref="menuRef" :model="menuItems" popup/>
        <Button
            text
            rounded
            size="small"
            aria-label="Compose rich message"
            :disabled="disabled || loading || hasAttachments"
            @click="composerVisible = true"
            style="position: absolute; right: 0.25rem; top: 50%; transform: translateY(-50%)"
        >
          <font-awesome-icon icon="wand-magic-sparkles"/>
        </Button>
        <input ref="fileInputRef" type="file" multiple style="display: none" @change="onFilesChanged"/>
      </div>

      <!-- Send button + progress -->
      <div class="flex flex-column align-items-center" style="gap: 2px">
        <Button
            @click="send"
            :disabled="sendDisabled"
            :loading="loading"
            icon="pi pi-send"
            class="p-button-success"
        />
        <small v-if="sendProgress && sendProgress.total > 1" class="text-color-secondary" style="font-size: 0.7rem; white-space: nowrap">
          {{ t('chat.send.progress', { current: sendProgress.current, total: sendProgress.total }) }}
        </small>
      </div>
    </div>

    <AIRichComposer v-model:visible="composerVisible" :initial-blocks="stagedBlocks" @submit="onComposerSubmit"/>
  </div>
</template>

<style scoped lang="scss">
.wa-rich-preview {
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  background: var(--surface-50);
}

.wa-rich-preview__body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 40vh;
  overflow: auto;
}

.wa-rich-preview__img img {
  max-width: 180px;
  max-height: 180px;
  border-radius: 8px;
  object-fit: cover;
}
</style>
