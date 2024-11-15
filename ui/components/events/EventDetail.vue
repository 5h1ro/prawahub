<script setup>
const props = defineProps(["data"])
const values = computed(() => {
  const payload = props.data.payload
  const data = props.data
  const event = props.data.event
  switch (event) {
    case "session.status":
      return [
        payload.status,
        data.me?.id,
        data.me?.pushName,
      ]
    case "message":
    case "message.any":
    case "message.ack":
    case "message.reaction":
      return [
        payload.id,
        // short body to 20 symbols
        payload.body?.length > 20 ? payload.body.slice(0, 20) + "..." : payload.body,
        event === "message.ack" ? payload.ackName : null,
        payload.reaction?.text,
        payload.media?.url ? "🖼️" : null,
      ]
    case "presence.update":
      return [
        payload.id,
        payload.presences?.[0].lastKnownPresence
      ]
    default:
      return []
  }
})

const text = computed(() => {
  return values.value.filter(v => v != null).join(" | ")
})

</script>

<template>
  <!--  key: value of values, one line for all -->
  <div>
    <code>{{ text }}</code>
  </div>

</template>

<style scoped lang="scss">

</style>