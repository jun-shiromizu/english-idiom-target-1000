import { readonly, ref } from 'vue'

const appNotice = ref<string | null>(null)

/** 画面遷移をまたいでトップへ伝える通知 */
export function useAppNotice() {
  function setNotice(message: string): void {
    appNotice.value = message
  }

  function consumeNotice(): string | null {
    const message = appNotice.value
    appNotice.value = null
    return message
  }

  return { notice: readonly(appNotice), setNotice, consumeNotice }
}
