<script setup>
import {computed} from "vue";
import {useToast} from "primevue/usetoast";
import {useServerStore} from "../stores/useServerStore";

const props = defineProps(['session'])
const toast = useToast();
const refreshScreenshot = () => {
  toast.add({severity: 'info', summary: 'Screenshot', detail: 'Refreshing screenshot'});
}
const response = ref(null)
const requestMethod = ref('POST')
const requestEndpoint = ref('/api/sendText')
const requestExample = {
  "chatId": "11111111111@c.us",
  "text": "Hi there!",
  "session": props.session.name,
}
const requestBody = ref(JSON.stringify(requestExample, null, 2))
const rpcRequest = computed(() => {
  return {
    method: requestMethod.value,
    uri: requestEndpoint.value,
    params: undefined,
    body: JSON.parse(requestBody.value),
  }
})

async function copyResponse(event) {
  await navigator.clipboard.writeText(response.value);
  event.preventDefault();
}

async function copyRequest(event) {
  await navigator.clipboard.writeText(JSON.stringify(rpcRequest.value, null, 2));
  event.preventDefault();
}

const methods = ['GET', 'POST', 'PUT', 'DELETE', "PATCH"]

const exampleResponse =
    {
      status: 200,
      response: {
        "id": "false_11111111111@c.us_AAAAAAAAAAAAAAAAAAAA",
        "timestamp": 1666943582,
        "from": "11111111111@c.us",
        "fromMe": true,
        "to": "11111111111@c.us",
        "participant": "string",
      }
    }
response.value = JSON.stringify(exampleResponse, null, 2)
</script>

<template>
  <Splitter>
    <SplitterPanel :size="50">
      <Splitter layout="vertical">
        <SplitterPanel :size="30">
          <div class="px-4 py-3">
            <div class="flex justify-content-center align-items-center">
              <h5>Info</h5>
            </div>
            <div>
              <SessionChip
                  :session="session"
                  image="/demo/images/avatar/amyelsner.png"
              >
              </SessionChip>
            </div>
          </div>
        </SplitterPanel>
        <SplitterPanel :size="70">
          <div class="px-4 pb-4">
            <div class="flex justify-content-center align-items-center">
              <h5 class="m-0">Screenshot</h5>
              <RefreshButton
                  @click="refreshScreenshot"
              ></RefreshButton>
            </div>
            <div class="flex justify-content-center align-items-center">
              <img src="/demo/images/nature/nature9.jpg" alt="Nature 9"/>
            </div>
          </div>
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>

    <SplitterPanel :size="50">
      <Splitter layout="vertical">
        <SplitterPanel :size="50">
          <div class="p-4 pt-0 h-full flex flex-column">
            <div class="flex justify-content-center align-items-center">
              <h5 class="m-0">Request</h5>
              <Button
                  rounded
                  text=""
                  v-tooltip.focus.bottom="{ value: 'Copied to clipboard' }"
                  :tabindex="0"
                  icon="pi pi-copy"
                  @click="copyRequest($event)">
              </Button>
            </div>
            <div class="flex flex-column justify-content-between h-full">
              <div class="flex flex-column gap-2">
                <div class="flex gap-2">
                  <Dropdown
                      v-model="requestMethod"
                      :options="methods"
                  />
                  <InputText type="text" class="w-full" v-model="requestEndpoint"/>
                </div>
                <div class="text-center">
                  <div class="mb-2">Body</div>
                  <Textarea v-model="requestBody" rows=8 class="w-full"/>
                </div>
              </div>
              <div class="text-center">
                <Button><b>Send</b></Button>
              </div>
            </div>
          </div>
        </SplitterPanel>

        <SplitterPanel :size="50">
          <div class="p-4 pt-0 flex flex-column h-full">
            <div class="flex justify-content-center align-items-center">
              <h5 class="m-0">Response</h5>
              <Button
                  rounded
                  text=""
                  v-tooltip.focus.bottom="{ value: 'Copied to clipboard' }"
                  :tabindex="0"
                  icon="pi pi-copy"
                  @click="copyResponse($event)">
              </Button>
            </div>
            <CodeHighlight class="m-0 p-4">
              {{ response }}
            </CodeHighlight>
          </div>
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>
  </Splitter>

</template>

<style scoped lang="scss">

</style>
