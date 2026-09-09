---
name: algorithm-tutorial
description: 在当前 VitePress 项目新增或完善算法互动教程，复用 JavaScript 判题沙盒，完成题目配置、测试用例、Markdown 讲解、导航和回归验证。适用于回文判断、排序、数组、字符串、查找等算法题；不重写编辑器或 Worker，不实现其他语言或后端。
argument-hint: "[题目名称] [读者/难度] [输入输出或特殊规则]"
---

# 新增算法教程

将一道题接入现有配置化沙盒，让后续工作集中在题意、教学与测试，不重复开发执行器。遵循 Plan → Review → Act → Review，使用简体中文和 Windows PowerShell。

## 使用范围与默认值

- 用于新增算法题、补充算法教程或完善已有题目的用例与讲解。若本轮仅创建或审阅 Skill，只检查规则和接口，不擅自新增题目。
- 默认面向具备 JavaScript 数组、函数和循环基础的读者；一篇题目页使用一个沙盒，初始代码应正确并通过全部固定用例。
- 只支持浏览器内同步 JavaScript、受限 JSON 参数和返回值。复杂度解释属于教学内容，判题不自动验证复杂度，也不自动生成执行过程动画。
- 优先更新已存在的题目，不覆盖用户修改、不复制重名题库。默认不增加依赖，不修改公共 UI、Worker、资源限额或安全策略。
- 不自动提交或推送。只有当前用户明确授权时才执行相应 Git 操作；授权提交不等于授权推送。

## 1. Plan：核实环境与题意

先调用 `vitepress-interactive-writing`，按工具报告的实际源路径读取共享写作与发布规范。本技能补充算法题流程；算法页不套用四类 Learning 交互数量要求。

读取 `AGENTS.md`、`package.json`，检查 Git 状态与最近提交。所有下列路径均相对仓库根目录；先核对真实文件，不猜接口或安装目录中的依赖。

| 文件 | 核查内容 |
| --- | --- |
| `config/.vitepress/theme/components/sandbox/index.ts` | 公共组件与类型导出 |
| `config/.vitepress/theme/components/sandbox/sandbox-types.ts` | 题目字段、JSON 类型与当前资源限额 |
| `config/.vitepress/theme/components/sandbox/algorithm-puzzles.ts` | 已有题目、definePuzzle 校验和 PUZZLES 注册表 |
| `config/.vitepress/theme/components/sandbox/algorithm-judges.ts` | 现有判题策略；只读必要部分 |
| `docs/algorithm/index.md`、一个相近的题目页 | 文章结构和专题入口 |
| `config/.vitepress/config.mts` | 文档根、base 和算法 sidebar |
| `.devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs` | PUZZLE_CHECKS 和现有浏览器断言 |
| `.devin/skills/vitepress-interactive-writing/scripts/verify-sandbox.mjs` | 自动遍历注册题的纯逻辑与 Worker 模块测试 |

先用简短列表说明拟新增题目、契约、受影响文件与验证方式，再实施。改动前运行基线 `npm run docs:build`；如处于 Plan 模式，只做允许的调研，将构建和写入安排在批准之后。

题意不明确时，一次性询问影响正确性的规则，而不是自行猜测。例如：

- 字符串是否忽略大小写、空格或标点？字符范围是 ASCII、Unicode 码点还是 UTF-16 代码单元？
- 空输入、无解、重复值如何处理？需要返回值还是下标？
- 多个答案是否都可接受？数组结果的顺序是否重要？
- 是否允许修改参数副本？数值范围是否符合 JavaScript 的精度与当前沙盒限制？

不影响正确性的选项使用上述默认值并说明；超出现有同步 JSON 契约、需要新依赖或执行模型时，先说明差异并确认，不静默扩大范围。

## 2. Review：确定判题与用例

- 默认选 `json-equal`：类型和值相同，数组顺序敏感，对象键顺序不敏感，不把数字字符串强转为数字。
- 允许多个等价答案时，先查现有策略；确有必要才在受信任 `JUDGES` 表新增判题函数。不要通过排序所有结果、去重或复制两数之和的判断来掩盖语义差异。
- 判题函数只接收执行器形成的有界 JSON 快照与可信用例，不接收或执行读者提供的判题函数，不把期望值或判题能力交给用户 Compartment。
- 设计正常、边界及典型错误用例；按题意覆盖空输入、单元素、负数、重复值、零、未找到等适用情形，不机械加入违背输入前提的用例。
- 独立核对期望值，不能仅运行同一份待验证解法来生成所有答案。固定用例通过不是一般正确性证明。
- 读取当前大小、数量、深度和时长常量；不要为了放入大用例而放宽限额。优先使用小而有区分度的测试。

## 3. Act：配置、写作与接入

### 题目配置

在现有 `algorithm-puzzles.ts` 中调用 `definePuzzle`，随后加入 `PUZZLES`。

| 字段 | 要求 |
| --- | --- |
| `id` | 唯一、稳定的英文短名；与注册表键和页面文件名一致，避免原型相关保留属性名 |
| `title` | 中文题名 |
| `entryPoint` | 合法、非关键字的 JavaScript 函数标识符，与源码一致 |
| `parameterNames` | 不重复的参数名，顺序与调用一致 |
| `judge` | 受信任 JUDGES 表已有或必要新增的策略 ID |
| `expectedHint` | 简短说明答案形式与允许的等价结果，不写死其他题的规则 |
| `failureMessage` | 非空、可操作的判错提示，满足当前错误文本预算 |
| `initialCode` | 同步函数源码，能通过全部固定用例，不留下 TODO 或占位返回值 |
| `tests` | 每例包含唯一 `id`、可读 `label`、`args`、`expected` |

`args` 是参数列表，不是单个参数本身：一个数组参数应写成 `args: [[1, 2, 3]]`；数组加目标值才是 `args: [[1, 2, 3], 4]`。参数数量必须与 `parameterNames` 一致。参数和期望使用无循环的普通 JSON 数据，不含非有限数值、BigInt、函数、访问器或数组空位。

沿用 `definePuzzle` 的校验和冻结，不修改冻结数据。`PuzzleId`、`JudgeId` 从注册表推导，不手动维护重复的 ID 列表。普通新题无需改 `AlgorithmSandbox.vue`、`algorithm-runner.worker.ts` 或 `sandbox-output.ts`。

### 教程正文

保存到 `docs/algorithm/<id>.md`，遵循共享写作规范：

1. frontmatter 包含 title、实际日期、tags、description；日期按用户指定或当前环境核实。
2. 用一个问题开篇，声明环境与边界；一个核心比喻对应 3–4 个技术概念，不替代正式定义。
3. 明确题意、函数签名、输入前提、返回类型和边界；样例表与注册用例一致。
4. 给出正确初始解法，在讲解位置嵌入现有沙盒，组织“操作 → 观察 → 原理”。
5. 设计少量有目的的错误实验，引导读者解释结果；给出不变量、终止性或其他合适的正确性依据。
6. 推导时间与空间复杂度，说明前提，不用页面耗时冒充性能基准。
7. 提供练习、验收和相关章节链接，不堆叠无教学价值的交互。

按当前目录深度从 `../../config/.vitepress/theme/components/sandbox` 命名导入 `AlgorithmSandbox`。组件必需 `id`（页内唯一）和 `puzzleId`；模板使用 `puzzle-id`，整个交互包裹在 `<ClientOnly>` 内。正文和限制说明保留 SSR，不在 Markdown 顶层访问浏览器 API。不复制编辑器、执行器或其 CSS。

明确不支持 Node.js、npm/import、用户代码网络/文件系统/DOM/IndexedDB、其他语言和真实 Linux；保留没有内存硬配额、不是安全多租户服务器的说明。不添加自动执行、远端代码载入、草稿存储或遥测。

### 入口与测试

- 更新 `docs/algorithm/index.md` 与 `config/.vitepress/config.mts` 的算法 sidebar；配置路径不含 `/myBlog/`。已有专题入口时，不重复修改首页或文章分类。
- 在现有浏览器脚本 `PUZZLE_CHECKS` 添加新题的 `id`、`entryPoint`、按顺序排列的 `caseIds` 和对应 `expected`。字段以实际源码为准；不要只注册页面却跳过未知页面的失败断言。
- 保留原题专项与通用安全测试，补充本题非法返回、边界和适用的切题验证；不要复制整套浏览器启动代码或新建测试框架。
- 纯逻辑脚本自动遍历所有注册题的初始代码和共用错误场景；新判题策略需增加针对性断言。

## 4. Review：验证与交付

在仓库根、Node.js 22.19+ 的 PowerShell 中执行：

```powershell
node --experimental-strip-types .devin/skills/vitepress-interactive-writing/scripts/verify-sandbox.mjs
npm run docs:build
git diff --check
```

每个有限命令确认成功后再进入下一步；失败先定位，不以之后的成功掩盖之前的失败。构建和类型擦除执行不等于独立类型检查。

启动预览，再在另一终端顺序运行两个浏览器分支：

```powershell
npm run docs:preview -- --host 127.0.0.1 --port 4173
```

```powershell
node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs http://127.0.0.1:4173/myBlog/ algorithm
node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs http://127.0.0.1:4173/myBlog/ linux
```

端口被占用时不终止陌生服务，可选空闲端口并统一替换验证地址。重建前停止自己启动的预览，重建后重启。浏览器脚本只使用独立临时配置；不要操作日常浏览器配置。

验收至少包括：新题与旧题初始代码、错误答案/错误类型、语法与运行错误、空白/超长代码、停止/重置/超时、输出与隔离回归；标量 `0`/`false`/`null`/空字符串等适用输出正确展示；跨题不串状态；部署前缀、入口、320/375px、键盘焦点和明暗配色；首页、Linux 与已有文章回归。Node 适配测试不能代替浏览器验证。

自审所有新增文件和已跟踪差异，检查正确性、安全性、可访问性、SSR 和维护性。偶发 CDP 超时或其他失败记录实情，复跑通过不等于已定位其根因。未实测的浏览器、真机、屏幕阅读器或性能项明确列出；不另外创建过程文档或评审报告文件。

最终简要报告入口、题目契约与用例、修改范围、执行过的验证结果、未验证项及 Git 状态。除非本次另有明确授权，不提交、不推送，不顺便修改其他题目或项目配置。
