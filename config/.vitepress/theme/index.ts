import DefaultTheme from 'vitepress/theme'
import type { EnhanceAppContext } from 'vitepress'
import Layout from './layouts/Layout.vue'
import './styles/custom.css'

const originalEnhanceApp = DefaultTheme.enhanceApp

/**
 * 导航栏下边缘「渐进阴影」：随页面滚动连续渐显
 *
 * 页面在顶部时 --nav-p=0，导航栏阴影完全透明（与 Hero 融为一体）；
 * 向下滚动 NAV_THRESHOLD(80px) 内 --nav-p 由 0 平滑增至 1，阴影渐显至满值。
 * 配合 custom.css 里用 calc(var(--nav-p)) 驱动 box-shadow 的 alpha 通道，
 * 实现 Apple / Medium 式的导航栏滚动渐显阴影。
 *
 * 实现说明：
 *  - VPNavBar 是 Layout 级常驻组件，SPA 路由切换不会重建，故只需绑定一次；
 *  - enhanceApp 在 app mount 前调用，此时 .VPNavBar 尚未渲染，
 *    用 requestAnimationFrame 轮询直到它挂载后再绑定滚动监听；
 *  - 轮询有重试上限（SETUP_RETRIES 帧，约 1s），找不到则静默放弃，避免死循环；
 *  - 保留并调用原始 enhanceApp，避免覆盖默认主题的增强逻辑；
 *  - 自定义 Layout（呼吸进度条 / 光标粒子 / 情境 emoji）
 *    通过 layouts/Layout.vue 的官方插槽注入；首页 Banner / 内容导览
 *    由 docs/index.md 直接编排组件。
 */
const NAV_THRESHOLD = 80
const SETUP_RETRIES = 60 // 60 帧 ≈ 1s 超时

// ===== v-reveal：滚动进入视口时逐项 fade-up =====
// 用法：v-reveal 或 v-reveal="i"（i 为错峰下标，每项 +REVEAL_STAGGER ms）
// 注意：不用 transition 终态方案——reveal 过渡完成后移除两个 class，
// 把 transition 属性还给元素自身（如文章卡 hover 抬升），避免互相覆盖。
const REVEAL_STAGGER = 70
const REVEAL_DURATION = 700 // 需 ≥ custom.css 中 transition 时长 + 最大错峰

const revealTimers = new WeakMap<HTMLElement, { io?: IntersectionObserver; tid?: number }>()

const revealDirective = {
  // SSR 渲染为空操作：隐藏态完全由客户端 mounted 时加 class 实现，避免 SSR 报错
  getSSRProps: () => ({}),
  mounted(el: HTMLElement, binding: { value?: unknown }) {
    const idx = typeof binding.value === 'number' ? binding.value : 0
    const delay = Math.min(Math.max(idx, 0), 10) * REVEAL_STAGGER

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    el.classList.add('reveal-init')
    el.style.setProperty('--reveal-delay', `${delay}ms`)

    const state: { io?: IntersectionObserver; tid?: number } = {}
    revealTimers.set(el, state)

    state.io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        state.io?.disconnect()
        el.classList.add('reveal-in')
        // 过渡结束后移除 class，恢复元素自身的 transition 定义
        state.tid = window.setTimeout(() => {
          el.classList.remove('reveal-init', 'reveal-in')
          el.style.removeProperty('--reveal-delay')
        }, delay + REVEAL_DURATION)
      },
      { threshold: 0.15, rootMargin: '0px 0px -24px' },
    )
    state.io.observe(el)
  },
  unmounted(el: HTMLElement) {
    const state = revealTimers.get(el)
    state?.io?.disconnect()
    if (state?.tid) window.clearTimeout(state.tid)
    revealTimers.delete(el)
  },
}

export default {
  ...DefaultTheme,
  Layout,
  async enhanceApp(ctx: EnhanceAppContext) {
    await originalEnhanceApp?.(ctx)
    // 指令注册需在 SSR 也可达，SSR 阶段经 getSSRProps 退化为无属性输出
    ctx.app.directive('reveal', revealDirective)
    if (typeof window === 'undefined') return

    let tries = 0
    const trySetup = () => {
      const nav = document.querySelector<HTMLElement>('.VPNavBar')
      if (!nav) {
        if (++tries < SETUP_RETRIES) {
          requestAnimationFrame(trySetup)
        }
        return
      }
      const update = () => {
        const p = Math.min(1, window.scrollY / NAV_THRESHOLD)
        nav.style.setProperty('--nav-p', p.toFixed(3))
      }
      update()
      window.addEventListener('scroll', update, { passive: true })
    }
    requestAnimationFrame(trySetup)
  },
}
