---
title: Linux 从入门到高级：开好你的数字餐厅
date: 2026-09-08
tags: [Linux, 入门, 互动课程]
description: 以餐厅运营理解 Linux，建立安全实验环境，沿命令行、系统管理、自动化与证据排障逐步进阶。
---

<script setup>
import { computed, ref } from 'vue'
import { LearningTabs, LearningSlider, LearningCounter, LearningFlipCard } from '../../config/.vitepress/theme/components/learning'

const environment = ref('wsl')
const environmentOptions = [{ value: 'wsl', label: 'WSL 2 实验台' }, { value: 'vm', label: '完整虚拟机' }]
const MIN_SESSION_MINUTES = 15
const MAX_SESSION_MINUTES = 60
const SESSION_STEP_MINUTES = 5
const SESSION_COUNT = 12
const MINUTES_PER_HOUR = 60
const sessionMinutes = ref(30)
const plannedHours = computed(() => sessionMinutes.value * SESSION_COUNT / MINUTES_PER_HOUR)
</script>

# Linux 从入门到高级：开好你的数字餐厅

餐厅迟迟不出菜，你会先加厨师，还是先看订单卡在哪一步？Linux 也一样：会敲命令只是会拿厨具，能解释证据、控制影响、验证恢复，才算能值班。

> **环境与安全**：页面交互复用本站 Vue 教学组件，无需额外安装 UI 库；演示使用 `ClientOnly`，正文由 VitePress 预渲染。复制页面到其他项目时，需要同时接入组件索引及其实现。本课程以 Ubuntu 24.04 LTS、Bash、普通用户为基线。标为 `powershell` 的命令只在 Windows PowerShell 使用，标为 `bash` 的命令只在 Linux 实验终端使用。WSL 安装会修改实验机并可能要求重启；以下仅供你决定后自行操作，课程作者未执行安装或实测 Linux 命令。不要把练习粘贴到生产服务器。

> - 点单员 → Shell：解释输入并组织程序。
> - 后厨调度 → 内核：管理进程、内存、设备与网络。
> - 仓库与门禁 → 文件系统与权限：决定数据位置和访问边界。
> - 值班记录与标准流程 → 日志与自动化：让操作可追踪、可重现。

## 先修与验收：先领工牌，再进后厨

先修：你能打开终端、识别文件路径，并愿意在实验环境中练习；不需要 Linux 经验。
完成本页后，你应能：区分宿主机与来宾机、确认发行版及 Shell、判断 systemd 是否可用，并为每章建立独立工作区。
比喻有边界：内核不是能理解业务的店长；它只按机制与策略分配资源。

## 一、选择你的实验厨房

<ClientOnly>
  <LearningTabs id="linux-index-environment" v-model="environment" label="实验环境比较" :options="environmentOptions">
    <template #wsl><p>WSL 2 适合在 Windows 里学习 Bash 与文件操作。把练习放在 Linux 家目录或临时目录；Windows 挂载盘的权限语义和性能可能不同。WSL 的启动、网络和后台存活不等于服务器。</p></template>
    <template #vm><p>完整 Ubuntu 虚拟机更适合 systemd、启动流程与网络隔离实验。选择 NAT 网络，先做快照；虚拟硬件也不等于真实生产硬件。安装与资源分配由你在实验机上确认。</p></template>
  </LearningTabs>
</ClientOnly>

### Windows PowerShell：先检查，再决定安装

先在 Windows PowerShell 查询现状；没有 WSL 或版本较旧时，部分查询可能报错，记录错误而不是重复安装。

```powershell
wsl --status
wsl --list --verbose
wsl --list --online
```

若实验机未安装目标发行版，确认在线列表中确有 `Ubuntu-24.04` 后，才在获授权的管理员 PowerShell 中运行下面一条。它需要网络、虚拟化支持与磁盘空间，可能重启；受管设备应先咨询管理员。

```powershell
wsl --install -d Ubuntu-24.04
```

按终端提示创建 Linux 普通用户与密码；密码输入不回显是正常现象。重启或首次初始化完成后，从开始菜单打开 Ubuntu，或按已安装列表中的名称进入：

```powershell
wsl -d Ubuntu-24.04
```

### Linux Bash：确认自己站在哪个厨房

```bash
cat /etc/os-release
uname -r
printf 'Bash version: %s\n' "$BASH_VERSION"
id
pwd
ps -p 1 -o comm=
```

预期：发行版信息显示 Ubuntu 24.04，Bash 版本非空，`id` 显示普通用户而不是 root。`uname` 显示内核版本，不是发行版版本；WSL 内核名称通常带有 WSL 标识，具体输出由环境决定。
若 PID 1 是 `systemd`，可以继续验证 `systemctl is-system-running`；返回 `degraded` 也需查明失败单元，不等于命令不可用。不是 systemd 时，跳过后续 systemd 实操，不在本课程中修改启动配置。
WSL 新版本支持 systemd，但是否启用取决于版本和发行版配置；发行版停止、Windows 休眠时，计划任务不能被假定持续运行。VM 内也要实际检查 PID 1；容器更不能默认存在完整服务管理器。

### 发行版不是同一套菜单

| 环境 | 常见工具与差异 | 本课程处理方式 |
| --- | --- | --- |
| Ubuntu / Debian | apt、dpkg，Ubuntu 常见 systemd | 以 Ubuntu 24.04 输出语义为基线 |
| Fedora / RHEL 系 | dnf、rpm，安全策略可能有 SELinux | 不照抄 apt 命令，查本机手册 |
| Alpine | apk，常见 BusyBox、OpenRC、ash | Bash 与 GNU 选项可能缺失，换基线环境练习 |
| macOS / Git Bash | 不是本课程的 Linux 用户空间 | 不拿它们的差异当作 Linux 故障 |

## 二、安全工作区与操作习惯

每章都重新创建工作区，不依赖上一章的变量。下面只在 Linux Bash 执行；若创建失败就停止，不在未知目录继续。

```bash
lab=$(mktemp -d "${TMPDIR:-/tmp}/linux-start.XXXXXX")
if [ -n "$lab" ] && [ -d "$lab" ]; then
  printf '实验目录：%s\n' "$lab"
  cd -- "$lab"
else
  printf '无法创建实验目录，请停止练习\n' >&2
fi
```

临时目录可能在重启后被系统清理，不能当永久备份。课程不提供批量删除命令；练习结束后可保留路径，确认内容后用文件管理器逐项清理。命令提示符不是命令的一部分，不复制示例输出回终端。

## 三、课程路线与时间预算

| 章节 | 你要解决的问题 | 验收产物 |
| --- | --- | --- |
| [命令行基础](./basics) | 订单如何变成可靠的文本处理流水线？ | 隔离工作区和可解释的汇总结果 |
| [系统管理](./administration) | 谁能进仓库，哪个服务正在忙？ | 权限解释与只读巡检记录 |
| [自动化](./automation) | 如何让交接班脚本失败得清楚、恢复得安全？ | 可运行脚本与新目录恢复校验 |
| [高级排障](./advanced) | 慢在哪里，有什么证据可以排除猜测？ | 带时间、边界和反证的排障报告 |

拖动每次练习时长，观察总预算。**教学规划模型**：固定 12 次练习，总小时数 = 每次分钟数 × 12 ÷ 60；不包含环境安装、复习与排错时间，不代表完成课程的保证。

<ClientOnly>
  <LearningSlider v-model="sessionMinutes" label="每次练习预算" :min="MIN_SESSION_MINUTES" :max="MAX_SESSION_MINUTES" :step="SESSION_STEP_MINUTES" unit=" 分钟" />
  <LearningCounter label="12 次练习的总预算" :value="plannedHours" unit=" 小时" :decimals="1" />
  <LearningFlipCard question="在 PowerShell 中看到命令不存在，是否应该立刻安装同名工具？" answer="先确认终端边界。Bash 命令应进入 Ubuntu 再执行；只有在正确环境中确认依赖缺失，才考虑在实验机安装。" />
</ClientOnly>

操作滑块到 30 分钟，稳定后应显示 6.0 小时；到 60 分钟应显示 12.0 小时。联动来自同一状态的计算，不会测量你的机器或学习速度。

## 四、入场练习与答案

写下当前终端、发行版、用户、PID 1，以及准备跳过哪些不支持的实验。若 `uname -r` 能运行，是否就证明发行版是 Ubuntu？

<details>
<summary>查看验收答案</summary>
<p>不能。uname 识别内核，发行版需看 /etc/os-release。普通用户身份看 id；systemd 支持看 PID 1 并检查服务管理器。合格记录应标明 WSL 或 VM、Ubuntu 版本、Bash 可用性，以及 systemd 不可用时跳过服务与定时器实操的决定。</p>
</details>

## 总结与下一章

你已经选好厨房、确认工牌和隔离区。接下来进入[命令行基础](./basics)，把一张订单安全地处理成一份可核对的报表；已有经验也请先完成环境验收，再去[高级排障](./advanced)。
