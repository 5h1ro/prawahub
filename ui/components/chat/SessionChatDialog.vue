<script setup>

import {sleep} from "../../services/utils";
import ChatMessages from "./ChatMessages.vue";
import ChatHeader from "./ChatHeader.vue";
import ChatList from "./ChatList.vue";
import ChatInputFooter from "./ChatInputFooter.vue";
import Dialer from "./Dialer.vue";
import IncomingCallDialog from "./IncomingCallDialog.vue";
import {openCallAudio} from "../../services/callAudio";
import {ClientStatus, WebSocketClient} from "../../services/WebSocketService";
import {ref} from "vue";
import WebSocketStatus from "../events/WebSocketStatus.vue";
import {useI18n} from "vue-i18n";

const {t} = useI18n();

const visible = defineModel("visible");
const session = defineModel("session");

const toast = useToast();
const store = useServerStore()
const mergeOverview = ref(true)
const chats = ref([])
const pending = ref(false)
const chatsOffset = ref(0)
const loadingMoreChats = ref(false)

async function refreshChats() {
  chatsOffset.value = 0
  pending.value = true
  try {
    const data = await store.getChatsOverview(
        session.value.server.id,
        session.value.name,
        10,
        undefined,
        mergeOverview.value,
    )
    chats.value = data || []
  } finally {
    pending.value = false
  }
}

async function loadMoreChats() {
  if (loadingMoreChats.value) return
  loadingMoreChats.value = true
  try {
    const nextOffset = chatsOffset.value + 10
    const data = await store.getChatsOverview(
        session.value.server.id,
        session.value.name,
        10,
        nextOffset,
        mergeOverview.value,
    )
    if (data && data.length > 0) {
      chatsOffset.value = nextOffset
      chats.value = [...chats.value, ...data]
    }
  } finally {
    loadingMoreChats.value = false
  }
}

const selectedChat = ref(null)
const messages = ref([])

const profilePicture = ref(null)
watch(selectedChat, () => {
  if (!selectedChat.value) {
    return
  }
  fetchMessages()
})
const fetchingMessages = ref(false)
const loadingEarly = ref(false)
const hasEarlierMessages = ref(true)
const limit = ref(20)
const offset = ref(0)

let client = null
const clientStatus = ref(ClientStatus.DISCONNECTED)

function startClient() {
  const server = store.getServer(session.value.server.id)
  const listenEvents = ['message.any', 'call.received', 'call.accepted', 'call.rejected']
  client = new WebSocketClient(server, listenEvents, session.value.name)
  client.connect()
  clientStatus.value = ClientStatus.CONNECTING
  client.on("open", () => {
    clientStatus.value = ClientStatus.CONNECTED
  })
  client.on("close", () => {
    clientStatus.value = ClientStatus.DISCONNECTED
    restartClient()
  })
  client.on("error", () => {
    clientStatus.value = ClientStatus.ERROR
    restartClient()
  })
  client.on("event", handleEvent)
}

async function handleEvent(event) {
  const name = event?.event
  if (name === 'call.received' || name === 'call.accepted' || name === 'call.rejected') {
    onCallEvent(name, event.payload)
    return
  }
  await sleep(1000)
  const chatId = selectedChat.value?.id
  if (!chatId) {
    return
  }
  if (event.payload.from === chatId || event.payload.to === chatId) {
    fetchMessages()
  }
  refreshChats()
}

function restartClient() {
}

function stopClient() {
  client?.stop()
  client = null
  clientStatus.value = ClientStatus.DISCONNECTED
}


function fetchMessages() {
  offset.value = 0
  hasEarlierMessages.value = true
  fetchingMessages.value = true
  store.getChatsMessages(
      session.value.server.id,
      session.value.name,
      selectedChat.value.id,
      limit.value,
      0,
      false,
      mergeOverview.value,
  ).then((data) => {
    messages.value = data.reverse()
  }).finally(() => {
        fetchingMessages.value = false
      }
  )
}

async function loadEarlyMessages() {
  if (loadingEarly.value) return
  loadingEarly.value = true
  try {
    const nextOffset = offset.value + limit.value
    const data = await store.getChatsMessages(
        session.value.server.id,
        session.value.name,
        selectedChat.value.id,
        limit.value,
        nextOffset,
        false,
        mergeOverview.value,
    )
    if (data.length > 0) {
      offset.value = nextOffset
      messages.value = [...data.reverse(), ...messages.value]
    } else {
      hasEarlierMessages.value = false
    }
  } finally {
    loadingEarly.value = false
  }
}

function onMergeToggle(value) {
  mergeOverview.value = value
  refreshChats()
}

function initializeDialog() {
  if (!session.value?.server?.id || !session.value?.name) {
    return;
  }
  mergeOverview.value = true
  stopClient()
  startClient()
  refreshChats()

  if (!session.value?.me?.id) {
    profilePicture.value = null
    return
  }
  store.getProfilePicture(session.value.server.id, session.value.name, session.value.me.id).then((data) => {
    profilePicture.value = data.profilePictureURL
  })
}

watch(
    () => [visible.value, session.value?.server?.id, session.value?.name],
    ([isVisible, serverId, sessionName], [wasVisible, previousServerId, previousSessionName] = []) => {
      if (!isVisible) {
        selectedChat.value = null
        messages.value = []
        stopClient()
        resetCall()
        dialerVisible.value = false
        incoming.value = {visible: false, from: '', id: ''}
        return
      }

      const becameVisible = !wasVisible && isVisible
      const sessionChangedWhileOpen =
          wasVisible && isVisible && (serverId !== previousServerId || sessionName !== previousSessionName)

      if (becameVisible || sessionChangedWhileOpen) {
        initializeDialog()
      }
    }
)

function clickOnChat(chat) {
  selectedChat.value = chat
}

async function sendMedia(type, file, base64, caption) {
  if (!selectedChat.value) return
  const mediaFile = { data: base64, mimetype: file.type, filename: file.name }
  try {
    if (type === 'image') {
      await store.sendImage(session.value.server.id, session.value.name, selectedChat.value.id, mediaFile, caption)
    } else if (type === 'video') {
      await store.sendVideo(session.value.server.id, session.value.name, selectedChat.value.id, mediaFile, caption)
    } else if (type === 'audio') {
      await store.sendVoice(session.value.server.id, session.value.name, selectedChat.value.id, mediaFile)
    } else {
      await store.sendFile(session.value.server.id, session.value.name, selectedChat.value.id, mediaFile, caption)
    }
    await sleep(1000)
    fetchMessages()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.sendFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
    throw e
  }
}

async function sendText(text) {
  if (!selectedChat.value) {
    return
  }
  try {
    await store.readChatMessages(
        session.value.server.id,
        session.value.name,
        selectedChat.value.id,
    )
  } catch (e) {
    console.warn('Failed to mark chat as read before sending text', e)
    toast.add({
      severity: 'warn',
      summary: t('chat.readFailedTitle'),
      detail: t('chat.readFailedDescription'),
      life: 4000,
    })
  }
  try {
    await store.sendText(session.value.server.id, session.value.name, selectedChat.value.id, text)
    await sleep(1000)
    fetchMessages()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.sendFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
    throw e
  }
}

async function sendAiRich(type, text) {
  if (!selectedChat.value) {
    return
  }
  try {
    if (type === 'code') {
      await store.sendAIRichCodeBlock(session.value.server.id, session.value.name, selectedChat.value.id, text)
    } else {
      await store.sendAIRichMarkdown(session.value.server.id, session.value.name, selectedChat.value.id, text)
    }
    await sleep(1000)
    fetchMessages()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.sendFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
    throw e
  }
}

async function sendAiRichBlocks(blocks) {
  if (!selectedChat.value || !blocks || blocks.length === 0) {
    return
  }
  try {
    await store.sendAIRichMessage(session.value.server.id, session.value.name, selectedChat.value.id, blocks)
    await sleep(1000)
    fetchMessages()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.sendFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
    throw e
  }
}

const showPromo = ref(false)

//
// Native audio calls
//
const dialerVisible = ref(false)
const callBusy = ref(false)
const callState = ref('idle') // idle | calling | active
const activeCallId = ref(null)
const activePeer = ref('')
const callDuration = ref(0)
let callTimer = null
const incoming = ref({visible: false, from: '', id: ''})

const audioEl = ref(null)
const callAudio = ref(null)

async function setupAudio(callId) {
  if (!callId) {
    return
  }
  try {
    callAudio.value = await openCallAudio(async (sdpOffer) => {
      const res = await store.webrtcCall(session.value.server.id, session.value.name, callId, sdpOffer)
      return res.sdpAnswer
    })
    await nextTick()
    if (audioEl.value) {
      audioEl.value.srcObject = callAudio.value.remoteStream
      try {
        await audioEl.value.play()
      } catch (e) {
        // autoplay may require a user gesture; the call button click covers it
      }
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.callAudioFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
  }
}

function teardownAudio() {
  if (callAudio.value) {
    callAudio.value.close()
    callAudio.value = null
  }
  if (audioEl.value) {
    audioEl.value.srcObject = null
  }
}

function ensureChatId(number) {
  const value = String(number).trim()
  if (value.includes('@')) {
    return value
  }
  return `${value.replace(/[^0-9]/g, '')}@c.us`
}

function startCallTimer() {
  stopCallTimer()
  callDuration.value = 0
  callTimer = setInterval(() => {
    callDuration.value += 1
  }, 1000)
}

function stopCallTimer() {
  if (callTimer) {
    clearInterval(callTimer)
    callTimer = null
  }
}

function resetCall() {
  stopCallTimer()
  teardownAudio()
  callState.value = 'idle'
  activeCallId.value = null
  activePeer.value = ''
  callDuration.value = 0
  callBusy.value = false
}

async function placeCall(target) {
  const chatId = ensureChatId(target)
  callBusy.value = true
  try {
    const response = await store.startCall(session.value.server.id, session.value.name, chatId)
    activeCallId.value = response?.id || null
    activePeer.value = chatId
    callState.value = 'calling'
    dialerVisible.value = true
    await setupAudio(activeCallId.value)
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.callFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
  } finally {
    callBusy.value = false
  }
}

// From the dialer keypad
function onDialerCall(number) {
  placeCall(number)
}

// From the ChatHeader phone button (calls the open chat)
function startCall() {
  if (!selectedChat.value) {
    return
  }
  placeCall(selectedChat.value.id)
}

async function hangup() {
  if (!activeCallId.value) {
    resetCall()
    return
  }
  callBusy.value = true
  try {
    await store.endCall(session.value.server.id, session.value.name, activeCallId.value)
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.callFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
  } finally {
    resetCall()
  }
}

// Backward-compatible alias for the ChatHeader end button
function endCall() {
  hangup()
}

async function acceptIncoming() {
  callBusy.value = true
  try {
    await store.acceptCall(session.value.server.id, session.value.name, incoming.value.id)
    activeCallId.value = incoming.value.id
    activePeer.value = incoming.value.from
    callState.value = 'active'
    startCallTimer()
    dialerVisible.value = true
    const acceptedId = incoming.value.id
    incoming.value = {visible: false, from: '', id: ''}
    await setupAudio(acceptedId)
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.callFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
  } finally {
    callBusy.value = false
  }
}

async function rejectIncoming() {
  callBusy.value = true
  try {
    await store.rejectCall(session.value.server.id, session.value.name, incoming.value.from, incoming.value.id)
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('chat.callFailedTitle'),
      detail: e?.message || String(e),
      life: 5000,
    })
  } finally {
    incoming.value = {visible: false, from: '', id: ''}
    callBusy.value = false
  }
}

function onCallEvent(name, payload) {
  if (name === 'call.received') {
    if (payload?.isGroup) {
      return
    }
    incoming.value = {visible: true, from: payload?.from || '', id: payload?.id || ''}
    return
  }
  if (name === 'call.accepted') {
    if (!activeCallId.value || payload?.id === activeCallId.value) {
      callState.value = 'active'
      startCallTimer()
      dialerVisible.value = true
    }
    return
  }
  if (name === 'call.rejected') {
    if (activeCallId.value && payload?.id === activeCallId.value) {
      toast.add({severity: 'info', summary: t('chat.callEndedTitle'), life: 3000})
      resetCall()
    }
    if (incoming.value.id && payload?.id === incoming.value.id) {
      incoming.value = {visible: false, from: '', id: ''}
    }
  }
}

</script>

<template>
  <Dialog
      v-model:visible="visible"
      :modal="true"
      maximizable
      style="width: 90%; height: 90%;"
  >
    <template #header>
      <div>

        <SessionHeader
            :session="session"
        ></SessionHeader>
      </div>
    </template>
    <div class="pb-3 flex">
      <div class="flex align-items-center gap-1">
        <SessionChip
            v-if="session.me"
            :session="session"
            :image="profilePicture"
        >
        </SessionChip>
        <WebSocketStatus :status="clientStatus"></WebSocketStatus>
        <Button
            icon="pi pi-phone"
            label="Discador"
            size="small"
            severity="success"
            text
            v-tooltip.bottom="'Abrir discador'"
            @click="dialerVisible = true"
        />
      </div>
      <div class="m-auto pb-2">
        <div class="text-center">
          <a href="#" @click="showPromo = true">
            <b>{{ t('chat.aboutChatUI') }}</b>
          </a>
        </div>
        <ChatPromo
            style="max-width:50em"
            v-if="showPromo"
            @close="showPromo = false"
        ></ChatPromo>
      </div>
    </div>

    <Splitter style="max-height: 90%">
      <SplitterPanel :size=30 class="flex items-center justify-center">
        <ChatList
            :chats="chats"
            :pending="pending"
            :merge="mergeOverview"
            :loadMoreChats="loadMoreChats"
            :loadingMoreChats="loadingMoreChats"
            @click-on-chat="clickOnChat"
            @refresh-chats="refreshChats"
            @update:merge="onMergeToggle"
        ></ChatList>
      </SplitterPanel>
      <SplitterPanel :size=70 class="flex flex-column gap-2 justify-content-between p-2">
        <div class="flex flex-column justify-content-between" style="height: 100%">
          <template v-if="selectedChat">
            <ChatHeader
                :chat="selectedChat"
                :me="session.me"
                :mePicture="profilePicture"
                :fetch="fetchMessages"
                :fetching="fetchingMessages"
                :callActive="!!activeCallId"
                :callBusy="callBusy"
                @start-call="startCall"
                @end-call="endCall"
            >
            </ChatHeader>
            <hr>

            <ChatMessages
                :messages="messages"
                :loadEarlier="loadEarlyMessages"
                :loadingEarlier="loadingEarly"
                :hasEarlierMessages="hasEarlierMessages"
                :serverId="session.server.id"
                :sessionName="session.name"
            ></ChatMessages>

            <ChatInputFooter
                :disabled="!selectedChat || fetchingMessages"
                :sendText="sendText"
                :sendAiRich="sendAiRich"
                :sendAiRichBlocks="sendAiRichBlocks"
                :sendMedia="sendMedia"
            />
          </template>
        </div>
      </SplitterPanel>
    </Splitter>

    <Dialer
        v-model:visible="dialerVisible"
        :callState="callState"
        :peer="activePeer"
        :busy="callBusy"
        :durationSecs="callDuration"
        @call="onDialerCall"
        @hangup="hangup"
    />
    <IncomingCallDialog
        v-model:visible="incoming.visible"
        :from="incoming.from"
        :busy="callBusy"
        @accept="acceptIncoming"
        @reject="rejectIncoming"
    />
    <audio ref="audioEl" autoplay playsinline style="display:none"></audio>
  </Dialog>

</template>

<style scoped lang="scss">

</style>
