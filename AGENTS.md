# 项目执行约定

- 使用简体中文沟通；终端为 Windows PowerShell。教程中的 Linux Bash 命令不在宿主机执行。
- 文档源目录为 `docs`，VitePress 配置为 `config/.vitepress/config.mts`，站点 base 为 `/myBlog/`。
- 在仓库根目录运行 `npm run docs:build` 验证客户端、SSR 和站内死链。开发命令为 `npm run docs:dev`；构建预览为 `npm run docs:preview -- --host 127.0.0.1 --port 4173`，浏览器访问 `/myBlog/`。
- 首页内容导览由 `config/.vitepress/theme/components/feature-gallery.vue` 提供；Vue 链接使用 `withBase`。导航和侧边栏配置使用不含 base 的站内路径。
- 最新文章使用 Git 提交日期排序，不保证未提交内容显示于首页前三条；新增专题必须提供稳定入口。
- 互动教程遵循 `.devin/skills/vitepress-interactive-writing/SKILL.md` 中的发布 SOP：每页 ≥2 处交互且至少一处为完整「操作 → 观察 → 原理」链路，页内自定义演示与共享组件平级选型，不为凑数堆砌。学习组件索引为 `config/.vitepress/theme/components/learning/index.ts`，算法沙盒使用同级 `sandbox/index.ts`，只按需读取组件接口。新增 Learning 组件先运行 `node .devin/skills/vitepress-interactive-writing/scripts/new-component.mjs <LearningXxx>` 脚手架完成接线（组件、导出、参考页、侧边栏、接口表），再实现与填文档；组件参考文档在 `docs/notes/learning-components/`。
- 不依赖 node_modules 中未在 package.json 声明的 extraneous 包，不为简单交互引入新的 UI 库。
- 新增或修改教程页后先运行 `node .devin/skills/vitepress-interactive-writing/scripts/verify-article.mjs --changed` 静态校验 frontmatter、交互形态下限与导入有效性（`--all` 为全量）；FAIL 必须修复，WARN 逐条确认。
- 互动教程冒烟测试用 Node.js 22+ 运行 `node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs --serve linux`，脚本自起并关闭 `docs:preview`；预览已在运行时省略 `--serve`，改传预览地址与专题短名（如 `http://127.0.0.1:4173/myBlog/ linux`）。浏览器依次尝试 `BROWSER_PATH` 与 Edge/Chrome 常见安装位置。通用分支按页面实际存在的 Learning 组件运行探针，不要求集齐全部组件；脚本创建并清理独立临时浏览器配置，不操作日常浏览器配置。
- 算法题配置在 `config/.vitepress/theme/components/sandbox/algorithm-puzzles.ts` 的 `PUZZLES` 注册，普通 JSON 判题无需修改 UI 或 Worker；特殊语义在 `algorithm-judges.ts` 的受信任 `JUDGES` 表扩展。新增题同时补充教程、侧边栏及浏览器脚本的 `PUZZLE_CHECKS`，不要复制整套沙盒。
- 使用 Node.js 22.19+ 运行 `node --experimental-strip-types .devin/skills/vitepress-interactive-writing/scripts/verify-sandbox.mjs` 验证 JSON、题库及 Worker 模块；预览后另运行上述 `verify-site.mjs` 的 `algorithm` 分支，仍需回归 `linux` 分支。Node 适配测试不能替代浏览器验证，类型擦除不等于类型检查。
- 当前未配置独立 lint、typecheck 命令；构建不能代替交互、可访问性和教程命令验证。代码审阅后运行 `git diff --check`，并检查所有新增文件。
