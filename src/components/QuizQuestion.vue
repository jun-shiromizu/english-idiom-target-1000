<template>
  <v-card
    class="quiz-question mx-auto"
    max-width="700"
    :ripple="false"
    role="button"
    tabindex="0"
    aria-label="タップまたはクリックして回答を表示"
    @click="emit('reveal')"
    @keydown.enter="emit('reveal')"
    @keydown.space.prevent="emit('reveal')"
  >
    <v-card-text class="text-center pa-8">
      <p class="text-body-2 text-medium-emphasis mb-4">問題</p>
      <p class="text-h5 font-weight-bold question-text" :class="{ 'preserve-line-breaks': preserveLineBreaks }">{{ questionText }}</p>
      <p v-if="hint" class="text-body-1 mt-4">{{ hint }}</p>
      <p class="text-body-2 text-medium-emphasis mt-8">
        タップ / クリックして回答を表示
      </p>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  questionText: string
  /** 問題文の補足（古文の回答すべき意味の数など） */
  hint?: string
  /** 問題文の改行をそのまま表示する */
  preserveLineBreaks?: boolean
}>()

const emit = defineEmits<{
  reveal: []
}>()
</script>

<style scoped>
.quiz-question {
  cursor: pointer;
  min-height: 200px;
  display: flex;
  align-items: center;
  user-select: none;
}

.question-text {
  word-break: break-word;
  line-height: 1.6;
}

.preserve-line-breaks {
  white-space: pre-line;
}
</style>
