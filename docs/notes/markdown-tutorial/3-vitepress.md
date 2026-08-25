---
title: "第 3 章 · VitePress 专属增强特性（立即提升博客质感）"
description: "Frontmatter、自定义容器、代码行高亮/diff、Badge、Tabs 选项卡、导入代码片段、页内锚点、团队卡片、首页 features 定制。"
category: "笔记"
layout: doc
outline: deep
---

# 第 3 章 · VitePress 专属增强特性

> 这一章的所有特性，**只有在 VitePress（以及用了同款扩展的 Markdown 引擎）里才生效**。写在普通 GitHub README 里可能不显示或显示不一样——但在你当前这个 VitePress 博客里，它们就是你甩开别人博客的关键。

---

## 1. Frontmatter（每篇文章开头的 YAML 头信息）

写在 md 文件第一行，用一对 `---` 包裹。**它不会出现在正文里**，而是告诉 VitePress "这篇文章叫什么、描述、分类、侧边栏怎么展示…"。

**基础三件套（建议每篇都写）**：

```md
---
title: "一篇关于 Vue3 的性能优化文章"
description: "从 runtime-core 源码分析 Vue3 diff 算法的三个优化点"
category: "前端"
---

# 一篇关于 Vue3 的性能优化文章
```

> 💡 为什么还要在正文里写一次 `# 标题`？因为 VitePress 默认会用 Frontmatter `title` 作为 `<title>` 标签（浏览器标签页 + SEO），但**文章正文的 H1 还是你自己写的那句 `# 标题`**，建议保持一致。

**常用字段速查表**：

| 字段 | 值 | 作用 |
|---|---|---|
| `title` | 字符串 | `<title>` + `<meta name="title">` + 侧边栏默认显示名 |
| `description` | 字符串 | `<meta name="description">`，搜索引擎搜索结果里的灰色小字 |
| `category` | 字符串 | 自定义字段，VitePress 不直接用，但你自己做文章列表页/归档页时读它做分类筛选 |
| `tags` | `[ 'Vue', '性能' ]` | 自定义字段，同上，做标签云用 |
| `date` | `2026-08-25` | 自定义字段，按日期归档 |
| `layout` | `doc / page / home` | `doc` 默认文档页（带侧栏）；`page` 全空白页自己画；`home` 是首页模板 |
| `outline` | `deep` / `[2, 3]` / `false` | 右侧目录深度：`deep` = h2~h4 全展开；`false` = 隐藏右侧目录 |
| `lastUpdated` | `false` / 时间戳 | 覆盖默认 "最后更新时间" 的显示，`false` 就是这篇文章不显示 |
| `prev` / `next` | `false` / 链接 | 手动覆盖底部「上一篇 / 下一篇」跳转，设 `false` 隐藏 |
| `editLink` | `false` | 单篇关掉 "Edit this page" 链接（全局开但某篇不想给人改时用）|

**🎨 真实博客稿推荐模板**：

```md
---
title: "VitePress 博客搭建全流程"
description: "从 npm create vitepress 到部署 GitHub Pages 的完整踩坑记录，含 Home/Features 改造、导航栏与侧边栏规划。"
category: "前端"
tags: [ "VitePress", "博客", "部署" ]
outline: deep
---

# VitePress 博客搭建全流程
```

---

## 2. 自定义容器（Tip / Warning / Danger / Details）

这是 **VitePress + GitHub GFM 风格**最有辨识度的组件，比你自己写 `<div style="...">` 美观得多。

语法：`::: 类型名 自定义标题` 开头，`:::` 结尾。

### 2.1 四种类型一览

```md
::: tip
我是 tip，用来放**小贴士、正向提醒**、快捷方式、快捷键。
颜色是绿色背景 + 左边条。
:::

::: info 我是自定义标题：什么是 VitePress？
VitePress 是基于 Vite + Vue3 构建的**静态站点生成器**，专为技术文档设计，但你也完全可以用它写个人博客。
:::

::: warning ⚠️ 部署前一定检查
1. 本地 `npm run docs:build` 跑过了吗？
2. 图片路径是不是都从 `/public/` 下正确引用？
3. `base` 路径是不是和仓库名一致（比如 `/myBlog/`）？
:::

::: danger 生产必看：别踩这三个雷
1. ❌ 不要把 `.env` 文件推到 Git
2. ❌ 不要用 `innerHTML` 渲染用户输入
3. ❌ 不要在 URL 里存明文密码
:::

::: details 👉 点击展开：这章要学的知识点
- Frontmatter 字段
- 自定义容器
- 代码块高级（行高亮 / diff / 行号）
- Badge
- Tabs 选项卡
- `<<< @/...` 代码导入
- Team 成员页
:::
```

**效果预览（你现在看到的正是这个容器渲染出来的）**：

::: tip
我是 tip，用来放**小贴士、正向提醒**、快捷方式、快捷键。
颜色是绿色背景 + 左边条。
:::

::: info 我是自定义标题：什么是 VitePress？
VitePress 是基于 Vite + Vue3 构建的**静态站点生成器**，专为技术文档设计，但你也完全可以用它写个人博客。
:::

::: warning ⚠️ 部署前一定检查
1. 本地 `npm run docs:build` 跑过了吗？
2. 图片路径是不是都从 `/public/` 下正确引用？
3. `base` 路径是不是和仓库名一致（比如 `/myBlog/`）？
:::

::: danger 生产必看：别踩这三个雷
1. ❌ 不要把 `.env` 文件推到 Git
2. ❌ 不要用 `innerHTML` 渲染用户输入
3. ❌ 不要在 URL 里存明文密码
:::

::: details 👉 点击展开：这章要学的知识点
- Frontmatter 字段
- 自定义容器
- 代码块高级（行高亮 / diff / 行号）
- Badge
- Tabs 选项卡
- `<<< @/...` 代码导入
- Team 成员页
:::

### 2.2 🧨 容器 + 代码块 · 一个「常见踩坑教程」的完整排版

````md
::: danger 常见坑：VitePress dev 正常，build 后图片 404

**症状**：`npm run docs:dev` 图片正常显示，GitHub Pages 部署后全是破图叉叉。

**原因 90% 概率**：`config.mts` 里的 `base` 没和 GitHub 仓库名对齐。

```ts
// ❌ 错误
export default defineConfig({
  base: '/',   // 你的博客是 https://tuhardy.github.io/myBlog/，不是根路径
})

// ✅ 正确
export default defineConfig({
  base: '/myBlog/',   // 必须和 repository name 保持一致，前后斜杠都不能丢
})
```

**验证**：改完后跑一次 `npm run docs:build`，打开生成的 `dist/index.html`，看看里面的 `<link rel="icon">` 是不是 `/myBlog/favicon.ico` 即可。
:::
````

> 参考经验 1127152：容器语法里 `:::` 和**类型名后面必须有一个空格**再写标题，不要写 `:::danger` 连在一起（markdown-it-container 的解析规则），也不要把结束的 `:::` 省掉——少一个就会把下面所有内容吞进容器里。

---

## 3. 代码块 · 高级玩法

### 3.1 行高亮 `{ 行号 }`

三反引号+语言名后面写一个大括号，数字就是要高亮的行，支持逗号分隔和区间 `-`。

输入：
````md
```ts{2,8-10}
interface User {
  id: number
  name: string
  email: string
}

async function getUser(id: number): Promise<User> {
  const res = await fetch(`/api/user/${id}`)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return await res.json()
}
```
````

输出：
```ts{2,8-10}
interface User {
  id: number
  name: string
  email: string
}

async function getUser(id: number): Promise<User> {
  const res = await fetch(`/api/user/${id}`)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return await res.json()
}
```

> 💡 写"代码前后对比"时，用行号把「改的那几行」标出来，读者一眼就懂你做了什么。

### 3.2 diff 代码块（新增/删除行）

语言名写 `diff`，新增行前面加 `+`，删除行加 `-`，不改的行用空格开头（非常重要！少了空格识别不出 diff 块）。

````md
```diff
 // 从用户数组里找第一个 ID = 5 的
 const users = [/* 数据 */]
-const u = users.filter(x => x.id === 5)[0]
+const u = users.find(x => x.id === 5)
 // 原因：filter 会遍历整个数组，找到第一个后不会提前停止；find 找到即停。
```
````

```diff
 // 从用户数组里找第一个 ID = 5 的
 const users = [/* 数据 */]
-const u = users.filter(x => x.id === 5)[0]
+const u = users.find(x => x.id === 5)
 // 原因：filter 会遍历整个数组，找到第一个后不会提前停止；find 找到即停。
```

### 3.3 聚焦特定行：`// [!code focus]` 等魔法注释

在代码某一行的**同一条行末 / 下一行**写 VitePress 魔法注释（用单行注释）：

| 注释 | 效果 |
|---|---|
| `// [!code focus]` | 把这一行强聚焦（其他行变暗）|
| `// [!code highlight]` | 同 `{n}` 行高亮，适合用在难以数行号的情况 |
| `// [!code --]` / `// [!code ++]` | 等价于 diff 的删除 / 新增色 |
| `// [!code warning]` / `// [!code error]` | 黄色警告 / 红色错误底色 |

输入：
````md
```js
function calcTotal(items) {
  let t = 0
  for (const i of items) t += i.price
  return t  // [!code warning]
}
// ⚠️ 上面一行的问题：items 为空时返回 0 没问题，但
// price 为 undefined / string 时会变成 NaN，要加校验。
```
````

```js
function calcTotal(items) {
  let t = 0
  for (const i of items) t += i.price
  return t  // [!code warning]
}
// ⚠️ 上面一行的问题：items 为空时返回 0 没问题，但
// price 为 undefined / string 时会变成 NaN，要加校验。
```

### 3.4 显示行号

全局开启：在 `config.mts` 的 `themeConfig` 加 `code: { lineNumbers: true }`。想单篇临时关掉，在代码块语言后面加 `-no-line-numbers`：

````md
```ts-no-line-numbers
// 这段代码没有行号
console.log('hi')
```
````

---

## 4. Badge 徽章

`<Badge type="类型" text="文字" />`，可以当行内小标签用，出现在标题后面、列表项右边、表格里都行。

**4 种 type**：

- 普通标题后挂版本号：`# VitePress 博客 <Badge type="info" text="v2.0 alpha" />` →  # VitePress 博客 <Badge type="info" text="v2.0 alpha" />
- 稳定接口：`<Badge type="tip" text="STABLE" />` → <Badge type="tip" text="STABLE" />
- 实验性功能：`<Badge type="warning" text="EXPERIMENTAL" />` → <Badge type="warning" text="EXPERIMENTAL" />
- 即将废弃：`<Badge type="danger" text="DEPRECATED" />` → <Badge type="danger" text="DEPRECATED" />

**📎 博客里常见用法**：

```md
## 发布日志

- **[v2.3.0]** 新增 AI 写作助手 <Badge type="info" text="new" />
- **[v2.2.0]** 支持评论系统 <Badge type="tip" text="stable" />
- **[v2.1.0]** 老版文章路由 `/old/*` 可用 <Badge type="warning" text="兼容到 2026-12" />
- **[v2.0.0]** `vitepress build` 命令 <Badge type="danger" text="已移除，用 vitepress build config" />
```

> 也支持 `custom` 和自定义 class 配 CSS，不过 90% 场景用上面 4 种就够了。

---

## 5. Tabs 选项卡（同一件事的多种实现对比神器）

场景：**同一个需求用 Vue / React 两种写法**、**Windows / macOS 命令不一样**、**npm / pnpm / yarn 命令对照**、**TS / JS 代码示例对照**……再也不用上下滚着找了。

### 5.1 最基础用法

````md
::: code-group

```bash [npm]
npm install lodash-es
npm run dev
```

```bash [pnpm]
pnpm add lodash-es
pnpm dev
```

```bash [yarn]
yarn add lodash-es
yarn dev
```

:::
````

渲染出来就是一排 `npm / pnpm / yarn` 的选项卡，点哪个就切换到哪份命令，非常实用。

### 5.2 升级 · 多语言代码对照表（Vue vs React 写一个计数器）

````md
::: code-group

```vue [Vue 3 (SFC)]
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">
    点了 {{ count }} 下
  </button>
</template>
```

```jsx [React (Function)]
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(c => c + 1)}>
      点了 {count} 下
    </button>
  )
}
```

:::
````

> 💡 `code-group` 里面的每一块，` ``` 语言 [显示名] ` 的显示名就是 Tab 的标题，想写 emoji 加 emoji 完全没问题。

---

## 6. `<<<` 导入代码片段

如果你有一段**真实项目里的代码**想展示，**不要复制粘贴**（一旦代码改了文档会过时）。直接从文件导入：

### 6.1 整个文件

```md
<<< @/../snippets/hello.js
```

> `@/` 在 VitePress 里代表 `srcDir`（也就是 `docs/` 目录）。上面示例假定你把代码放在 `docs/../snippets/hello.js` 即项目根 `snippets/hello.js`。

### 6.2 只导入某几行 + 指定语言高亮

```md
<<< @/../snippets/hello.js{5-12 js}
```

效果：只显示 `hello.js` 的 5~12 行，按 JS 语法高亮。比复制粘贴有一个不可替代的优势：

> **源文件改了，文档里的示例自动同步。**

---

## 7. 团队 / 成员卡片页（Team Pages）

如果你想写一个「关于我 & 朋友们」或「贡献者名单」的页面，VitePress 内置了 `<VPTeamMembers>` 组件，不用自己写 Flex 布局。

**使用步骤**：

1. 新建一个 Vue 组件（比如 `.vitepress/theme/components/TeamPage.vue`），在里面 import 组件 + 写成员数据
2. 新建一个 md 页（比如 `docs/about.md`），`layout: page`（不带侧栏），然后 `<script setup>import TeamPage from './TeamPage.vue'</script><TeamPage />`

直接看**可复制的示例代码**（你可以新建这两个文件体验）：

```vue
<!-- docs/.vitepress/theme/components/TeamPage.vue -->
<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const members = [
  {
    avatar: 'https://www.github.com/tuhardy.png',
    name: 'Tuhardy',
    title: '博客作者',
    links: [
      { icon: 'github', link: 'https://github.com/tuhardy/myBlog' },
      { icon: 'twitter', link: 'https://twitter.com/your-handle' },
    ],
  },
  {
    avatar: '/avatar.jpg',
    name: '我的头像',
    title: '示例成员 · 爱打羽毛球',
    org: '示例组织',
    links: [
      { icon: 'github', link: 'https://github.com/' },
    ],
  },
]
</script>

<template>
  <div style="max-width: 1000px; margin: 0 auto; padding: 40px 24px;">
    <h1 style="text-align:center;">关于我 & 贡献者</h1>
    <p style="text-align:center; color: var(--vp-c-text-2);">
      感谢每一位让这个博客变得更好的朋友 ❤️
    </p>
    <VPTeamMembers size="medium" :members="members" />
  </div>
</template>
```

---

## 8. ✨ 其他容易忽视的小功能（一页速查）

| 功能 | 语法 / 配置 | 效果 |
|---|---|---|
| 自定义导航高亮 | Frontmatter 里写 `navbar: false` | 这篇文章把顶部导航栏隐藏（适合首页全屏封面）|
| 自定义上/下篇链接 | `prev: '/frontend/vue-basics'` `next: false` | 手动指定底部「上一篇 / 下一篇」或隐藏 |
| 自定义 Edit 链接 | `themeConfig.editLink: { pattern: 'https://github.com/xxx/xxx/edit/main/docs/:path' }` | 每篇文章右上角出现「Edit this page」跳 GitHub 编辑页 |
| 最后更新时间 | `themeConfig.lastUpdated: true` | 每篇底部显示最后修改时间（需要本地 Git 日志）|
| 搜索框 | 默认内置；想更强的可以装 `@vuepress/plugin-search` 或 Algolia DocSearch | 搜标题+正文 |
| 静态资源 | 放 `docs/public/xxx`，md 里写 `/xxx` | 构建后自动正确处理 base 前缀 |
| `<Badge>` 颜色自定义 | 写 CSS：`.VPBadge[data-v-xxx][type="info"] { ... }` | 改自己博客的徽章配色 |

---

## 9. 🎓 实战作业：把「第 1 章首页 /features 卡片」改成跳对应分类

现在回到你这个项目，把博客首页的 4 张 features 卡片跳转到真实的分类。

**任务**：打开 [docs/index.md](file:///c:/Users/Administrator/Desktop/report-web/docs/index.md)，把这 4 张卡的 `link` 填正确：

```yaml
features:
  - icon: 🛠️
    title: 技术笔记
    details: 前端、工程化、工具与踩坑记录
    link: /frontend/            # ← 改成指向任意一个分类目录（如前端）
  - icon: 💡
    title: 思考随笔
    details: 学习方法、职业成长与读书摘记
    link: /notes/               # ← 笔记
  - icon: 🚀
    title: 项目作品
    details: 个人项目与开源贡献展示
    link: /backend/             # ← 这里放后端（作为示例，你也可以新开 projects 分类）
  - icon: 📮
    title: 关于本站
    details: 站点说明、订阅与联系方式
    link: /design-mode/         # ← 示例跳转，之后可以写一个真正的 /about.md
```

> 🧠 思考题：现在导航栏已经能进每个分类了，features 卡片就像一个「分类入口快捷方式」，放最合适的 4 个让读者立刻点进去就行。如果以后你真的写了"关于本站"独立页面，记得把第 4 张卡片 link 改过去。

---

## 🎉 到此为止，你已经毕业了！

把 **1、2、3 章** 所有示例各挑一个组合起来，写一篇带：
- Frontmatter
- 标题/列表/表格/代码
- 一个 Mermaid 流程图
- 一组 `tip/warning/danger/details` 容器
- 一组 `code-group` Tabs

的真实技术博客，发布出去——**这就是你的博客从 0 到 1 真正诞生的那一刻 ✅。**
