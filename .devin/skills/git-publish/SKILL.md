---
name: git-publish
description: 安全执行 Git 提交与推送流程：检查变更、验证项目、生成规范提交、提交到当前分支，并在用户明确要求时推送到已配置远端。
argument-hint: "[提交说明] [--push]"
---

# Git 提交与推送

## 目标与边界
在当前 Git 仓库中安全完成“检查 → 验证 → 提交 → 可选推送 → 复核”。默认只提交，不推送；只有用户在当前请求中明确要求 push/推送时，才执行推送。

不得执行以下操作：
- `git push --force`、`--force-with-lease`、改写历史、删除远端分支或删除本地分支。
- `git reset --hard`、覆盖式 checkout/restore、清空工作区、删除用户文件。
- 修改 Git 配置、绕过提交钩子、提交密钥、凭据、`.env` 或其他敏感文件。
- 在用户未指定范围时，把无关的已有修改、生成物或依赖目录带入提交。

遇到身份认证、权限、保护分支、合并冲突或远端拒绝时停止并报告，不猜测凭据，也不要求用户把密码或令牌粘贴到对话中。

## 输入
可选输入：
- 提交说明：用户明确提供时优先使用；否则根据变更目的拟定简短说明。
- `--push`：表示用户明确授权本次推送。
- 文件范围：用户指定时只处理该范围；未指定时先展示变更并确认范围是否合理。

提交说明聚焦“为什么”，使用项目现有语言和风格。默认提交正文格式：

```text
<中文或项目惯用语言的原因说明>

Generated with [Devin](https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
```

如果项目已有提交模板或贡献规范，优先遵循项目规范；不要重复添加冲突的签名。

## SOP：Plan → Review → Act → Review

### 1. Plan：确定范围
在仓库根目录执行以下只读检查：

```powershell
git status --short
git branch --show-current
git log -5 --oneline --decorate
git remote -v
```

并检查：
- 当前分支是否正确；
- 是否存在用户未要求处理的修改；
- 是否存在未跟踪文件；
- 是否有合并冲突标记；
- 远端名称、URL 和 upstream 是否符合预期。

如果工作区有现有修改，先区分“本次任务变更”和“用户已有变更”，不覆盖、不自动清理已有内容。

### 2. Review：审阅变更与验证
先查看差异，已跟踪文件使用：

```powershell
git diff --stat
git diff
```

新文件不能只依赖 `git diff`，应使用 `git status --short`、文件读取和暂存后的 `git diff --cached` 一起检查。确认：
- 没有密钥、令牌、私钥、密码、`.env`、个人数据或大体积生成物；
- 代码、文档和配置符合项目约定；
- 文件范围与提交目的匹配；
- 没有把 `node_modules`、构建目录、缓存和日志纳入提交；
- `git diff --check` 无空白错误。

按项目实际规范执行验证。例如 VitePress 项目通常运行：

```powershell
npm run docs:build
git diff --check
```

没有可用验证脚本时，明确记录未验证项，不把“没有脚本”当成测试通过。

### 3. Act：显式暂存并提交
不要使用 `git add .` 或 `git add -A` 盲目收集变更。使用已审阅的明确路径：

```powershell
git add -- <已确认的文件或目录>
git diff --cached --stat
git diff --cached
```

再次确认暂存区没有敏感信息、无关文件或误删除后，用项目约定的提交格式提交：

```powershell
$message = @"
<提交原因>

Generated with [Devin](https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
"@
git commit -m $message
```

如果没有实际变更，不创建空提交。如果提交钩子修改了文件，重新检查差异，确认变更合理后重新暂存并提交；不要绕过钩子。

### 4. Push：仅在明确授权时执行
如果用户没有明确要求推送，到此停止，并报告提交哈希与未推送状态。

用户明确要求推送时，先复核：

```powershell
git status --short
git branch --show-current
git branch -vv
git remote -v
git log -1 --oneline
```

确认当前分支、远端和 upstream 后，优先推送当前分支并设置 upstream（仅当确实没有 upstream）：

```powershell
git push
```

首次发布且分支没有 upstream 时，使用明确的远端和分支：

```powershell
git push -u <remote> <branch>
```

禁止自行选择新远端、修改远端地址、强制推送或推送到不明确的分支。推送失败时保留本地提交，报告失败原因和用户可执行的后续操作。

### 5. Review：最终复核
提交后执行：

```powershell
git status --short
git log -1 --oneline --decorate
```

若已推送，再执行：

```powershell
git branch -vv
git ls-remote --heads <remote> <branch>
```

最终报告包括：
- 提交哈希和提交说明；
- 实际提交文件范围；
- 验证命令及结果；
- 是否已推送、远端和分支；
- 未验证项、认证问题或后续风险。

不声称“已推送”除非 `git push` 成功返回；不声称构建或测试通过除非实际执行并成功。

## 常见异常处理

| 情况 | 处理 |
|---|---|
| 工作区有用户已有修改 | 保留原样，只暂存本次明确范围 |
| 发现敏感文件 | 从提交范围移除并提醒用户检查；不读取或打印秘密内容 |
| 当前不是预期分支 | 停止并询问，不自动切换分支 |
| 没有 upstream | 用户授权推送后，用明确 remote/branch 设置 upstream |
| 远端拒绝或认证失败 | 停止，保留本地提交，说明原因；不索要凭据 |
| 提交钩子失败 | 阅读错误、修正代码或请用户处理，不跳过钩子 |
| 有合并冲突 | 停止，不自动选择冲突版本，不重写历史 |
| 没有变更 | 报告无需提交，不创建空提交 |

## 项目适配
本 Skill 不假设远端名称、默认分支、包管理器或验证命令。先读取项目 `AGENTS.md`、贡献文档和 `package.json`，再替换示例命令。Windows 环境使用 PowerShell 语法；如果项目脚本内部运行 Bash，明确说明由 npm 脚本负责，不在 PowerShell 中混用 Bash heredoc。
