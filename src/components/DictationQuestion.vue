<template>
  <v-card class="dictation-question mx-auto" max-width="700">
    <v-card-text class="text-center pa-8">
      <p class="text-body-2 text-medium-emphasis mb-4">問題</p>
      <p class="text-h5 font-weight-bold question-text mb-8">{{ questionText }}</p>
      <v-text-field
        v-model="inputValue"
        label="英単語を入力"
        variant="outlined"
        autofocus
        autocomplete="off"
        autocorrect="off"
        autocapitalize="none"
        spellcheck="false"
        aria-label="英単語を入力"
        @keydown.enter="onEnter"
      />
      <p class="text-body-2 text-medium-emphasis">Enter を押して回答を確定</p>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  questionText: string
}>()

const emit = defineEmits<{
  submit: [value: string]
}>()

const inputValue = ref('')

function onEnter() {
  emit('submit', inputValue.value)
}
</script>

<style scoped>
.dictation-question {
  min-height: 200px;
}

.question-text {
  word-break: break-word;
  line-height: 1.6;
}
</style>
