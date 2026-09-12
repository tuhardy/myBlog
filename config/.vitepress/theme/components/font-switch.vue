<script setup lang="ts">
/**
 * font-switch.vue — 导航栏展示字体切换（文楷 ⇄ 无衬线）
 *
 * 切换 html 上的 .font-sans class：custom.css 中 --vp-font-display 变量
 * 随之从「霞鹜文楷」切回无衬线栈，作用于首页大标题、区块标题、文章标题。
 * 偏好写入 localStorage（pref-font），config.mts head 里的内联脚本
 * 在首帧前应用，避免字体闪烁。
 */
import { onMounted, ref } from 'vue'

const FONT_KEY = 'pref-font'
const sans = ref(false)

onMounted(() => {
  sans.value = document.documentElement.classList.contains('font-sans')
})

function toggle() {
  sans.value = !sans.value
  document.documentElement.classList.toggle('font-sans', sans.value)
  try {
    localStorage.setItem(FONT_KEY, sans.value ? 'sans' : 'display')
  } catch {}
}
</script>

<template>
  <button
    type="button"
    class="font-switch"
    :aria-pressed="sans"
    :title="sans ? '标题字体：无衬线（点击切回文楷）' : '标题字体：霞鹜文楷（点击切换无衬线）'"
    @click="toggle"
  >
    <span class="font-switch__mark" aria-hidden="true">Aa</span>
    <span class="font-switch__mode">{{ sans ? 'SANS' : '楷' }}</span>
  </button>
</template>

<style scoped>
.font-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 8px;
  padding: 5px 11px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.font-switch:hover {
  color: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
}
.font-switch:focus-visible {
  outline: 2px solid var(--vp-c-accent);
  outline-offset: 2px;
}
.font-switch__mark {
  font-weight: 700;
}
.font-switch__mode {
  font-size: 11px;
}
</style>
