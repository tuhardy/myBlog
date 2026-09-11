---
title: LearningTerminal · 预录命令终端
date: 2026-09-12
tags: [VitePress, 组件库]
description: LearningTerminal 组件参考：预录命令序列的播放演示与模拟敲击练习、接口与适用边界。
---

<script setup>
import { LearningTerminal } from '../../../config/.vitepress/theme/components/learning'

const slowLogScript = [
  { cmd: "SET GLOBAL slow_query_log = 'ON';", out: 'Query OK, 0 rows affected (0.00 sec)' },
  { cmd: 'SET GLOBAL long_query_time = 1;', out: 'Query OK, 0 rows affected (0.00 sec)' },
  { cmd: "SHOW VARIABLES LIKE 'slow_query_log_file';", out: '+---------------------+--------------------------+\n| Variable_name       | Value                    |\n+---------------------+--------------------------+\n| slow_query_log_file | /var/lib/mysql/slow.log  |\n+---------------------+--------------------------+' },
  { cmd: "EXPLAIN SELECT * FROM orders WHERE status = 'paid';", out: 'type=ALL   key=NULL   rows=4800000   Extra=Using where' },
]
</script>

# LearningTerminal · 预录命令终端

**何时用**：教学内容是一串「命令 → 输出」序列，读者需要先看清每条命令做了什么、再亲手敲一遍加深记忆。它不真的执行任何命令——所有输出都是作者预录的文本，适合 bash、SQL、redis-cli 等任意 CLI 场景。

**演示**：

<ClientOnly>
  <LearningTerminal id="demo-slow-log" label="开启 MySQL 慢查询日志" :script="slowLogScript" prompt="mysql>" />
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 页内唯一，用作输入框 id 前缀 |
| label | string | 是 | 终端标题与可访问名称 |
| script | `{ cmd: string; out?: string }[]` | 是 | 预录剧本；每项渲染为一条命令行 + 可选输出块，至少一条 |
| prompt | string | 否 | 提示符，默认 `'$'`；SQL 场景可用 `'mysql>'` |

**调用**：

```vue
<LearningTerminal id="my-term" label="慢日志演练" :script="script" prompt="mysql>" />
```

**边界**：内部管理全部状态，无 v-model；演示模式提供上一条/下一条/重播，动手敲模式按顺序比对命令——归一化后逐字比对：大小写、首尾与连续空白、`=(),` 两侧空格、末尾分号、单双引号差异都不影响命中，其余字符必须一致；两次未命中给出期望命令并可一键填入。两种模式共享同一份进度，切换不清空已显示内容。输出区 `role="log"` + `aria-live` 自动播报新行，根节点 `data-mode` 暴露当前模式（play/type）。终端只做教学演练，不替代真实实验环境——读者仍应在受控环境里亲手验证命令。
