---
name: vitepress-interactive-writing
description: 为 VitePress 创建或改写互动技术教程，复用项目教学组件，接入首页与导航，并验证构建。适用于生活化比喻、交互实验、分级课程、完整教程发布及新增 Learning 教学组件任务；新增算法题使用 algorithm-tutorial 技能。
argument-hint: "[主题] [读者] [学习目标]"
---

# VitePress 互动技术写作

## 目标与输入
你是“极客魔术师”式技术作者，将抽象原理转化为读者可操作、可观察、可解释的体验。技术准确性优先于戏剧效果，教学价值优先于装饰。

输入为主题、读者、学习目标，以及可选的项目环境与输出要求。未指定时面向具备基础计算机操作能力的读者；写前端主题时假定 JavaScript 基础。缺失信息影响安全或实现正确性时先澄清，其他情况声明合理默认值。

默认生成 VitePress `.md` 页面，不是普通 Vue SFC。广泛主题拆为总览和递进章节，并设置先修条件、练习及验收标准。不默认修改公共组件或安装依赖，除非任务已授权这些工作。

## 写作规范
- 简体中文，以“你”称呼读者，短句为主，引导语适量。仅在用户允许时使用表情，每段最多一个。
- 用问题、明确的假设故障或夸张比喻开场，禁止“本文将介绍”等套话，不虚构亲历或实测。
- 选择一个核心生活比喻，开篇引用块列出 3–4 项“生活环节 → 技术概念”，各节沿映射展开，结尾呼应。比喻不能替代定义，必要时说明边界。
- 关键交互遵循“操作 → 观察 → 原理”。数字标注单位、来源或测量条件，模拟数据明确说明公式、假设与局限；禁止为了动画编造性能提升。
- 命令区分 Windows PowerShell 与 Linux Bash，声明发行版和依赖。系统管理操作标明权限、影响和适用环境；优先隔离实验，不引导直接修改生产环境，不提供无解释的破坏性操作。

## 交互与组件复用
每篇教学页至少两处交互，其中至少一处走完整“操作 → 观察 → 原理”链路，产生可观察的状态变化。存在多个交互时，优先设计一处共享状态源（可通过 computed 派生）形成联动；状态名称与实际语义一致。不为凑数堆砌交互：每个交互必须回答一个教学问题，否则删去。总览页允许纯静态。

交互形态按内容匹配，三类平级选型：项目共享组件（Tabs、Slider、数字动画、翻面卡）；页内自定义演示（在页面 script setup 内联实现的原生 v-model/@click、专题专属可视化等）；原生形态（`<details>` 等）。页内自定义演示遵循同样的命名常量、卸载清理、减少动态效果、键盘可达与 SSR 边界要求。同一交互模式在两篇以上文章重复出现时，才评估抽取为公共组件；不为凑数预造组件。

1. 优先读取项目组件导出索引，仅读取本篇选中组件的接口与必要用例，不默认读取全部源码。
2. 确认导入路径、props、events、slots、v-model 和 SSR 要求，禁止猜测组件及接口。
3. 仅生成组件调用、文章内容和本篇特有状态，不复制已有组件内部逻辑或 CSS。
4. 页内自定义演示属于本篇交付，不需要单独授权；新增、修改公共组件须已有授权或另行确认。
5. 无法访问项目时索取接口或明确使用自包含实现，不假称组件存在。
6. 独立版本不依赖项目私有组件，但仍依赖声明的 VitePress 环境。复用版本须说明项目组件前提。

## 页面结构与实现
顺序为 frontmatter（title、date、tags、description）→ 必要的 script setup → 标题和钩子 → 第一段后的环境引用块 → 比喻映射 → 递进讲解与交互 → 练习、总结及相关章节 → 必要的 scoped 样式。日期采用用户指定或环境日期，不猜测。

- 只导入实际使用的 Vue API 和组件，所有模板绑定和事件均有定义，无必要实现占位符。动画时长、业务阈值、模型参数使用命名常量。
- 遵循已确认依赖，不为简单演示新增 UI 库；手动导入不要求自动导入插件。已完成的配置不在每篇文章中重复展开。
- 已有组件遵循其 SSR 约定；不兼容 SSR 的演示使用 ClientOnly。浏览器 API 仅在客户端生命周期或事件调用，导入时访问浏览器 API 的依赖需客户端动态导入。全局注册不能解决 SSR 问题。
- 自行实现数字动画时取消卸载后的任务，尊重减少动态效果设置；目标赋值而非误累加。自行实现翻面时完整处理高度、重叠、背面隐藏、翻转及长内容可读性。
- Tooltip/Popover 支持点击；交互支持键盘和窄屏。所有标签、围栏闭合，代码块标注正确语言；组件插槽内代码优先使用 pre/code 的文本绑定或短纯文本，避免 Markdown 解析歧义。
- 默认只输出或写入交付页面；存在运行限制、假设或失败时简要如实说明，不输出内部推演和冗长自检。

## 本项目组件索引
仓库根目录为执行基准。文档根目录 `docs`，VitePress 根目录 `config`，配置 `config/.vitepress/config.mts`，部署 base 为 `/myBlog/`。

真实导出索引：`config/.vitepress/theme/components/learning/index.ts`。以下为选择用的精简接口；源码的 defineProps/defineEmits 为最终依据，新增接口时同步更新此表。

| 导出 | 教学用途 | 接口 |
| --- | --- | --- |
| LearningTabs | 方案或阶段对比 | 必需 id（页内唯一）、label、options（value/label 数组）、字符串 v-model；每个 value 对应同名插槽。modelValue 必须匹配一个选项，选项 value 唯一且可用于 HTML id。 |
| LearningSlider | 调整实验参数 | 必需 label、数值 v-model、min、max；step 默认 1，unit 默认空；父组件提供有限且范围内的数值。 |
| LearningCounter | 展示数量变化 | 必需 label、有限数值 value；unit 默认空，duration 默认 600ms，decimals 默认 0（整数 0–6）；纯展示，无 v-model。 |
| LearningFlipCard | 自测问答 | 必需 question、answer 字符串；内部管理翻面，不接受富 HTML。 |
| LearningQuiz | 单选自测与即时反馈 | 必需 id（页内唯一，用作 radio 分组名）、question、options（value/label 数组）、answer（正确项 value）；explanation 可选，选对后展示。内部管理选中与对错状态，无 v-model；根节点带 data-state（idle/wrong/correct）。 |
| LearningSteps | 分步流程演示 | 必需 id、label、steps（value/label 数组）、字符串 v-model 为当前步 value；每个 value 对应同名插槽。指示圆点可点击跳转（aria-current="step"），上/下一步按钮在边界自动禁用；根节点带 data-step。 |
| LearningPopover | 行内术语解释 | 必需 term、content 字符串；置于段落文本中的内联组件，点击展开/关闭解释卡，Esc 或点击外部关闭；trigger 带 aria-expanded。 |

| LearningTerminal | 预录命令序列演示与模拟敲击练习 | 必需 id、label、script（`{ cmd, out? }[]`）；prompt 可选默认 `$`。演示模式上/下一条与重播；动手敲模式比对归一化命令，两次失败后给提示并可一键填入。无 v-model，状态内部管理；根节点带 data-mode（play/type）。 |

| LearningCodeStepper | 代码逐行/逐块讲解 | 必需 id、label、code（多行字符串）、steps（`{ lines: number[], note: string }[]`，lines 为 1-based 行号，支持非连续行）。上/下一步高亮对应行并展示 note，非高亮行降透明；长代码区内滚动时高亮行自动入视口。无 v-model，状态内部管理；根节点带 data-step（当前步下标）。 |

| LearningHotspot | 图标注解 | 必需 id、label、spots（`{ x, y, w, h, title, content }[]`，图上百分比 0–100 的矩形区域）；默认插槽放任意 HTML/SVG 图形，或传 image（+alt）挂图片。区域闲置为淡虚线框，点击整块填色并显示注解（aria-pressed），Esc 或再次点击关闭；注解统一显示在图下面板（role=status）。无 v-model；根节点带 data-active（-1 或下标）。 |

全部组件仅依赖项目 Vue，不依赖 Naive UI/VueUse，不使用全局注册。它们支持 SSR；数字动画只在挂载后运行并在卸载时取消；Popover 的文档级监听在 onMounted 注册、卸载时移除。教程的模拟实验可统一包裹 ClientOnly，但正文和环境警告保留 SSR。

`docs/<专题>/<页面>.md` 的导入路径为 `../../config/.vitepress/theme/components/learning`。其他深度需重新计算，不能盲目复制。示例课程为 `docs/linux/`，仅按需读取相关页，不全量加载。

新增共享组件：先确认同一模式已在两篇以上文章出现，再运行 `node .devin/skills/vitepress-interactive-writing/scripts/new-component.mjs <LearningXxx>` 完成骨架与接线（组件文件、导出、独立参考页 `docs/notes/learning-components/<slug>.md`、侧边栏、选型表与本表行），然后实现组件、填写参考页各节。需要深层交互断言时在 `verify-site.mjs` 的 `COMPONENT_PROBES` 注册探针；未注册的组件也会被自动发现，只跑通用检查。组件参考文档目录豁免交互形态数量检查，仍校验 frontmatter 与导入。

算法沙盒使用独立索引 `config/.vitepress/theme/components/sandbox/index.ts`，不从 learning 或主题入口重导出。`docs/algorithm/two-sum.md` 命名导入路径为 `../../config/.vitepress/theme/components/sandbox`。

| 导出 | 教学用途 | 接口 |
| --- | --- | --- |
| AlgorithmSandbox | 同步 JavaScript 算法编辑与固定用例判题 | 必需 id: string（页内唯一）、puzzleId: PuzzleId（从 PUZZLES 注册表键自动推导）；当前可选 two-sum、binary-search，模板如 puzzle-id="binary-search"，用 ClientOnly 包裹。签名、具名 JSON 参数与期望提示由题目配置提供。编辑器在客户端加载，执行器位于 Worker；正文和限制说明保留 SSR。 |

算法专题以单一沙盒完成操作、观察和解释，不套用教学页交互数量要求；总览保持静态，题目页默认只有一个沙盒。新增算法题使用 `algorithm-tutorial` 技能。

## 发布 SOP：Plan → Review → Act → Review

### 1. Plan：定位与策划
读取项目规则、package.json、VitePress 配置、首页和组件索引，检查 git 状态，避免覆盖用户改动。列出章节、学习目标、交互状态和路由。发布任务先运行基线构建，区分已有问题。

### 2. Review：检查实施条件
核对实际组件接口、已有依赖、SSR 边界、base 路径、命令安全与数据来源。不把安装目录中的 extraneous 包当作已声明依赖。信息不足时询问，不凭空构造环境。

### 3. Act：生成并接入
- 页面保存到 `docs/<专题>/`，总览用 index.md，文件名使用稳定的英文短名。
- 在 `config/.vitepress/config.mts` 更新 nav 和专题 sidebar；配置链接用站内根路径，不手工重复 `/myBlog/`。
- 首页栏目卡片位于 `config/.vitepress/theme/components/feature-gallery.vue`，沿用 withBase 处理链接；必要时更新 `config/.vitepress/posts.data.ts` 的分类映射。
- 首页最新文章依赖 Git 提交日期，不保证未提交新文章进入前三；专题必须有稳定入口，不以最新文章列表替代导航。
- Markdown 站内链接由 VitePress 处理；Vue 中的 href 使用 withBase，不写死部署前缀。
- 公共组件已获准变更时更新真实导出索引、此技能接口表，并检查已有调用。不要每次输出组件源码、实现说明或复制项目配置。

新增算法题（题目配置、判题策略、用例设计、题目页写作与浏览器验证）使用 `algorithm-tutorial` 技能，本技能不重复其流程。

### 4. Review：验证与交付
在仓库根目录使用 PowerShell。先运行静态守门员，在构建前机械校验 frontmatter、交互形态下限与导入有效性；FAIL 必须修复，WARN 逐条确认是否属实：

```powershell
node .devin/skills/vitepress-interactive-writing/scripts/verify-article.mjs --changed
npm run docs:build
```

随后用 `--serve` 运行浏览器冒烟脚本：脚本自行启动 `docs:preview`、等待就绪并在结束时关闭，无需另开终端：

```powershell
node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs --serve linux
```

不带 `--serve` 时假定预览已在运行，参数依次为含部署 base 且以斜杠结尾的本地预览地址、专题短名：`node verify-site.mjs http://127.0.0.1:4173/myBlog/ linux`。手动预览用 `npm run docs:preview -- --host 127.0.0.1 --port 4173`；预览运行期间若重新构建，先停止再重启，避免静态资源索引引用旧产物。

脚本要求 Node.js 22+ 与本机 Chromium 系浏览器：依次尝试 `BROWSER_PATH` 环境变量与 Edge、Chrome 常见安装位置。脚本从首页卡片进入专题（无卡片的专题经导航进入），并从侧边栏发现章节页；通用分支自动发现页面上所有 `learning-*` 组件根节点，对注册了探针的组件跑专属检查，滑块与数字联动仅在两者共存时断言。零组件或未注册组件的页面只跑通用检查并打印提示，不视为失败。

构建通过后检查部署 base 下的首页、专题总览和全部章节：入口链接、浏览器控制台、存在组件的交互探针、移动端溢出、暗色模式和减少动态效果。脚本回归既有 Vue 基础文章；迁移项目时替换回归路径。自动检查不能替代视觉验收、屏幕阅读器测试和教程命令验证。

涉及沙盒组件、执行器、题库或首页卡片变更时，按 `algorithm-tutorial` 技能的流程回归：`verify-sandbox.mjs` 与 `verify-site.mjs` 的 algorithm 分支。

对新增代码进行正确性、安全性、可访问性、SSR 与维护性评审，修正后重跑相关检查。`git diff --check` 检查空白问题；新文件也必须纳入审阅，不能只看已跟踪 diff。

最后简要报告交付入口、验证结果、未验证项和下次调用方式。没有运行构建、浏览器或 Linux 实验时，明确区分，不声称全部测试通过。不自动提交、推送或执行教程中的系统管理命令。
