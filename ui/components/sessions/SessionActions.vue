<script setup>
import {useConfirm} from "primevue/useconfirm";
import {useToast} from "primevue/usetoast";

const props = defineProps(['session'])


const store = useServerStore()
const confirmPopup = useConfirm();
const req = useShowToastOnResult()

const toast = useToast();
const stopping = ref(false)
const loggingOut = ref(false)
const removing = ref(false)
const starting = ref(false)
const restarting = ref(false)
const allDisabled = computed(
    () => {
      return stopping.value || loggingOut.value || removing.value || starting.value || restarting.value
    }
)

async function startSession() {
  const session = props.session
  starting.value = true
  await req(
      store.startSession(session.server.id, session.name),
      `Started`,
      `Failed to start session`,
      session.name,
      session.name
  ).finally(
      () => starting.value = false
  )
}
function confirmRestartSession(event) {
  const session = props.session
  confirmPopup.require({
    target: event.target,
    message: `Restart '${session.name}' session?`,
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined p-button-sm',
    acceptClass: 'p-button-info p-button-sm',
    rejectLabel: 'No',
    acceptLabel: 'Yes, Restart',
    accept: async () => {
      restarting.value = true
      await req(
          store.restartSession(session.server.id, session.name),
          `Restarted`,
          `Failed to restart session`,
          session.name,
          session.name
      ).finally(
          () => restarting.value = false
      )
    },
    reject: () => {
    }
  });
}

function confirmStopSession(event) {
  const session = props.session
  confirmPopup.require({
    target: event.target,
    message: `Stop '${session.name}' session?`,
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined p-button-sm',
    acceptClass: 'p-button-warning p-button-sm',
    rejectLabel: 'No',
    acceptLabel: 'Yes, Stop',
    accept: async () => {
      stopping.value = true
      await req(
          store.stopSession(session.server.id, session.name),
          `Stopped`,
          `Failed to stop session`,
          session.name,
          session.name
      ).finally(
          () => stopping.value = false
      )
    },
    reject: () => {
    }
  });
}

function confirmLogoutSession(event) {
  const session = props.session
  confirmPopup.require({
    target: event.target,
    message: `Logout '${session.name}' session?\n`,
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined p-button-sm',
    acceptClass: 'p-button-warning p-button-sm',
    rejectLabel: 'No',
    acceptLabel: 'Yes, Logout',
    accept: async () => {
      loggingOut.value = true
      await req(
          store.logoutSession(session.server.id, session.name),
          `Logged out`,
          `Failed to logout session`,
          session.name,
          session.name
      ).finally(
          () => loggingOut.value = false
      )
    },
    reject: () => {
    }
  });
}

function confirmRemoveSession(event) {
  const session = props.session
  confirmPopup.require({
    target: event.target,
    message: `Delete '${session.name}' session?\n`,
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined p-button-sm',
    acceptClass: 'p-button-danger p-button-sm',
    rejectLabel: 'No',
    acceptLabel: 'Yes, Delete',
    accept: async () => {
      removing.value = true
      await req(
          store.deleteSession(session.server.id, session.name),
          `Removed`,
          `Failed to delete session`,
          session.name,
          session.name
      ).finally(
          () => removing.value = false
      )
    },
    reject: () => {
    }
  });
}

</script>

<template>
  <div class="flex flex-row gap-2 justify-content-end">
    <Button
        icon="pi pi-cog"
        v-tooltip.top="'Configuration'"
        severity="help"
        rounded
        outlined
        @click="$emit('view', session)"
        :disabled="allDisabled"
    />
    <Button
        icon="pi pi-play"
        v-tooltip.top="'Start'"
        severity="success"
        rounded
        outlined
        @click="startSession"
        :loading="starting"
        :disabled="allDisabled"
    />
    <Button
        icon="pi pi-replay"
        v-tooltip.top="'Restart'"
        severity="info"
        rounded outlined
        @click="confirmRestartSession($event, session)"
        :loading="restarting"
        :disabled="allDisabled"
    />
    <Button
        icon="pi pi-stop"
        v-tooltip.top="'Stop'"
        severity="secondary"
        rounded outlined
        @click="confirmStopSession($event, session)"
        :loading="stopping"
        :disabled="allDisabled"
    />
    <Button
        icon="pi pi-sign-out"
        v-tooltip.top="'Logout'"
        severity="warning"
        rounded
        outlined
        @click="confirmLogoutSession($event, session)"
        :loading="loggingOut"
        :disabled="allDisabled"
    />
    <Button
        icon="pi pi-trash"
        v-tooltip.top="'Delete'"
        severity="danger"
        rounded
        outlined
        @click="confirmRemoveSession($event, session)"
        :loading="removing"
        :disabled="allDisabled"
    />
  </div>
</template>

<style scoped lang="scss">

</style>
