---
title: Linux 高级排障：先取证，再决定改什么
date: 2026-09-08
tags: [Linux, 性能排障, 容器, 可观测性]
description: 区分 load 与 CPU，结合内存、I/O、文件描述符和网络证据，理解容器边界及诊断工具的权限与开销。
---

<script setup>
import { computed, ref } from 'vue'
import { LearningTabs, LearningSlider, LearningCounter, LearningFlipCard } from '../../config/.vitepress/theme/components/learning'

const bottleneck = ref('cpu')
const bottleneckOptions = [{ value: 'cpu', label: '计算候选' }, { value: 'io', label: 'I/O 候选' }, { value: 'memory', label: '内存候选' }]
const LOGICAL_CPU_SLOTS = 4
const MIN_RUNNABLE_TASKS = 0
const MAX_RUNNABLE_TASKS = 16
const runnableTasks = ref(6)
const waitingLowerBound = computed(() => Math.max(0, runnableTasks.value - LOGICAL_CPU_SLOTS))
</script>

# Linux 高级排障：先取证，再决定改什么

订单堆了十张，就一定是厨师不够吗？也可能是所有厨师都在等冷库开门。把 load 当 CPU 使用率、把缓存当内存泄漏，就像只看排队人数便决定扩建餐厅。

> **环境与安全**：先完成[自动化](./automation)。本页只在获授权的 Ubuntu 24.04 LTS Linux 实验环境执行短时、只读诊断，以及隔离目录内的小文件实验。iostat、strace、perf 可能未安装或被权限策略限制；遇到限制就记录，不提升权限绕过。WSL、VM 和容器的计数边界不同，所有结论必须注明环境，不能据此直接调整生产参数。

> - 等单队列与忙碌厨师 → load 与 CPU：排队和执行是不同证据。
> - 备菜台与冷库 → 内存缓存、swap 与磁盘 I/O：资源会相互影响。
> - 分租厨房 → namespace 与 cgroup：视图隔离不等于独占资源。
> - 值班侦查 → 采样、跟踪与验证：用证据缩小原因，而非猜测调参。

## 先修与验收标准

先修：能读进程、日志、磁盘与网络输出，了解脚本退出码和恢复边界。
验收：解释 load 不等于 CPU 百分比；区分 free 与 available；证明“文件名消失但内容仍被打开”；识别容器资源限制的来源；写出基于本机实际读数、含反证和后续验证的排障记录。
本章不人为制造高负载，不写大文件填盘，不压测未知服务。安静系统的读数同样有价值：它告诉你“当前未复现”，而不是证明历史问题不存在。

## 一、load 与 CPU：排队数不是忙碌百分比

Linux 的 load average 通常是对可运行任务与不可中断睡眠任务数量的时间平滑值，显示 1、5、15 分钟窗口，不能简单理解为最近一分钟计数的算术平均。
CPU 使用率描述采样区间内 CPU 时间分配；任务在等待 I/O 时，load 可能较高而 CPU 并未满。D 状态常与 I/O 等待相关，但不是所有 D 状态都能直接归因于某块磁盘。

```bash
date -Is
uptime
nproc
lscpu
ps -eo pid,stat,comm --sort=pid | head -n 16
```

`nproc` 给出当前进程可用的处理单元数量，受工具版本、亲和性及环境影响，不能单独证明容器 CPU 配额；`lscpu` 可能显示比容器实际可用更多的拓扑信息。
不要套用“load 大于 1 就异常”。需要关联可用 CPU、任务类型、配额、时间趋势和业务延迟；同一 load 在单核机器与多核机器含义不同。

### 操作 → 观察 → 原理：四个灶位能同时接几张单？

**离散瞬时模型**：假设有 4 个等价逻辑 CPU 槽位，N 个互相独立、可立即运行的单线程任务（包含正在运行的任务），无 I/O、配额、优先级、亲和性与调度开销。至少等待的任务数 = max(0, N − 4)。这不是 Linux load 计算公式，也不是耗时预测。

<ClientOnly>
  <LearningSlider v-model="runnableTasks" label="模拟可运行任务总数" :min="MIN_RUNNABLE_TASKS" :max="MAX_RUNNABLE_TASKS" unit=" 个" />
  <LearningCounter label="瞬时至少等待 CPU 的任务" :value="waitingLowerBound" unit=" 个" />
  <LearningTabs id="linux-advanced-bottlenecks" v-model="bottleneck" label="把猜测变成证据需求" :options="bottleneckOptions">
    <template #cpu><p>计算候选：业务慢的同一时段，CPU 用户态或内核态时间持续高，可运行队列持续积压。还要检查容器节流与线程分布，不能仅凭一次进程排行。</p></template>
    <template #io><p>I/O 候选：任务阻塞、设备等待和业务文件访问同时出现。关联 vmstat、iostat 与日志；wa 高不是设备损坏证明，单个设备利用率也不是通用饱和阈值。</p></template>
    <template #memory><p>内存候选：available 持续下降、回收或换页活动、业务延迟同时变化。缓存多本身通常正常；需要趋势和相关事件，不能只盯 free 一列。</p></template>
  </LearningTabs>
  <LearningFlipCard question="load 高而 CPU 不忙，是否应该立刻增加 CPU？" answer="不能。先区分可运行排队与不可中断等待，检查 I/O、配额和业务时间线。只有确认 CPU 资源是主要限制且扩容能改变该限制，增加 CPU 才是有证据支持的候选方案。" />
</ClientOnly>

把 N 设为 2、4、6，数字应依次为 0、0、2。真实调度会时间片轮转；即使模型显示等待，也不能直接推导响应时间或实际吞吐量。

## 二、联合读取 vmstat、iostat 与 free

```bash
free -h
vmstat 1 5
```

`free` 中 free 是完全空闲内存，available 是对无需大量换页即可供新应用使用内存的估计。文件缓存可以加速访问，其中一部分可回收；缓存大不自动等于泄漏，可回收也不代表回收完全没有代价。
`vmstat 1 5` 通常先给出自启动以来的平均统计，再给出间隔 1 秒的采样；分析近期问题优先看后续行。短采样只描述这一小段时间，未必捕捉偶发尖峰。

| 字段 | 先理解什么 | 不要直接推出什么 |
| --- | --- | --- |
| r / b | 可运行任务 / 阻塞任务数量 | r 一次大于 CPU 数不等于持续饱和 |
| si / so | 每秒从 swap 换入 / 换出量，注意本机单位 | swap 已用非零不等于当前正在猛烈换页 |
| bi / bo | 块设备输入 / 输出速率 | 聚合值不能直接定位单个文件 |
| us / sy / id | 用户态 / 内核态 / 空闲 CPU 时间百分比 | sy 高不自动等于内核缺陷 |
| wa / st | I/O 等待相关时间 / 虚拟机被宿主抢占时间 | wa 不直接等于某程序等盘时间 |

swap 把部分匿名页迁移到交换空间，并不是“免费扩大物理内存”。持续换入换出与延迟上升同时发生才更值得追查；不要为了让数字变小而关闭 swap 或清空缓存。
若 `iostat` 已存在，运行短采样；它通常由 sysstat 包提供，缺失时可回到[包管理说明](./administration)评估安装，不在生产临时安装工具。

```bash
if command -v iostat > /dev/null 2>&1; then
  iostat -xz -y 1 3
else
  printf 'iostat 不可用，本次缺少设备级采样证据\n'
fi
```

`-y` 跳过第一份自启动统计；关注实际设备的读写速率、await、队列与 `%util`，并核对单位。await 包含排队与处理时间；NVMe、多队列设备或存储阵列不能把 100% util 当作统一的性能上限。
WSL 虚拟块设备与 Windows 物理盘之间隔着多层；VM 的宿主争用也可能影响来宾。采到虚拟设备忙，只能定位到这层，不代表已经证明底层硬件故障。

## 三、资源排障流程：先时间线，后假设

1. **界定影响**：是一个请求、一个进程、一个容器，还是整台机器？记录起止时间、时区、错误和业务目标。
2. **确认边界**：内核、发行版、虚拟化、CPU 配额、挂载与网络命名空间；确认你观察的是故障发生处。
3. **取短基线**：同时看 CPU、内存、I/O 与业务证据，避免用不同时间的读数拼出假相关。
4. **缩小候选**：只在证据支持时针对一个进程、设备或连接增加采样，记录权限和工具开销。
5. **提出可证伪动作**：每个候选写出支持证据、反证、下一步验证，以及预期如何改变结果。
6. **实验与回看**：有授权、回滚和验收标准后才在隔离环境改变一个因素；结果不符合预期就撤回假设。

“重启后好了”可能暂时缓解，也可能抹去故障状态；它不能独立解释根因。优先保留时间线和有限必要证据，避免为了观察而把日志磁盘写满。

## 四、容器边界：分租厨房不是独立大楼

namespace 隔离进程号、挂载、网络等视图；cgroup 组织和限制资源。容器通常共享宿主内核，不等同于完整虚拟机，也不能单靠 namespace 视为绝对安全边界。

```bash
cat /proc/self/cgroup
readlink /proc/$$/ns/pid
readlink /proc/$$/ns/mnt
readlink /proc/$$/ns/net
findmnt -t cgroup2
```

预期得到本进程 cgroup 路径和命名空间标识，具体数字不固定。标识相同可帮助判断是否共享某个命名空间，但单次输出不能独立证明“这是容器”；应结合已知运行方式和管理平台信息。
cgroup v2 常通过 `cpu.max`、`cpu.stat`、`memory.current`、`memory.max` 暴露限制和统计。先用实际 cgroup 路径与挂载信息定位对应目录，再只读检查；不能把挂载根目录的限制误当当前进程的限制。

```text
仅用于解释的 cgroup v2 示例，不是本机读数：
cpu.max: 200000 100000
memory.max: 536870912
```

该 CPU 示例表示每 100000 微秒周期最多使用 200000 微秒 CPU 时间，长期预算约为 2 个 CPU 的时间；不保证独占两个核心，也不代表最多只有两个线程。示例内存上限为 512 MiB，统计边界应看控制器定义。
`cpu.max` 中 max 表示该层未设带宽上限，但祖先 cgroup、cpuset 或宿主争用仍可限制资源。`cpu.stat` 的节流次数与时间应看采样差值；历史累计很大不证明此刻仍被节流。
容器内 `free` 可能反映宿主信息而非准确容器余量，需结合对应 cgroup 指标和运行时。遇到不可读目录或不同控制器版本就记录缺口，不猜路径后尝试写入。

## 五、文件描述符：撤下菜单牌不等于收走纸张

文件描述符是进程用于引用打开对象的整数，0/1/2 只是常见约定；打开对象可能是文件、管道或 socket。名称从目录中删除后，若还有打开引用，数据通常要等最后引用释放才回收。
下面只创建并删除一个你自己的小型临时文件，删除动作明确限定到该文件，不影响任何真实日志。

```bash
lab=$(mktemp -d "${TMPDIR:-/tmp}/linux-advanced.XXXXXX")
if [ -n "$lab" ] && [ -d "$lab" ]; then
  printf 'ticket still open\n' > "$lab/open-ticket.txt"
  printf '工作区：%s\n' "$lab"
else
  printf '工作区失败，请停止后续文件实验\n' >&2
fi
```

确认创建成功后，在同一 Bash 会话中打开描述符 9，再删除那个已知文件名：

```bash
exec 9< "$lab/open-ticket.txt"
ls -l -- "/proc/$$/fd/9"
rm -- "$lab/open-ticket.txt"
ls -l -- "/proc/$$/fd/9"
cat <&9
exec 9<&-
```

预期第二次链接展示可能带 `(deleted)`，cat 仍读到 `ticket still open`；关闭 9 后才解除本次引用。先确认 `exec 9<` 成功再继续；该演示太小，不能期待 df 出现可辨认变化。
真实日志被删除但服务仍打开时，du 可能看不到该名字而 df 仍统计空间。不要照此删除真实日志，更不要直接截断 `/proc` 下的描述符；应识别所属进程并按应用的日志轮转和重新打开机制处理。
`ulimit -n` 可读取当前 Shell 打开文件数量限制；子进程通常继承它。出现“Too many open files”时先查目标进程的限制和描述符增长趋势，不能直接提高系统上限来掩盖泄漏。

## 六、strace 与 perf：放大镜也有重量

strace 观察系统调用边界与信号，不等同于源代码函数跟踪；它可能显著减慢高频系统调用程序，还可能记录路径、数据和敏感参数。这里只启动自己的短小命令，不附加到未知进程。

```bash
if command -v strace > /dev/null 2>&1; then
  strace -f -e trace=openat,read,write,close -o "$lab/trace.txt" /usr/bin/printf 'probe\n'
  head -n 20 -- "$lab/trace.txt"
else
  printf 'strace 不可用，跳过跟踪实验\n'
fi
```

预期终端打印 probe，跟踪文件包含部分文件或输出相关调用，具体取决于动态链接器和工具版本。某次 openat 返回 ENOENT 可能只是程序正常探测候选路径，需关联最终失败和业务行为。
perf 可观察硬件或软件计数、采样热点；可用事件受 CPU、内核、虚拟化及安全策略影响。下面仅是工具可用性探测，不作为性能测量：

```bash
if command -v perf > /dev/null 2>&1; then
  perf stat -- /usr/bin/printf 'probe\n'
else
  printf 'perf 不可用，跳过计数探测\n'
fi
```

命令可能因权限而失败；这本身就是应记录的结果。不修改安全参数，不额外授予能力，不为获得数字绕过限制。短命令的启动开销占比很高，单次输出不能比较机器跑分；正式分析需明确采样窗口、事件、负载、符号信息与观察开销。

## 七、网络故障层次：从插座到出餐内容

| 层次 | 可读取的证据 | 下一步判断 |
| --- | --- | --- |
| 接口与路由 | ip -brief address、ip route | 地址和路由是否位于目标实例与命名空间？ |
| 名称解析 | getent ahosts localhost；实际解析器配置 | hosts、缓存、DNS 不要混为一谈 |
| TCP 连接 | ss -ltn、客户端连接错误 | 目标端口是否监听，地址与地址族是否一致？ |
| TLS 与身份 | 客户端具体证书错误、系统时间 | 核对可信链与目标名称，不能关闭校验 |
| HTTP 与应用 | 状态码、响应体、同时间日志 | 连接成功不等于业务处理成功 |

需要实践时复用[系统管理的回环 HTTP 实验](./administration)：仅请求你刚启动的 `http://127.0.0.1:8765/`，设置连接和总超时。服务停止后连接失败是受控对照，不是“互联网故障”。
不要用一次 ping 失败证明主机离线：ICMP 可能被过滤，而 TCP 服务仍可访问。网络问题还应核对 IPv4/IPv6、代理设置、命名空间、宿主转发和防火墙边界，避免跨层猜测。

## 八、综合实验：提交证据，不提交猜测

沿用本章已确认的工作区，采集一份短时快照；输出可能含主机环境信息，分享前脱敏。所有采集都是读取，不改调度、内存、网络或服务参数。

```bash
{
  printf '=== time ===\n'
  date -Is
  printf '=== kernel ===\n'
  uname -sr
  printf '=== load and cpu visibility ===\n'
  uptime
  nproc
  printf '=== memory ===\n'
  free -h
  printf '=== interval sample ===\n'
  vmstat 1 3
  printf '=== filesystem blocks and inodes ===\n'
  df -h "$lab"
  df -i "$lab"
  printf '=== listening tcp ===\n'
  ss -ltn
} > "$lab/evidence.txt" 2> "$lab/evidence-errors.txt"
cat -- "$lab/evidence-errors.txt"
cat -- "$lab/evidence.txt"
```

预期产生两份文件，而不是固定的 CPU 或内存数字。错误文件不一定为空；组合命令最终退出码不能代表每条查询成功，应检查分段输出和错误，必要时单独重跑失败查询并记录状态码。
按以下模板用**你实际读取的证据**填写，不把前文模型数字当成本机读数：

```text
环境与采样时间：
观察范围与业务现象（没有复现就写没有）：
实际读取的关键值及单位：
工具缺失、权限限制与采样空白：
候选原因及支持证据：
反证或仍不能排除的原因：
下一步最小只读验证：
若需变更，所需授权、隔离实验、回滚与验收：
```

<details>
<summary>查看综合练习的合格答案标准</summary>
<p>没有唯一正确的数字。合格答案必须标明实际时间与环境，区分首行累计值和后续区间值；不能用缓存大判定泄漏、用 load 高判定 CPU 满、用回环成功判定公网正常。未复现时应建议在获授权的故障时段补采业务与系统证据，而不是立即修改参数。缺少权限或工具是证据缺口，不是零值。</p>
</details>

## 总结与后续路线

你已从会拿厨具走到能解释整间厨房的状态：先确认边界，再读取证据，提出能被反驳的假设，最后才讨论受控变更。下一轮回到[课程路线](./index)逐项验收，或结合[自动化](./automation)为自己的只读巡检补上输入契约与失败记录；高级能力不是命令更危险，而是决定更可靠。
