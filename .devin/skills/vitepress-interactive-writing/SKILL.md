---
name: vitepress-interactive-writing
description: 为 VitePress 创建或改写互动技术教程，复用项目教学组件，接入首页与导航，并验证构建。适用于生活化比喻、交互实验、分级课程及完整教程发布任务。
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
每篇教学页至少四种不同交互形态，可选 Tabs、Slider、数字动画、翻面卡、Tooltip、Popover、Drawer、Collapse、Tag/Badge、Steps。父子配套组件、按钮不单独计数。至少两种共享同一状态源，可通过 computed 派生，产生可观察联动；状态名称与实际语义一致。

1. 优先读取项目组件导出索引，仅读取本篇选中组件的接口与必要用例，不默认读取全部源码。
2. 确认导入路径、props、events、slots、v-model 和 SSR 要求，禁止猜测组件及接口。
3. 仅生成组件调用、文章内容和本篇特有状态，不复制已有组件内部逻辑或 CSS。
4. 能力不足时优先调整演示或局部最小实现；新增、修改公共组件须已有授权或另行确认。
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

四个组件仅依赖项目 Vue，不依赖 Naive UI/VueUse，不使用全局注册。它们支持 SSR；数字动画只在挂载后运行并在卸载时取消。教程的模拟实验可统一包裹 ClientOnly，但正文和环境警告保留 SSR。

`docs/<专题>/<页面>.md` 的导入路径为 `../../config/.vitepress/theme/components/learning`。其他深度需重新计算，不能盲目复制。示例课程为 `docs/linux/`，仅按需读取相关页，不全量加载。

算法沙盒使用独立索引 `config/.vitepress/theme/components/sandbox/index.ts`，不从 learning 或主题入口重导出。`docs/algorithm/two-sum.md` 命名导入路径为 `../../config/.vitepress/theme/components/sandbox`。

| 导出 | 教学用途 | 接口 |
| --- | --- | --- |
| AlgorithmSandbox | 同步 JavaScript 算法编辑与固定用例判题 | 必需 id: string（页内唯一）、puzzleId: PuzzleId（从 PUZZLES 注册表键自动推导）；当前可选 two-sum、binary-search，模板如 puzzle-id="binary-search"，用 ClientOnly 包裹。签名、具名 JSON 参数与期望提示由题目配置提供。编辑器在客户端加载，执行器位于 Worker；正文和限制说明保留 SSR。 |

算法专题以单一沙盒完成操作、观察和解释，不套用四类 Learning 交互数量要求；总览保持静态，题目页默认只有一个沙盒。

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

### 算法题新增步骤

1. 读取 `config/.vitepress/theme/components/sandbox/algorithm-puzzles.ts`、`sandbox-types.ts` 和目标判题接口，先明确同步入口、参数顺序、输入前提、返回类型与边界。`JsonValue` 表示递归 JSON 数据：只用有限数值和无循环的普通数据，不包含函数、访问器、数组空位或异步值。
2. 在现有 `algorithm-puzzles.ts` 中用 `definePuzzle` 添加题目配置：填写 `id`、`title`、`entryPoint`、`parameterNames`、`judge`、`expectedHint`、`failureMessage`、`initialCode` 和 `tests`。每例提供唯一 `id`、可读 `label`、按参数顺序排列的 `args` 及 JSON `expected`；参数数量与 `parameterNames` 一致。初始代码必须符合本题契约并通过全部固定用例，覆盖正常、边界和未找到等适用情况。
3. 将题目注册到同文件的 `PUZZLES`，键必须与配置 `id` 一致。`PuzzleId` 从注册表键自动推导，`JudgeId` 从受信任 `JUDGES` 表键自动推导，不手工维护题目 ID 联合类型或另一份允许列表。
4. 普通题选择 `judge: 'json-equal'`，按 JSON 类型与值精确比较；数组顺序敏感，对象键顺序不敏感。仅在题意需要等价答案时，在 `algorithm-judges.ts` 的受信任函数表 `JUDGES` 增加专属判题函数，再由题目配置引用其 ID。判题逻辑在执行器侧使用，不从沙盒公共索引重导出到主线程，也不把用户代码作为判题器。
5. 普通 JSON 判题的新题无需修改 `AlgorithmSandbox.vue`、Worker 通信或执行生命周期；展示直接使用配置的标题、入口、参数名、`args`、期望值与提示。保留 `id` / `puzzleId` props、既有 `data-testid` 与根节点 `data-puzzle-id`，不要为每道题增加 UI 分支。
6. 新建 `docs/algorithm/<题目短名>.md`，复用同一个 `AlgorithmSandbox` 并用 ClientOnly 包裹，正文保留 SSR。按“题意 → 初始解法 → 操作、观察、原理 → 边界与正确性 → 复杂度 → 验收”组织，一页默认一个沙盒，不堆叠四种 Learning 组件。案例表与注册数据一致，说明特有契约，不能把两数之和的唯一解或顺序不限当作通用规则。
7. 更新算法总览与 `config/.vitepress/config.mts` 的算法 sidebar。已有算法专题入口时无需修改首页或文章分类；不新增依赖，不使用未声明包，不另建过程文档。
8. 在浏览器脚本 `verify-site.mjs` 的 `PUZZLE_CHECKS` 补充新题的路径、用例 ID 和参考解等验证配置；未知页面会明确失败，不能跳过。补充非法返回、边界及跨题路由切换检查，回归原题与停止、重置、超时、隔离等执行边界。纯逻辑脚本会自动遍历注册表运行各题初始代码与共用错误场景。按下节完成构建和 algorithm、linux 冒烟检查；未执行的检查明确交付给后续验证，不把预期结果写成实测结论。

### 4. Review：验证与交付
在仓库根目录使用 PowerShell：

```powershell
npm run docs:build
npm run docs:preview -- --host 127.0.0.1 --port 4173
```

构建完成后启动预览服务；预览服务运行期间如果重新构建，先停止并重启预览，避免静态资源索引仍引用旧产物。服务保持运行，在另一个 PowerShell 执行技能内的浏览器冒烟脚本：

```powershell
node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs http://127.0.0.1:4173/myBlog/ linux
```

脚本要求 Node.js 22+ 与本机 Chromium 系浏览器，Windows 默认使用 Edge；其他安装位置可设置 BROWSER_PATH 环境变量。参数依次为含部署 base 且以斜杠结尾的本地预览地址、专题短名。脚本从首页卡片进入专题，并从侧边栏发现章节；当前用于每页采用四个 Learning 组件且首个滑块与数字展示联动的教程。不匹配该结构的教程需调整验证用例，不能跳过失败后声称通过。

构建通过后检查部署 base 下的首页、专题总览和全部章节：入口链接、浏览器控制台、滑块与数字联动、选项卡点击/键盘、翻面按钮、移动端溢出、暗色模式和减少动态效果。脚本回归既有 Vue 基础文章；迁移项目时替换回归路径。自动检查不能替代视觉验收、屏幕阅读器测试和教程命令验证。

算法专题先用 Node.js 22.19+ 执行纯逻辑与实际 Worker 模块的 Node 适配测试，验证有界 JSON 快照、比较器、注册配置和逐题入口。类型擦除运行不等于 TypeScript 类型检查，Node 适配测试也不能代替浏览器 Worker 验证。

```powershell
node --experimental-strip-types .devin/skills/vitepress-interactive-writing/scripts/verify-sandbox.mjs
```

随后运行浏览器专用分支，不替代上述 Linux 验证流程和四个 Learning 组件断言：

```powershell
node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs http://127.0.0.1:4173/myBlog/ algorithm
```

algorithm 分支应覆盖静态总览、各题单沙盒页面、两数之和 5 例与二分查找 7 例初始解法、两数之和反向下标、二分查找标量返回与空数组/未找到/首尾边界、非法答案、语法与运行时错误、异步返回拒绝、停止/重置/超时、输出预算、能力隔离、跨题路由切换与清理、部署 base 资源加载和窄屏键盘操作，不要求四类 Learning 交互。发布前仍须运行原 linux 分支；脚本分支未实现或检查未执行时如实报告，不能用构建成功代替。

对新增代码进行正确性、安全性、可访问性、SSR 与维护性评审，修正后重跑相关检查。`git diff --check` 检查空白问题；新文件也必须纳入审阅，不能只看已跟踪 diff。

最后简要报告交付入口、验证结果、未验证项和下次调用方式。没有运行构建、浏览器或 Linux 实验时，明确区分，不声称全部测试通过。不自动提交、推送或执行教程中的系统管理命令。
