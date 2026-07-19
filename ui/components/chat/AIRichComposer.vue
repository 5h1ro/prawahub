<script setup>
import {useI18n} from "vue-i18n"

const {t} = useI18n()

const props = defineProps({
  visible: Boolean,
  initialBlocks: {type: Array, default: () => []}, // blocks to edit when reopened
})
const emit = defineEmits(['update:visible', 'submit'])

const blockTypes = [
  {label: 'Text', value: 'text', icon: 'pi pi-align-left'},
  {label: 'Code', value: 'code', icon: 'pi pi-code'},
  {label: 'Table', value: 'table', icon: 'pi pi-table'},
  {label: 'LaTeX', value: 'latex', icon: 'pi pi-percentage'},
  {label: 'Image', value: 'image', icon: 'pi pi-image'},
]

const currentType = ref('text')
const blocks = ref([]) // committed blocks

// editor fields
const text = ref('')
const language = ref('javascript')
const title = ref('')
const headers = ref('')
const rows = ref('')
const imageUrl = ref('')
const imageText = ref('')

function resetEditor() {
  text.value = ''
  language.value = 'javascript'
  title.value = ''
  headers.value = ''
  rows.value = ''
  imageUrl.value = ''
  imageText.value = ''
}

const canAdd = computed(() => {
  switch (currentType.value) {
    case 'image':
      return !!imageUrl.value.trim()
    case 'table':
      return !!rows.value.trim() || !!headers.value.trim()
    default:
      return !!text.value.trim()
  }
})

function buildBlock() {
  const type = currentType.value
  if (type === 'code') {
    return {type: 'code', language: language.value || 'javascript', text: text.value}
  }
  if (type === 'table') {
    const headerCells = headers.value.split(',').map(s => s.trim()).filter(Boolean)
    const bodyRows = rows.value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.split(',').map(s => s.trim()))
    return {type: 'table', title: title.value, headers: headerCells, rows: bodyRows}
  }
  if (type === 'latex') {
    return {type: 'latex', text: text.value}
  }
  if (type === 'image') {
    return {type: 'image', imageUrl: imageUrl.value.trim(), imageText: imageText.value}
  }
  return {type: 'text', text: text.value}
}

function addBlock() {
  if (!canAdd.value) return
  blocks.value.push(buildBlock())
  resetEditor()
}

function removeBlock(index) {
  blocks.value.splice(index, 1)
}

function moveBlock(index, delta) {
  const to = index + delta
  if (to < 0 || to >= blocks.value.length) return
  const [item] = blocks.value.splice(index, 1)
  blocks.value.splice(to, 0, item)
}

function blockSummary(block) {
  switch (block.type) {
    case 'code':
      return `Code (${block.language}): ${(block.text || '').slice(0, 40)}`
    case 'table':
      return `Table: ${(block.headers || []).join(' | ') || '(no header)'} · ${(block.rows || []).length} rows`
    case 'latex':
      return `LaTeX: ${(block.text || '').slice(0, 40)}`
    case 'image':
      return `Image: ${block.imageUrl}`
    default:
      return `Text: ${(block.text || '').slice(0, 50)}`
  }
}

// Load existing blocks when the dialog opens (Edit flow).
watch(() => props.visible, (v) => {
  if (v) {
    blocks.value = JSON.parse(JSON.stringify(props.initialBlocks || []))
    resetEditor()
  }
})

function close() {
  emit('update:visible', false)
}

function submit() {
  // commit any in-progress editor content as a final block
  if (canAdd.value) {
    blocks.value.push(buildBlock())
    resetEditor()
  }
  if (blocks.value.length === 0) return
  emit('submit', JSON.parse(JSON.stringify(blocks.value)))
  blocks.value = []
  resetEditor()
  close()
}

function onHide() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
      :visible="visible"
      @update:visible="onHide"
      modal
      header="Compose rich message"
      :style="{width: '640px', maxWidth: '95vw'}"
  >
    <div class="flex flex-column gap-3">
      <SelectButton
          v-model="currentType"
          :options="blockTypes"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
      >
        <template #option="slotProps">
          <i :class="slotProps.option.icon" class="mr-1"/>
          <span>{{ slotProps.option.label }}</span>
        </template>
      </SelectButton>

      <!-- Editors per type -->
      <div v-if="currentType === 'code'" class="flex flex-column gap-2">
        <InputText v-model="language" placeholder="Language (e.g. javascript)"/>
        <Textarea v-model="text" rows="5" placeholder="Code..." autoResize/>
      </div>

      <div v-else-if="currentType === 'table'" class="flex flex-column gap-2">
        <InputText v-model="title" placeholder="Table title (optional)"/>
        <InputText v-model="headers" placeholder="Headers, comma separated (e.g. Name, Age)"/>
        <Textarea v-model="rows" rows="5"
                  placeholder="One row per line, cells comma separated&#10;John, 30&#10;Jane, 25" autoResize/>
      </div>

      <div v-else-if="currentType === 'image'" class="flex flex-column gap-2">
        <InputText v-model="imageUrl" placeholder="Image URL (https://...)"/>
        <InputText v-model="imageText" placeholder="Caption (optional)"/>
      </div>

      <div v-else class="flex flex-column gap-2">
        <Textarea v-model="text" rows="5"
                  :placeholder="currentType === 'latex' ? 'LaTeX, e.g. E = mc^2' : 'Text...'" autoResize/>
      </div>

      <div>
        <Button label="Add block" icon="pi pi-plus" size="small" text :disabled="!canAdd" @click="addBlock"/>
      </div>

      <!-- Staged blocks -->
      <div v-if="blocks.length" class="flex flex-column gap-1 border-top-1 surface-border pt-2">
        <small class="text-color-secondary">Blocks ({{ blocks.length }})</small>
        <div v-for="(block, i) in blocks" :key="i"
             class="flex align-items-center gap-2 p-2 border-round surface-100">
          <span class="text-sm flex-1 white-space-nowrap overflow-hidden text-overflow-ellipsis">
            {{ i + 1 }}. {{ blockSummary(block) }}
          </span>
          <Button icon="pi pi-arrow-up" text rounded size="small" :disabled="i === 0" @click="moveBlock(i, -1)"/>
          <Button icon="pi pi-arrow-down" text rounded size="small" :disabled="i === blocks.length - 1"
                  @click="moveBlock(i, 1)"/>
          <Button icon="pi pi-times" text rounded size="small" severity="danger" @click="removeBlock(i)"/>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" text @click="close"/>
      <Button label="Insert into message" icon="pi pi-check"
              :disabled="blocks.length === 0 && !canAdd" @click="submit"/>
    </template>
  </Dialog>
</template>

<style scoped lang="scss">
</style>
