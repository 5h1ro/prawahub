<script setup>

import {sleep} from "../../services/utils";
import ChatMessages from "./ChatMessages.vue";
import ChatHeader from "./ChatHeader.vue";
import ChatList from "./ChatList.vue";
import ChatInputFooter from "./ChatInputFooter.vue";
import Dialer from "./Dialer.vue";
import IncomingCallDialog from "./IncomingCallDialog.vue";
import NavRail from "./NavRail.vue";
import SnapView from "./SnapView.vue";
import CallsView from "./CallsView.vue";
import ProfileView from "./ProfileView.vue";
import {openCallAudio} from "../../services/callAudio";
import {ClientStatus, WebSocketClient} from "../../services/WebSocketService";
import {ref} from "vue";
import WebSocketStatus from "../events/WebSocketStatus.vue";
import {useI18n} from "vue-i18n";
import NewsletterView from "./NewsletterView.vue";
import {buildContactIndex, isNewsletter, isStatusBroadcast} from "../../utils/waContacts";

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

// Contacts (shared by Calls + Snap for name/number resolution)
const contacts = ref([])
const contactIndex = computed(() => buildContactIndex(contacts.value))

async function fetchContacts() {
  try {
    const data = await store.getContacts(session.value.server.id, session.value.name)
    contacts.value = Array.isArray(data) ? data : []
  } catch (e) {
    contacts.value = []
  }
}

function isPinned(c) {
  return !!(c?.pinned || c?._chat?.pinned || c?.isPinned)
}

// Real conversations: drop newsletters and the status broadcast pseudo-chat,
// pinned chats float to the top (like WhatsApp)
const chatItems = computed(() =>
    chats.value
        .filter(c => !isNewsletter(c.id) && !isStatusBroadcast(c.id))
        .slice()
        .sort((a, b) => (isPinned(b) ? 1 : 0) - (isPinned(a) ? 1 : 0))
)
const newsletterItems = computed(() =>
    chats.value.filter(c => isNewsletter(c.id))
)

async function refreshChats(silent = false) {
  chatsOffset.value = 0
  if (!silent) pending.value = true
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
    if (!silent) pending.value = false
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

const activeView = ref('chats') // chats | snap | calls | profile
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

function sameChat(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const ua = String(a).split('@')[0].split(':')[0]
  const ub = String(b).split('@')[0].split(':')[0]
  return !!ua && ua === ub
}

//
// Incoming-message notification sound
//
const soundEnabled = ref(true)
let audioCtx = null

function loadSoundPref() {
  try {
    soundEnabled.value = localStorage.getItem('wa.sound') !== '0'
  } catch (e) {
    soundEnabled.value = true
  }
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  try {
    localStorage.setItem('wa.sound', soundEnabled.value ? '1' : '0')
  } catch (e) {
    // ignore
  }
  if (soundEnabled.value) playNotification()
}

function playNotification() {
  if (!soundEnabled.value) return
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx || new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const now = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1180, now + 0.09)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    osc.start(now)
    osc.stop(now + 0.36)
  } catch (e) {
    // audio unavailable
  }
}

async function handleEvent(event) {
  const name = event?.event
  if (name === 'call.received' || name === 'call.accepted' || name === 'call.rejected') {
    onCallEvent(name, event.payload)
    return
  }
  // Keep the chat list fresh without flashing the big loading spinner
  refreshChats(true)

  // Ding on a new incoming message (not our own, not an ack/edit noise)
  if (name && name.startsWith('message') && event?.payload && !event.payload.fromMe) {
    playNotification()
  }

  const chatId = selectedChat.value?.id
  if (!chatId) {
    return
  }
  const from = event?.payload?.from
  const to = event?.payload?.to
  if (sameChat(from, chatId) || sameChat(to, chatId)) {
    // Refetch the open thread silently so new messages appear instantly on the right
    fetchMessages(true)
  }
}

function restartClient() {
}

function stopClient() {
  client?.stop()
  client = null
  clientStatus.value = ClientStatus.DISCONNECTED
}


function fetchMessages(silent = false) {
  offset.value = 0
  hasEarlierMessages.value = true
  if (!silent) fetchingMessages.value = true
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
        if (!silent) fetchingMessages.value = false
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
  activeView.value = 'chats'
  loadSoundPref()
  stopClient()
  startClient()
  refreshChats()
  fetchContacts()

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
  replyingTo.value = null
}

const selectedIsReadOnly = computed(() => isNewsletter(selectedChat.value?.id))

function openNewsletter(item) {
  selectedChat.value = item
  replyingTo.value = null
  activeView.value = 'chats'
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
    const replyTo = replyingTo.value?.id || undefined
    await store.sendText(session.value.server.id, session.value.name, selectedChat.value.id, text, replyTo)
    replyingTo.value = null
    await sleep(800)
    fetchMessages(true)
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

//
// Message actions (reply / react / forward / delete)
//
const replyingTo = ref(null)
const forwardDialog = ref({visible: false, message: null})

function onReplyMessage(message) {
  replyingTo.value = message
}

function cancelReply() {
  replyingTo.value = null
}

async function onReactMessage({message, reaction}) {
  try {
    await store.setReaction(session.value.server.id, session.value.name, message.id, reaction)
    await sleep(600)
    fetchMessages(true)
  } catch (e) {
    toast.add({severity: 'error', summary: t('chat.actionFailed'), detail: e?.message || String(e), life: 5000})
  }
}

function openForward(message) {
  forwardDialog.value = {visible: true, message}
}

async function doForward(targetChatId) {
  const message = forwardDialog.value.message
  forwardDialog.value = {visible: false, message: null}
  if (!message || !targetChatId) return
  try {
    await store.forwardMessage(session.value.server.id, session.value.name, targetChatId, message.id)
    toast.add({severity: 'success', summary: t('chat.forwarded'), life: 3000})
  } catch (e) {
    toast.add({severity: 'error', summary: t('chat.actionFailed'), detail: e?.message || String(e), life: 5000})
  }
}

async function onDeleteMessage(message) {
  const chatId = message?._data?.id?.remote || selectedChat.value?.id
  try {
    await store.deleteMessage(session.value.server.id, session.value.name, chatId, message.id)
    messages.value = messages.value.filter(m => m.id !== message.id)
  } catch (e) {
    toast.add({severity: 'error', summary: t('chat.actionFailed'), detail: e?.message || String(e), life: 5000})
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
      :pt="{ content: { style: 'display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden;' } }"
  >
    <template #header>
      <div>

        <SessionHeader
            :session="session"
        ></SessionHeader>
      </div>
    </template>
    <div class="wa-shell">
      <NavRail v-model:active="activeView" :mePicture="profilePicture"/>

      <div class="wa-shell__content">
        <div class="wa-shell__topbar">
          <SessionChip
              v-if="session.me"
              :session="session"
              :image="profilePicture"
          >
          </SessionChip>
          <WebSocketStatus :status="clientStatus"></WebSocketStatus>
          <div class="ml-auto flex align-items-center gap-2">
            <Button
                :icon="soundEnabled ? 'pi pi-volume-up' : 'pi pi-volume-off'"
                text
                rounded
                size="small"
                class="wa-shell__sound"
                v-tooltip.bottom="soundEnabled ? t('chat.sound.on') : t('chat.sound.off')"
                @click="toggleSound"
            />
            <a href="#" class="wa-shell__promo-link" @click.prevent="showPromo = true">
              <b>{{ t('chat.aboutChatUI') }}</b>
            </a>
          </div>
          <ChatPromo
              style="max-width:50em"
              v-if="showPromo"
              @close="showPromo = false"
          ></ChatPromo>
        </div>

        <!-- Chats -->
        <Splitter v-if="activeView === 'chats'" class="wa-shell__view">
          <SplitterPanel :size=30 class="flex items-center justify-center">
            <ChatList
                :chats="chatItems"
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
                    @reply="onReplyMessage"
                    @react="onReactMessage"
                    @forward="openForward"
                    @delete="onDeleteMessage"
                ></ChatMessages>

                <div v-if="selectedIsReadOnly" class="wa-readonly">
                  <i class="pi pi-megaphone"></i>
                  <span>{{ t('chat.newsletter.readOnly') }}</span>
                </div>
                <template v-else>
                  <div v-if="replyingTo" class="wa-reply-banner">
                    <div class="wa-reply-banner__bar"></div>
                    <div class="wa-reply-banner__body">
                      <div class="wa-reply-banner__title">{{ t('chat.reply.replyingTo') }}</div>
                      <div class="wa-reply-banner__text">{{ (replyingTo.body || t('chat.snap.mediaStatus')).slice(0, 120) }}</div>
                    </div>
                    <Button icon="pi pi-times" text rounded size="small" @click="cancelReply"/>
                  </div>
                  <ChatInputFooter
                      :disabled="!selectedChat || fetchingMessages"
                      :sendText="sendText"
                      :sendAiRich="sendAiRich"
                      :sendAiRichBlocks="sendAiRichBlocks"
                      :sendMedia="sendMedia"
                  />
                </template>
              </template>
              <div v-else class="wa-shell__placeholder">
                <i class="pi pi-comments"></i>
                <span>{{ t('chat.selectChat') }}</span>
              </div>
            </div>
          </SplitterPanel>
        </Splitter>

        <!-- Snap -->
        <SnapView
            v-else-if="activeView === 'snap'"
            class="wa-shell__view"
            :serverId="session.server.id"
            :sessionName="session.name"
            :contactIndex="contactIndex"
        />

        <!-- Calls -->
        <CallsView
            v-else-if="activeView === 'calls'"
            class="wa-shell__view"
            :serverId="session.server.id"
            :sessionName="session.name"
            :contacts="contacts"
            :contactIndex="contactIndex"
            :busy="callBusy"
            @call="onDialerCall"
        />

        <!-- Newsletter -->
        <NewsletterView
            v-else-if="activeView === 'newsletter'"
            class="wa-shell__view"
            :items="newsletterItems"
            :pending="pending"
            @refresh="refreshChats"
            @open="openNewsletter"
        />

        <!-- Profile -->
        <ProfileView
            v-else-if="activeView === 'profile'"
            class="wa-shell__view"
            :serverId="session.server.id"
            :sessionName="session.name"
            :me="session.me"
            :mePicture="profilePicture"
        />
      </div>
    </div>

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

    <Dialog
        v-model:visible="forwardDialog.visible"
        modal
        :header="t('chat.forward.title')"
        :style="{ width: '360px' }"
    >
      <div class="wa-forward">
        <div
            v-for="c in chatItems"
            :key="c.id"
            class="wa-forward__item"
            @click="doForward(c.id)"
        >
          <div class="wa-forward__avatar">
            <img v-if="c.picture" :src="c.picture" alt=""/>
            <i v-else class="pi pi-user"></i>
          </div>
          <span>{{ c.name || c.id }}</span>
        </div>
      </div>
    </Dialog>
  </Dialog>

</template>

<style scoped lang="scss">
.wa-shell {
  display: flex;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--surface-border);
}

.wa-reply-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-hover);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  margin-bottom: 0.4rem;
}

.wa-reply-banner__bar {
  width: 3px;
  align-self: stretch;
  background: #00a884;
  border-radius: 3px;
}

.wa-reply-banner__body {
  flex: 1;
  min-width: 0;
}

.wa-reply-banner__title {
  font-size: 0.75rem;
  color: #00a884;
  font-weight: 600;
}

.wa-reply-banner__text {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wa-readonly {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  color: var(--text-color-secondary);
  background: var(--surface-hover);
  border-radius: 8px;
}

.wa-forward__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
}

.wa-forward__item:hover {
  background: rgba(0, 168, 132, 0.08);
}

.wa-forward__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  background: #dfe5e7;
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

.wa-shell__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
}

.wa-shell__topbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #008069;
  color: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.wa-shell__topbar :deep(a),
.wa-shell__promo-link {
  color: #fff;
}

.wa-shell__sound :deep(.p-button-icon),
.wa-shell__sound {
  color: #fff !important;
}

.wa-shell__view {
  flex: 1;
  min-height: 0;
  max-height: 100%;
}

.wa-shell__placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--text-color-secondary);

  i {
    font-size: 3rem;
    color: #008069;
    opacity: 0.5;
  }
}
</style>
