<script setup>
defineProps(['session'])

</script>

<template>
  <Splitter style="min-height: 300px" class="mb-5">
    <SplitterPanel :size="40">
      <div class="p-4">
        <div class="flex justify-content-center">
          <h6>Screenshot</h6>
        </div>
        <img src="/demo/images/nature/nature9.jpg" alt="Nature 9"
             style=" width:100%; height:100%"
        />
      </div>
    </SplitterPanel>
    <SplitterPanel :size="100">
      <Splitter layout="vertical">
        <SplitterPanel :size="50">
          <div className="h-full flex align-items-center justify-content-center">Request</div>
        </SplitterPanel>
        <SplitterPanel :size="50">
          <div className="h-full flex align-items-center justify-content-center">Response</div>
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>
  </Splitter>

</template>

<style scoped lang="scss">

</style>
