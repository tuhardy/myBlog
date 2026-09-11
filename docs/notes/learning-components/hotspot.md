---
title: LearningHotspot · 图标注解
date: 2026-09-12
tags: [VitePress, 组件库]
description: LearningHotspot 组件参考：在图或示意图上放可点标记点，点开看局部注解。
---

<script setup>
import { LearningHotspot } from '../../../config/.vitepress/theme/components/learning'

const chainSpots = [
  { x: 1.5, y: 8, w: 22, h: 84, title: '客户端', content: '发起方：浏览器、App 或上游服务。先确认慢不在这一段——网络与渲染不归 SQL 管。' },
  { x: 26.5, y: 8, w: 22, h: 84, title: 'Nginx / 网关', content: '反向代理与限流层。连接数打满或 upstream 超时，会把 502/504 推到用户面前。' },
  { x: 51.5, y: 8, w: 22, h: 84, title: '应用服务', content: '业务代码在这里发 SQL。连接池耗尽时，「等连接」会被误报成「SQL 慢」。' },
  { x: 76.5, y: 8, w: 22, h: 84, title: 'MySQL', content: '链路的最后一站。确认前面几跳都正常后，才轮到慢日志和 EXPLAIN 登场。' },
]
</script>

# LearningHotspot · 图标注解

**何时用**：教学内容是一张图/示意图，需要对局部位置逐一解释——架构图、B+ 树结构、请求链路。标记点用百分比坐标钉在图上，读者点开看注解，比长段文字对照图位置更直观。

**演示**：一条请求的链路（点击区域，整块变色并显示注解）：

<ClientOnly>
  <LearningHotspot id="demo-request-chain" label="请求链路注解" :spots="chainSpots">
    <div class="demo-chain">
      <div class="demo-chain__cell"><span>客户端</span><em>→</em></div>
      <div class="demo-chain__cell"><span>Nginx</span><em>→</em></div>
      <div class="demo-chain__cell"><span>应用服务</span><em>→</em></div>
      <div class="demo-chain__cell"><span>MySQL</span></div>
    </div>
  </LearningHotspot>
</ClientOnly>

<style>
.demo-chain { display: grid; grid-template-columns: repeat(4, 1fr); min-width: 480px; padding: 16px 8px; border: 1px dashed var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg); }
.demo-chain__cell { display: flex; align-items: center; justify-content: center; gap: 10px; }
.demo-chain__cell span { padding: 10px 14px; border: 1px solid var(--vp-c-divider); border-radius: 8px; font-size: 13px; white-space: nowrap; }
.demo-chain__cell em { color: var(--vp-c-text-3); font-style: normal; }
</style>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 页内唯一 |
| label | string | 是 | 组件可访问名称 |
| spots | `{ x, y, w, h, title, content }[]` | 是 | 可点区域；x/y/w/h 为图上百分比（0–100），即区域的左/上偏移与宽高 |
| image | string | 否 | 图片地址；不传时用默认插槽放任意 HTML/SVG 图形 |
| alt | string | 否 | 图片替代文本，缺省回退为 label |

**调用**：

```vue
<LearningHotspot id="my-hotspot" label="链路注解" :spots="spots">
  <img src="/arch.svg" alt="架构图">
</LearningHotspot>
```

**边界**：内部管理激活项，无 v-model；再次点击同一区域或按 Esc 收起注解，根节点 `data-active` 暴露当前下标（-1 为无选中）。注解统一显示在图下面板，不在区域上做浮层——窄屏不溢出、定位不裁剪。区域闲置时是淡虚线框（提示可点），激活时整块填色；坐标按内容实际布局手调，区域应恰好框住目标（本演示框住整列单元格，含箭头）。图比视口宽时组件内部横向滚动（区域随内容一起滚动），建议给插槽内容设 `min-width` 防挤压。仅传图片时也可直接用 `image` + `alt` 省略插槽。
