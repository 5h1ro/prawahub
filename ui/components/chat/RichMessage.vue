<script setup>
import {computed, ref} from "vue";
import {useI18n} from "vue-i18n";

const props = defineProps({
  submessages: {type: Array, default: () => []},
})
const {t} = useI18n();
const toast = useToast();

// WhatsApp rich submessage types
const TYPE = {TEXT: 2, MARKDOWN: 3, TABLE: 4, CODE: 5, LATEX: 8};

const blocks = computed(() =>
    (props.submessages || []).map((s) => {
      const type = s.messageType;
      if (type === TYPE.CODE) {
        const meta = s.codeMetadata || {};
        const code = (meta.codeBlocks || []).map((c) => c.codeContent).join("\n");
        return {kind: "code", language: meta.codeLanguage || "", code};
      }
      if (type === TYPE.TABLE) {
        const meta = s.tableMetadata || {};
        return {kind: "table", title: meta.title || "", rows: meta.rows || []};
      }
      if (type === TYPE.LATEX) {
        return {kind: "latex", text: s.latexMetadata?.text || ""};
      }
      // text / markdown / unknown -> text
      return {kind: "text", text: s.messageText || s.markdownMetadata?.text || ""};
    }).filter((b) => (b.kind === "table" ? b.rows.length : (b.text || b.code)))
);

// Code viewer popup
const codeDialog = ref({visible: false, code: "", language: ""});

function openCode(block) {
  codeDialog.value = {visible: true, code: block.code, language: block.language};
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(codeDialog.value.code);
    toast.add({severity: "success", summary: t("chat.actions.copied"), life: 2000});
  } catch (e) {
    toast.add({severity: "warn", summary: t("chat.actions.copyFailed"), life: 3000});
  }
}

function codePreview(code) {
  return code.length > 400 ? code.slice(0, 400) + "…" : code;
}
</script>

<template>
  <div class="rich">
    <template v-for="(b, i) in blocks" :key="i">
      <!-- Text -->
      <p v-if="b.kind === 'text'" class="rich__text">{{ b.text }}</p>

      <!-- LaTeX / math -->
      <div v-else-if="b.kind === 'latex'" class="rich__latex">{{ b.text }}</div>

      <!-- Code -->
      <div v-else-if="b.kind === 'code'" class="rich__code">
        <button class="rich__code-head" @click="openCode(b)">
          <i class="pi pi-code rich__code-icon"></i>
          <div class="rich__code-labels">
            <span class="rich__code-kind">{{ b.language || 'Code' }}</span>
            <span class="rich__code-view">{{ t('chat.rich.viewCode') }}</span>
          </div>
        </button>
        <pre class="rich__code-preview">{{ codePreview(b.code) }}</pre>
      </div>

      <!-- Table -->
      <div v-else-if="b.kind === 'table'" class="rich__table-wrap">
        <table class="rich__table">
          <tbody>
            <tr v-for="(row, r) in b.rows" :key="r">
              <component
                  :is="row.isHeading ? 'th' : 'td'"
                  v-for="(cell, c) in row.items"
                  :key="c"
              >{{ cell }}</component>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Full code viewer -->
    <Dialog
        v-model:visible="codeDialog.visible"
        modal
        :header="codeDialog.language || 'Code'"
        :style="{ width: '640px', maxWidth: '95vw' }"
        :pt="{ content: { style: 'padding:0' } }"
    >
      <template #header>
        <div class="rich__dlg-head">
          <span>{{ codeDialog.language || 'Code' }}</span>
          <Button icon="pi pi-copy" text rounded severity="success" v-tooltip.bottom="t('chat.actions.copy')" @click="copyCode"/>
        </div>
      </template>
      <pre class="rich__code-full">{{ codeDialog.code }}</pre>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.rich {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rich__text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.rich__latex {
  font-family: 'Cambria Math', Georgia, serif;
  font-size: 1.15rem;
  font-style: italic;
}

.rich__code {
  border-radius: 10px;
  overflow: hidden;
  background: #0f1b22;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.rich__code-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  border: none;
  background: #1f2c33;
  color: #e9edef;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  text-align: left;
}

.rich__code-head:hover {
  background: #26343c;
}

.rich__code-icon {
  font-size: 1.3rem;
  color: #8696a0;
}

.rich__code-labels {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.rich__code-kind {
  font-size: 0.75rem;
  color: #8696a0;
  text-transform: capitalize;
}

.rich__code-view {
  font-weight: 600;
}

.rich__code-preview {
  margin: 0;
  padding: 0.6rem 0.75rem;
  color: #d1d7db;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 9rem;
  overflow: hidden;
}

.rich__table-wrap {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
}

.rich__table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9rem;

  th, td {
    border: 1px solid var(--surface-border);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  th {
    background: rgba(0, 168, 132, 0.12);
    font-weight: 700;
  }
}

.rich__dlg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
  text-transform: capitalize;
}

.rich__code-full {
  margin: 0;
  padding: 1rem;
  background: #0f1b22;
  color: #d1d7db;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.9rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 70vh;
  overflow: auto;
}
</style>
