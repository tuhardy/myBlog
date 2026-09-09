---
title: 从零实现可复用的纯前端算法沙盒：VitePress、Web Worker 与 SES
date: 2026-09-10
category: 前端
tags: [前端, VitePress, Web Worker, SES, 工程实践]
description: 从静态博客的运行按钮出发，复盘 CodeMirror、Worker 与 SES 的技术取舍、执行边界、配置化判题、真实问题及后续优化。
layout: doc
---

<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { AlgorithmSandbox } from '../../config/.vitepress/theme/components/sandbox'
import architectureDiagram from './assets/algorithm-sandbox-architecture.svg?no-inline'
import architectureMobile from './assets/algorithm-sandbox-architecture-mobile.svg?no-inline'
import executionDiagram from './assets/algorithm-sandbox-execution.svg?no-inline'
import executionMobile from './assets/algorithm-sandbox-execution-mobile.svg?no-inline'

const diagrams = {
  architecture: {
    title: '算法沙盒 · 执行架构',
    wide: architectureDiagram,
    compact: architectureMobile,
    width: 720,
    height: 590,
    compactHeight: 674,
    description: '主线程、Worker 宿主与 SES 隔离区的完整关系。',
  },
  execution: {
    title: '算法沙盒 · 运行时序',
    wide: executionDiagram,
    compact: executionMobile,
    width: 720,
    height: 724,
    compactHeight: 710,
    description: '主线程、Worker 与隔离环境之间的启动、逐例执行和收尾顺序。',
  },
}
const activeDiagram = ref(diagrams.architecture)
const diagramViewer = ref(null)
let viewerTrigger = null

async function openDiagram(event, id) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  viewerTrigger = event.currentTarget
  activeDiagram.value = diagrams[id]
  await nextTick()
  diagramViewer.value?.showModal()
}

function restoreViewerFocus() {
  if (viewerTrigger?.isConnected) viewerTrigger.focus()
  viewerTrigger = null
}

function closeOnBackdrop(event) {
  if (event.target === event.currentTarget) diagramViewer.value?.close()
}

onBeforeUnmount(() => diagramViewer.value?.close())
</script>

# 从零实现可复用的纯前端算法沙盒

在博客里给代码块加一个“运行”按钮，最难的是什么？不是按钮，也不是语法高亮。读者把循环条件改错后，页面还能不能响应？返回一个巨大的对象时，结果区会不会拖垮界面？写第二道题时，是否又要复制一整套执行器？

> **阅读前提与环境**：你已了解 JavaScript、Vue 组件和基本前端构建。本篇是现有 VitePress 项目的工程复盘，不是通用恶意代码执行方案。线上判题在浏览器完成；Node.js 用于构建与开发测试，不提供线上执行后端。文中的终端命令在仓库根目录的 Windows PowerShell 执行。只运行你理解的教学代码，不输入秘密或不明来源程序。

可以把这套系统看成一间教学实验室：

> - 操作台 → Vue 与 CodeMirror：接收代码，展示状态。
> - 独立实验间 → Web Worker：承担计算，可以从外部终止。
> - 发放工具的规则 → SES Compartment：只给用户程序必要能力。
> - 验收清单 → 题库与判题器：定义输入、有效答案和反馈。

比喻有边界：实验间不是操作系统级的安全容器，工具规则也不能阻止程序消耗大量内存。设计的重点是**分清职责与限制，而不是把“能运行”包装成“绝对安全”**。

## 一、先体验成品，再讨论架构

下面直接复用本站的 `AlgorithmSandbox`，不是截图或另一份演示实现。保持初始代码，点击运行，预期两数之和的 5 个固定用例全部通过。

<ClientOnly>
  <AlgorithmSandbox id="frontend-algorithm-sandbox-demo" puzzle-id="two-sum" />
</ClientOnly>

做两次小实验：将 `return [i, j]` 改为 `return [j, i]`，观察它仍可通过；再改成 `return [i, i]`，观察答案错误。前者说明返回顺序不限，后者说明验收检查的是两个不同位置，而不只是数字之和。每次实验后重置，避免混淆改动。

同一个组件也用于[两数之和教程](../algorithm/two-sum)和[二分查找教程](../algorithm/binary-search)。前者返回数组，后者返回单个下标或 `-1`。二分查找的 7 个用例覆盖首尾命中、目标不存在、空数组和单元素，证明复用不只是换一个标题。

这份成品支持代码编辑、运行、停止、重置、逐例结果、受限日志和耗时。它不自动运行、不保存草稿，也不支持 Node.js、npm、用户代码的网络或文件系统访问、真实 Linux 和多语言编译。完整使用限制见[算法总览](../algorithm/)。

## 二、先限定问题：纯前端不等于不用 Node.js

项目部署在 GitHub Pages，站点前缀为 `/myBlog/`。目标是让读者在文章中验证一个同步函数，不是建设在线 IDE 或考试平台。因此没有引入服务端队列、远程编译 API、账户或执行服务密钥。

需要区分三个阶段：

| 阶段 | 运行位置 | 负责什么 |
| --- | --- | --- |
| 构建 | 本地或 CI 的 Node.js | VitePress 预渲染 Markdown/Vue，打包静态资源 |
| 阅读与判题 | 读者浏览器 | 主线程呈现文章；Worker 内执行 JavaScript |
| 自动化验证 | 开发环境的 Node.js 与 Edge | 检查纯逻辑、Worker 模块和真实浏览器交互 |

VitePress 使用 Vue SSR 能力在**构建期**生成 HTML，并不要求部署后维持一个 Node 服务。执行器源码使用 TypeScript，也不代表支持读者输入 TypeScript：Vite 会处理项目里的 `.ts` 文件，但编辑器中的字符串不会经过这条转译链。

首期契约因此收敛为：按题目约定调用同步函数，传入 JSON 参数，接收有界 JSON 答案。公开固定用例适合帮助理解，但读者可以针对用例写死答案；全过既不是一般正确性证明，也不是反作弊机制。

## 三、技术选型：分别解决编辑、计算与能力限制

### 编辑器为什么选 CodeMirror 6

`textarea` 足以输入文本，却缺少代码高亮、行号和完善的编辑体验。Monaco 功能更接近完整 IDE，但当前没有多文件工程、语言服务或复杂调试需求。选择 CodeMirror 6，是为了使用模块化的代码编辑能力，不为一个函数练习引入整套 IDE。

本次实际加入的直接依赖如下，版本是实现时的项目记录，不是“永远使用这些版本”的安装建议。

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| `codemirror` | `6.0.2` | EditorView、基础编辑配置 |
| `@codemirror/lang-javascript` | `6.2.5` | JavaScript 语法支持 |
| `@codemirror/language` | `6.12.4` | 通过公开高亮 API 适配明暗配色 |
| `ses` | `2.3.0` | Worker 内的能力隔离 |

没有引入 Vue 编辑器包装库。项目使用 VitePress `2.0.0-alpha.19`、Vite `8.2.1` 和 Vue `3.5.41`。选型没有进行 Monaco、SES 与其他运行时的统一性能基准，因此不能据此声称具体快了多少或节省了多少流量。

### 为什么有 Worker 还需要 SES

把代码直接放在主线程执行，一次死循环就可能阻塞页面。Worker 把计算移到另一条执行线程，主线程可以保留停止按钮和计时器。

但**Worker 不是没有能力的环境**。它不能操作页面 DOM，却仍有网络、存储等宿主 API。仅覆盖 `fetch` 或检查源码里有没有几个关键字，不能建立可靠的能力边界。

因此运行链是“专用 Worker + SES”，而不是“裸 Worker + 宿主 Function”。SES 的 `lockdown()` 固化共享内建对象，每个 `Compartment` 提供独立的全局环境；只将受控能力交给用户程序。不提供模块加载钩子、宿主网络对象或存储对象，保留默认拒绝路径，不开启绕过选项。

QuickJS/WASM 可作为未来需要更强运行时资源控制时的候选；本次没有实现或实测它。Python、远程多语言编译也不是给编辑器加一个下拉框就能完成的功能。

## 四、整体架构：UI、执行器与题目相互分离

<figure class="sandbox-diagram architecture-diagram">
  <a :href="architectureDiagram" target="_blank" rel="noopener noreferrer" aria-haspopup="dialog" data-diagram="architecture" @click="openDiagram($event, 'architecture')">
    <span class="architecture-picture">
      <img class="architecture-wide" :src="architectureDiagram" width="720" height="590" alt="架构图：主线程与 Worker 宿主分区，通过请求、结果和终止控制交互；SES 内运行用户函数，宿主负责快照和判题。" />
      <img class="architecture-compact" :src="architectureMobile" width="320" height="674" alt="架构图窄屏版：主线程与 Worker 双向通信；Worker 内依次为 SES 隔离环境、有界 JSON 快照与可信判题器。" />
    </span>
  </a>
  <figcaption>点击放大查看 · 窄屏自动使用独立排版</figcaption>
</figure>

<dialog ref="diagramViewer" class="architecture-viewer" aria-labelledby="architecture-viewer-title" @click="closeOnBackdrop" @close="restoreViewerFocus">
  <header class="architecture-viewer__header">
    <div><h2 id="architecture-viewer-title">{{ activeDiagram.title }}</h2><p>适应窗口显示 · 按 Esc 可关闭</p></div>
    <button type="button" autofocus @click="diagramViewer.close()">关闭</button>
  </header>
  <div class="architecture-viewer__content">
    <span class="architecture-picture">
      <img class="architecture-wide" :src="activeDiagram.wide" :width="activeDiagram.width" :height="activeDiagram.height" :alt="activeDiagram.description" />
      <img class="architecture-compact" :src="activeDiagram.compact" width="320" :height="activeDiagram.compactHeight" :alt="activeDiagram.description + '（窄屏版）'" />
    </span>
  </div>
</dialog>

图只保留主要职责与数据流，按正文宽度完整展示，不需要横向拖动。题库在主线程与 Worker 中各自加载，不是跨线程共享同一个对象；详细分工见下表。

| 模块 | 职责 | 不负责什么 |
| --- | --- | --- |
| Markdown 页面 | 题意、讲解、组件调用 | 不实现执行循环 |
| `AlgorithmSandbox.vue` | 编辑器、状态、消息校验、计时与终止 | 不执行用户函数 |
| `algorithm-puzzles.ts` | 注册入口、参数、用例及提示，校验并冻结数据 | 不混入页面事件 |
| `algorithm-runner.worker.ts` | 初始化 SES、逐例调用、组织结果 | 不处理页面布局 |
| `sandbox-output.ts` | 有界展示文本与纯 JSON 快照 | 不决定题意是否成立 |
| `algorithm-judges.ts` | 按策略检查快照与可信用例 | 不接收用户提供的判题代码 |
| `sandbox-types.ts` | 类型、消息契约和命名限额 | 不替代运行时校验 |

两数之和的数据结构属于题目，不应该成为整个执行器的输入模型。将它们拆开后，UI 只需知道“参数叫什么、期望如何解释”；执行器只需知道“调用哪个同步入口、使用哪个可信策略”。这比为每道题复制一个 Vue 组件更容易维护，也没有必要提前建立复杂插件平台。

## 五、重要逻辑：一次运行如何被约束

以下代码是关键路径的节选，依赖其所在函数和模块上下文，不能单独复制成通用安全执行器。完整实现以文末固定版本源码为准。

### 1. ClientOnly 与客户端动态导入是两道不同的检查

页面通过公共索引导入组件，并使用 `<ClientOnly>` 包裹。正文仍可预渲染；编辑器在 `onMounted` 后加载。

组件挂载回调中的关键片段是：

```ts
const [codeMirror, javascript, language] = await Promise.all([
  import('codemirror'),
  import('@codemirror/lang-javascript'),
  import('@codemirror/language'),
])
if (!mounted || token !== editorToken) return
```

外层 `ClientOnly` 不会自动消除所有导入副作用，所以依赖加载也要延后。异步完成后再检查挂载状态和令牌，是为了防止读者已经离开文章，迟到的模块却继续创建编辑器。加载失败时保留普通文本框和源码；卸载时销毁视图，而不是只让 DOM 消失。

### 2. Worker 地址交给 Vite 处理

Worker 在运行事件中创建，不在模块顶层创建：

```ts
const worker = new Worker(
  new URL('./algorithm-runner.worker.ts', import.meta.url),
  { type: 'module' },
)
```

`new URL` 直接位于 `new Worker` 中，路径与选项可静态分析，Vite 才能识别并打包 Worker。不要手写 `/assets/runner.js`，也不要把 `/myBlog/` 到处重复拼接。预览验证必须带部署前缀，首页能打开并不证明 Worker 地址正确。

### 3. ready 握手、运行编号与外部终止

<figure class="sandbox-diagram architecture-diagram">
  <a :href="executionDiagram" target="_blank" rel="noopener noreferrer" aria-haspopup="dialog" data-diagram="execution" @click="openDiagram($event, 'execution')">
    <span class="architecture-picture">
      <img class="architecture-wide" :src="executionDiagram" width="720" height="724" alt="时序图：主线程等待 Worker 就绪，再逐例隔离执行与判题；最终收到 done 后清理并终止 Worker。" />
      <img class="architecture-compact" :src="executionMobile" width="320" height="710" alt="运行时序窄屏版：启动等待、逐例处理、清理收尾；3 秒预算属于整轮运行。" />
    </span>
  </a>
  <figcaption>点击放大查看 · 窄屏按启动、执行、收尾分段阅读</figcaption>
</figure>

这是顺序示意，不按真实耗时比例绘制。创建 Worker 后先等待 `ready`，收到后才发送请求并开始整轮执行计时。请求只有运行编号、题目 ID 和源码，不接受页面临时提供的期望答案或判题器。

```ts
export interface RunRequest {
  type: 'run'
  requestId: number
  puzzleId: PuzzleId
  source: string
}
```

消息分为 `ready`、`case-start`、`case-result`、`done` 和 `runner-error`。`ready` 不带运行编号；初始化失败可使用编号 `0`。主线程不仅看 TypeScript 类型，还校验实际字段、用例顺序、状态枚举、有限耗时与累计文本大小。

事件监听器绑定本轮 Worker，再核对当前实例、题目和 `requestId`，避免旧消息覆盖新结果。停止不等待 Worker 自己回复；死循环中的 Worker 也无法依靠同一线程的普通计时回调救场。正常结束、停止、超时、通信异常和离开页面都进入清理流程：

```ts
activeRun = null
if (run.startupTimer !== null) clearTimeout(run.startupTimer)
if (run.runTimer !== null) clearTimeout(run.runTimer)
run.startupTimer = null
run.runTimer = null
run.worker.onmessage = null
run.worker.onerror = null
run.worker.onmessageerror = null
run.worker.terminate()
```

中断时保留已完成用例，当前例标明中断，后续例保持“未运行”。新的一轮重新创建 Worker，避免上次残留状态混入。

### 4. 编译阶段与执行阶段必须分开

Worker 初始化调用安全默认的 `lockdown()`；初始化失败就禁用执行，不退回裸求值。每个用例新建 Compartment，只注入硬化后的 `console.log/warn/error` 门面。这些方法闭包调用有预算的日志收集器，而不是把原生 console、消息通道或宿主全局对象传进去。

用户函数的取得过程如下：

```ts
const entry = puzzle.entryPoint
const factory = new compartment.globalThis.Function(
  `${source}\n;return typeof ${entry} === 'function' ? ${entry} : undefined`,
)
phase = 'execute'
const solve: unknown = factory()
```

这里使用的是 **Compartment 自身的受限 Function**，不是 Worker 宿主的 Function。入口来自已校验的本地题库；构造工厂只解析源码，随后调用工厂才执行用户顶层语句，再校验入口并调用算法。

因此，源码括号缺失是语法错误；源码合法、运行时主动 `throw new SyntaxError(...)`，仍是运行时错误。不能仅根据异常名字分类。缺失入口和异步返回也会给出明确提示。

每例传入 `structuredClone(test.args)` 的参数副本。修改副本可以是算法的一部分，但不会改变原始用例或期望数据；不同用例也不依赖同一个 Compartment 的顶层变量。SES 仍使用受控求值机制，并非“完全不需要 eval 的解释器”；将来遇到不兼容的 CSP，应重新评估，不能放宽安全策略绕过。

### 5. 返回值不是拿来就能展示的 JSON

直接对用户返回对象调用无界 `JSON.stringify`，可能遇到巨大结构、循环、`toJSON`、访问器或 Proxy。把原对象传给主线程再处理，还会把风险带到界面线程。

输出模块在 Worker 内按深度、节点和字节预算读取结构，同时产生两份结果：供展示的文本，以及供判题的纯 JSON 快照。数组元素和对象属性通过描述符检查；对象快照使用 `Object.create(null)`，让 `__proto__` 等字符串键不会触发普通对象的原型设置行为。

非法 JSON 可以有诊断文本，但不具有可判题的快照。`undefined`、非有限数值、循环结构等不会被悄悄替换成 `null` 后算作正确：

```ts
const snapshot = budget.capture(value)
result.actual = snapshot.text
result.status = snapshot.json !== undefined
  && JUDGES[puzzle.judge](snapshot.json, test)
  ? 'passed'
  : 'wrong-answer'
```

描述符操作也可能触发 Proxy 陷阱，检查 thenable 的属性读取同样可能执行用户逻辑。这些操作必须继续留在 Worker 中，由主线程超时终止兜底；不能宣称“没有直接读属性就彻底避免了用户代码执行”。

### 6. 资源预算必须包含错误反馈

当前限额来自命名常量。`1 KiB = 1024` 字节，文本字节预算按 UTF-8 计算；代码长度单独按 UTF-16 代码单元计算。

| 项目 | 上限与范围 |
| --- | --- |
| 代码长度 | 32768 个 UTF-16 代码单元 |
| 用例与输入 | 每题最多 20 例，整批题目用例序列化后不超过 64 KiB |
| 展示输出 | 每轮累计 64 KiB，包含实际结果、日志和错误文本 |
| 日志 | 每轮最多 16 KiB、128 条，同时占用总输出预算 |
| 错误文本 | 单条最多 4 KiB；错误格式化必要时截断 |
| 输出结构 | 深度最多 8、单次捕获最多 2048 个节点，另有限制检查 |
| 启动与执行 | 初始化最多等待 10 秒；ready 后整轮执行预算 3 秒，不是每例 3 秒 |

超限标志一旦置位，本轮不会再被判为通过；用户捕获日志方法抛出的异常也不能清除它。主线程再次校验消息大小，形成两端约束。

这些都是教学环境的预算，不是操作系统配额。SES 不限制用户自行分配内存，Worker 终止也无法保证免于浏览器进程崩溃；后台调度还可能延迟计时器。因此这里既没有内存硬上限，也没有严格实时保证。

## 六、实现过程：先证明能运行，再证明能复用

工程分成两个可追踪阶段，而不是一开始就设计“支持所有语言和题型”的平台。

**阶段一：MVP，提交 `18d6e0b`。**先以两数之和打通编辑、执行、逐例反馈和中断闭环。明确同步 JavaScript 边界，完成 Worker 内 SES 初始化、消息校验及输出预算，再接入文章和稳定导航。只有真实运行过，才知道错误分类、卸载清理和暗色输入体验有哪些遗漏。

**阶段二：配置化，提交 `b00a4c1`。**第一版的函数名、`nums/target` 和“两下标答案”仍散落在执行器与 UI 中。第二阶段引入通用 `args`，把入口和提示移入题目配置，将输出处理与可信判题策略拆开。二分查找返回单个数值，成为验证抽象是否成立的第二个样本。

这轮改造没有新增依赖。真正的验收不是文件夹名字是否“通用”，而是新增普通题时是否还需要修改公共 UI 或 Worker。把执行能力和题意分开后，公共模块不再知道二分查找该如何缩小区间。

## 七、踩过的坑，以及测试没有证明的事

### 输出已经超限，提示却把消息继续撑大

一次边界测试先让实际结果接近总预算，再触发超限。固定的“输出超限”提示原先没有预留空间，最终累计展示内容达到 **65,615 字节**，超过 **65,536 字节**。UI 正确拒绝了超预算消息，却只能显示执行器错误，丢失了原本想表达的状态。

修复是在预算初始化时预留固定提示所需字节，并保留“超限状态粘性”的测试。教训是：**异常处理也消耗资源，错误路径不能游离于协议预算之外。**

### 背景变暗，不等于高亮主题已经适配

CodeMirror 的基础配置提供了默认高亮，但仅修改编辑区背景和普通文字颜色并不够。实现时的 Edge 检查发现，默认紫色关键字在本站暗色背景上的对比度只有 **1.75:1**。

随后将已经存在的 CodeMirror 语言模块显式声明为直接依赖，通过公开 `HighlightStyle` API 配置 CSS 变量配色，并增加明暗模式下实际语法 token 的 **4.5:1** 阈值检查。这是所测文本的对比度验证，不等于完成了全部 WCAG 或屏幕阅读器审计。

### 构建成功与交互正确是不同证据

| 验证层 | 已用于检查 | 不能替代 |
| --- | --- | --- |
| VitePress 构建 | 客户端/SSR 打包与站内死链 | 点击交互、独立类型检查 |
| Node 纯逻辑与 Worker 模块适配 | JSON 快照、判题、题库校验、逐题初始代码与错误场景 | 浏览器线程和资源地址验证 |
| Edge / CDP 冒烟 | 初始解、非法答案、能力限制、停止/重置/超时、切题、窄屏和明暗配色 | 所有浏览器、真实手机与人工可访问性验收 |

这套实现已完成过两道题、首页、Linux 全部 5 页及既有 Vue 文章的浏览器回归。其中一次并行运行发生 `CDP timeout: Runtime.evaluate`，加入诊断后单独完整重跑未复现，**原因仍未确定**。不能把“后来通过”写成“已经找到并修复根因”。

目前没有独立 lint/typecheck 命令，部署工作流也没有自动跑完这些浏览器检查。Firefox/Safari、真实手机、屏幕阅读器、编辑器加载失败的故障注入，以及首屏资源成本，都不能借已有结果宣称已经验证。

## 八、复用落地：新题主要增加配置，而不是执行代码

题目核心模型很小：

```ts
export interface AlgorithmTestCase {
  readonly id: string
  readonly label: string
  readonly args: readonly JsonValue[]
  readonly expected: JsonValue
}
```

一个数组参数写作 `args: [[1, 2, 3]]`；数组加目标值才是 `args: [[1, 2, 3], 4]`。`definePuzzle` 检查参数数量、用例 ID、JSON 结构和输入预算，再冻结数据。TypeScript 的 `readonly` 只是类型约束，不能替代运行时冻结。

普通题选择 `json-equal`，比较类型和值；对象键顺序不重要，数组顺序重要。两数之和则选择 `two-sum-indices`，允许交换两个合法下标。不要为了复用就把所有数组排序或去重，那可能改变题意。

日常新增一题的步骤是：

1. 在题库定义标题、入口、参数名、初始代码、用例与提示，注册到 `PUZZLES`；`PuzzleId` 随注册表推导。
2. 普通答案直接比较；只有需要等价答案时，才在可信 `JUDGES` 表增加策略。
3. 新建 Markdown，引用同一个 `AlgorithmSandbox`，更新总览和 sidebar。
4. 在浏览器脚本的 `PUZZLE_CHECKS` 中补充独立的用例预期与入口检查，再运行验证。

题目注册不是来源可信的替代品；配置和判题器仍属于站点作者维护的代码。当前流程也没有自动生成文章目录或所有测试，所以“配置化”不等于零维护，但编辑器和执行器不再随题目数量复制增长。

在仓库根目录可执行以下检查；Node 适配脚本要求 Node.js 22.19+：

```powershell
node --experimental-strip-types .devin/skills/vitepress-interactive-writing/scripts/verify-sandbox.mjs
npm run docs:build
git diff --check
```

逐条确认成功后，启动预览，在另一终端顺序执行浏览器回归：

```powershell
npm run docs:preview -- --host 127.0.0.1 --port 4173
```

```powershell
node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs http://127.0.0.1:4173/myBlog/ algorithm
node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs http://127.0.0.1:4173/myBlog/ linux
```

只调整本篇文章时，还可以单独检查它的入口、SVG、复用沙盒、键盘与离页清理；`frontend` 分支并不代表覆盖所有前端文章：

```powershell
node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs http://127.0.0.1:4173/myBlog/ frontend
```

端口占用时，不终止陌生服务；更换空闲端口并同步替换验证地址。重建前停止自己启动的预览，重建后再启动，避免旧资源索引干扰验证。类型擦除运行不是类型检查，Node 测试也不能代替上面的浏览器步骤。

## 九、后续优化：先补证据，再扩能力

| 优先级 | 可以优化的方向 | 判断依据与边界 |
| --- | --- | --- |
| 高 | 补齐类型检查、CI 交互回归、失败加载测试与更多浏览器/真机验证 | 先降低维护和发布风险，不以本机 Edge 通过概括所有环境 |
| 高 | 测量真实加载体积、首次运行成本与低端设备表现 | 有数据后再考虑进入视口加载、交互后加载等策略，不预设优化收益 |
| 中 | 优化编辑器状态切换与运行控制代码 | 当前切换只读状态涉及视图重建，可评估重配置方式；必须保留源码、撤销记录和焦点体验 |
| 中 | 随题库增长拆分配置、减少重复维护 | 当前两题足够简单，未来再评估按需加载和目录生成；测试预期仍需独立核对 |
| 条件性 | TypeScript 转译、Pyodide 或更强隔离运行时 | 只有真实教学需求成立才引入，并重新验证体积、错误映射、中断和资源限制 |
| 独立项目 | 远程多语言执行 | 需要鉴权、限流、队列、资源配额和隔离运维，不再是当前纯前端方案 |

暂不值得做的是为了“像在线 IDE”就加入文件管理、终端和语言切换。它们会扩大承诺，却未必帮助读者理解一道算法题。

回到实验室比喻：操作台负责交互，实验间承担计算，工具规则限制能力，验收清单解释结果。把这四件事分清，才有机会让下一篇教程主要花时间在教学和用例上，而不是重新搭建实验室。

## 源码与参考

本文按已提交的实现复盘，版本链接用于避免后续源码演进让解释失去上下文；运行结果仍以你当前浏览器的实际操作为准。

- [首个 MVP：18d6e0b](https://github.com/tuhardy/myBlog/commit/18d6e0b)
- [配置化实现目录：b00a4c1](https://github.com/tuhardy/myBlog/tree/b00a4c1/config/.vitepress/theme/components/sandbox)
- [VitePress：SSR 兼容性与客户端导入](https://vitepress.dev/guide/ssr-compat)
- [Vite：Web Worker 的标准构造方式](https://vite.dev/guide/features.html#web-workers)
- [CodeMirror：模块化编辑器示例](https://codemirror.net/examples/bundle/)
- [CodeMirror：避免 Tab 键盘陷阱](https://codemirror.net/examples/tab/)
- [SES：lockdown 配置与限制](https://docs.endojs.org/documents/lockdown.html)

<style scoped>
.sandbox-diagram { box-sizing: border-box; max-width: 100%; margin: 24px 0; padding: 12px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: #ffffff; }
.sandbox-diagram a { display: block; width: 100%; max-width: 360px; margin: 0 auto; }
.sandbox-diagram img { display: block; width: 100%; max-width: 100%; height: auto; margin: 0; }
.sandbox-diagram figcaption { margin-top: 8px; padding: 0 12px; color: #42566c; font-size: 14px; line-height: 1.6; text-align: center; }
.sandbox-diagram a:focus-visible { outline: 2px solid #2563a6; outline-offset: 2px; }
.architecture-diagram > a { max-width: none; }
.architecture-picture { display: block; width: 100%; container-type: inline-size; }
.architecture-picture .architecture-wide { display: none; }
.architecture-picture .architecture-compact { display: block; width: 100%; max-width: 360px; height: auto; margin: 0 auto; }
@container (min-width: 640px) {
  .architecture-picture .architecture-wide { display: block; width: 100%; max-width: 100%; height: auto; margin: 0; }
  .architecture-picture .architecture-compact { display: none; }
}
.architecture-viewer { box-sizing: border-box; width: min(960px, 94vw); max-width: 94vw; max-height: 92dvh; margin: auto; padding: 0; border: 0; border-radius: 16px; color: #23364d; background: #ffffff; box-shadow: 0 24px 80px #0f172a40; }
.architecture-viewer[open] { display: flex; flex-direction: column; }
.architecture-viewer::backdrop { background: #0f172aad; }
.architecture-viewer__header { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
.architecture-viewer__header h2 { margin: 0; padding: 0; border: 0; font-size: 20px; line-height: 1.4; }
.architecture-viewer__header p { margin: 4px 0 0; color: #526278; font-size: 14px; line-height: 1.4; }
.architecture-viewer__header button { flex: none; min-height: 44px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; color: #23364d; background: #f8fafc; font: inherit; font-size: 14px; cursor: pointer; }
.architecture-viewer__header button:focus-visible { outline: 2px solid #356ba6; outline-offset: 2px; }
.architecture-viewer__content { min-height: 0; padding: 16px; overflow: auto; overscroll-behavior: contain; }
.architecture-viewer__content img { max-height: calc(92dvh - 160px); object-fit: contain; }
</style>
