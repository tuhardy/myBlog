import DefaultTheme from 'vitepress/theme'
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
 *  - 保留并调用原始 enhanceApp，避免覆盖默认主题的增强逻辑；
 *  - 自定义 Layout（呼吸进度条 / 光标粒子 / 特性画廊 / 情境 emoji）
 *    通过 layouts/Layout.vue 的官方插槽注入，导航与侧边栏结构零改动。
 */
const NAV_THRESHOLD = 80

export default {
  ...DefaultTheme,
  Layout,
  async enhanceApp(ctx: any) {
    await originalEnhanceApp?.(ctx)
    if (typeof window === 'undefined') return

    const trySetup = () => {
      const nav = document.querySelector<HTMLElement>('.VPNavBar')
      if (!nav) {
        // 导航栏尚未渲染，下一帧再试
        requestAnimationFrame(trySetup)
        return
      }
      const update = () => {
        // scrollY 在 0~80px 之间线性映射到 0~1，超出则钳制为 1
        const p = Math.min(1, window.scrollY / NAV_THRESHOLD)
        nav.style.setProperty('--nav-p', p.toFixed(3))
      }
      update()
      window.addEventListener('scroll', update, { passive: true })
    }
    requestAnimationFrame(trySetup)
  },
}
