# 项目执行约定

- 使用简体中文沟通；终端为 Windows PowerShell。教程中的 Linux Bash 命令不在宿主机执行。
- 文档源目录为 `docs`，VitePress 配置为 `config/.vitepress/config.mts`，站点 base 为 `/myBlog/`。
- 在仓库根目录运行 `npm run docs:build` 验证客户端、SSR 和站内死链。开发命令为 `npm run docs:dev`；构建预览为 `npm run docs:preview -- --host 127.0.0.1 --port 4173`，浏览器访问 `/myBlog/`。
- 首页内容导览由 `config/.vitepress/theme/components/feature-gallery.vue` 提供；Vue 链接使用 `withBase`。导航和侧边栏配置使用不含 base 的站内路径。
- 最新文章使用 Git 提交日期排序，不保证未提交内容显示于首页前三条；新增专题必须提供稳定入口。
- 互动教程遵循 `.devin/skills/vitepress-interactive-writing/SKILL.md` 中的发布 SOP。真实组件导出索引为 `config/.vitepress/theme/components/learning/index.ts`，只按需读取组件接口。
- 不依赖 node_modules 中未在 package.json 声明的 extraneous 包，不为简单交互引入新的 UI 库。
- 预览服务启动后，使用 Node.js 22+ 运行 `node .devin/skills/vitepress-interactive-writing/scripts/verify-site.mjs http://127.0.0.1:4173/myBlog/ linux` 做互动教程冒烟测试。默认启动本机 Edge；可用 `BROWSER_PATH` 指定 Chromium 系浏览器。脚本创建并清理独立临时浏览器配置，不操作日常浏览器配置。
- 当前未配置独立 lint、typecheck 或单元测试脚本；构建不能代替交互、可访问性和教程命令验证。代码审阅后运行 `git diff --check`，并检查所有新增文件。
