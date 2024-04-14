<script setup>
import {useToast} from "primevue/usetoast";

defineProps(['session'])
const toast = useToast();
const refreshScreenshot = () => {
  toast.add({severity: 'info', summary: 'Screenshot', detail: 'Refreshing screenshot'});
}

</script>

<template>
  <Splitter style="min-height: 300px" class="mb-5">
    <SplitterPanel :size="40">
      <div class="px-4 pb-4">
        <div class="flex justify-content-center align-items-center">
          <h5 class="m-0">Screenshot</h5>
          <RefreshButton
              @click="refreshScreenshot"
          ></RefreshButton>
        </div>
        <img src="/demo/images/nature/nature9.jpg" alt="Nature 9"
             style=" width:100%; height:100%"
        />
      </div>
    </SplitterPanel>

    <SplitterPanel :size="100">
      <Splitter layout="vertical">
        <SplitterPanel :size="50">
          <div class="p-4 pt-3">
            <div class="flex justify-content-center align-items-center">
              <h5>Request</h5>
            </div>
          </div>
        </SplitterPanel>
        <SplitterPanel :size="50">
          <div class="p-4 pt-3">
            <div class="flex justify-content-center align-items-center">
              <h5>Response</h5>
            </div>
          </div>
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>
  </Splitter>

</template>

<style scoped lang="scss">

</style>
