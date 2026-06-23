<template>
  <v-card class="cloze-question mx-auto" max-width="700">
    <v-card-text class="pa-8">
      <p class="text-body-2 text-medium-emphasis mb-4">問題</p>
      <p class="text-body-1 translation-text mb-4">{{ sentenceJp }}</p>
      <p class="text-h5 font-weight-bold question-text mb-8 text-center">{{ questionText }}</p>
      <div class="choice-grid">
        <v-btn
          v-for="choice in choices"
          :key="choice"
          class="choice-button text-none"
          color="primary"
          variant="outlined"
          size="large"
          @click="emit('submit', choice)"
        >
          {{ choice }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  questionText: string
  sentenceJp: string
  choices: string[]
}>()

const emit = defineEmits<{
  submit: [value: string]
}>()
</script>

<style scoped>
.cloze-question {
  min-height: 200px;
}

.question-text {
  word-break: break-word;
  line-height: 1.6;
}

.translation-text {
  line-height: 1.8;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.choice-button {
  min-height: 64px;
  height: auto;
  white-space: normal;
  overflow-wrap: anywhere;
}

.choice-button :deep(.v-btn__content) {
  white-space: normal;
  line-height: 1.25;
}

@media (max-width: 600px) {
  .choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
