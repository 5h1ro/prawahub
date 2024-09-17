<script setup>
import SessionHeader from "./SessionHeader.vue";
import QRImage from "./QRImage.vue";
import PairingCodeSteps from "./PairingCodeSteps.vue";
import ScanQRCodeGuide from "./ScanQRCodeGuide.vue";

const visible = defineModel("visible");
const props = defineProps(['session'])

</script>

<template>
  <Dialog
      v-model:visible="visible"
      :modal="true"
      class="p-fluid"
      maximizable
  >
    <template #header>
      <SessionHeader
          :session="session"
      ></SessionHeader>
    </template>
    <TabView>
      <TabPanel>
        <template #header>
          <i class="pi pi-qrcode mr-2"></i>
          Scan QR
        </template>
        <p>
          Scan <b>QR Code</b>
          to authorize this session.
        </p>
        <ScanQRCodeGuide/>
        <div>
          <QRImage :session="session"></QRImage>
        </div>
      </TabPanel>
      <TabPanel>
        <template #header>
          <i class="pi pi-send mr-2"></i>
          Enter Code
        </template>
        <p class="m-0">
          Enter <b>Your Phone number</b>:
        </p>
        <div>
          <PairingCodeSteps :session="session"></PairingCodeSteps>
        </div>
      </TabPanel>
    </TabView>
  </Dialog>

</template>

<style scoped lang="scss">

</style>
