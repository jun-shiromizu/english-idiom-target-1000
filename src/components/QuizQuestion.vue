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
      <p class="text-h5 font-weight-bold question-text">{{ questionText }}</p>
      <p class="text-body-2 text-medium-emphasis mt-8">
        タップ / クリックして回答を表示
      </p>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  questionText: string
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
</style>
