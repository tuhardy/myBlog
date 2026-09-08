---
title: Linux 自动化：可重跑、可恢复的交接班
date: 2026-09-08
tags: [Linux, Bash, 自动化, 备份]
description: 编写输入可验证、错误可解释的 Bash 报表脚本，比较定时任务，并在新目录完成备份恢复校验。
---

<script setup>
import { computed, ref } from 'vue'
import { LearningTabs, LearningSlider, LearningCounter, LearningFlipCard } from '../../config/.vitepress/theme/components/learning'

const scheduler = ref('cron')
const schedulerOptions = [{ value: 'cron', label: 'cron' }, { value: 'timer', label: 'systemd timer' }]
const MIN_RETENTION_DAYS = 1
const MAX_RETENTION_DAYS = 30
const DAILY_SNAPSHOT_MIB = 12
const retentionDays = ref(7)
const retainedMiB = computed(() => retentionDays.value * DAILY_SNAPSHOT_MIB)
</script>

# Linux 自动化：可重跑、可恢复的交接班

夜班脚本显示“完成”，第二天却发现报表只有一半，这算自动化成功吗？可靠交接班不仅要能执行，还要能拒绝坏订单、重复运行不添乱，并证明备份确实能恢复。

> **环境与安全**：先完成[系统管理](./administration)。本页在 Ubuntu 24.04 LTS 的 Linux Bash 普通用户会话中练习，依赖 Bash、GNU coreutils、awk、tar 与 diff。所有数据位于新建临时目录；恢复必须进入另一个新目录，绝不覆盖源文件。脚本为教学实现，未在 Linux 实机验证，不应用于生产账单或未受信任的共享目录。

> - 标准菜谱 → 脚本：把人工步骤写成明确契约。
> - 收单检查与退单 → 输入验证和退出码：失败不能冒充成功。
> - 交接班闹钟 → cron / timer：安排触发，不保证任务正确。
> - 留样与复做 → 备份和恢复：保存副本后还要验证可用。

## 先修与验收标准

先修：知道引号、管道、文件权限、退出码和 systemd 环境限制。
验收：生成固定样本报表；同一输入重跑不改报表；坏输入不会发布结果；能解释临时目录与 trap；从自己创建的归档恢复到新目录并通过逐字节比较。
本章先写同步脚本，再讨论调度，避免把一个不可靠脚本更频繁地运行。

## 一、先定义交接契约与工作区

输入格式：每行三列，依次为英文字母菜名、正整数份数、非负整数订单金额（元），列以空白分隔，不接受表头、空行和复杂菜名。
输出固定为 `summary.txt`。同一输入产生相同内容即返回成功；目标已有不同内容则拒绝覆盖并返回 3。这样实现本实验的幂等契约，而不是把“每天新增一份副本”误称为幂等。

```bash
lab=$(mktemp -d "${TMPDIR:-/tmp}/linux-auto.XXXXXX")
if [ -n "$lab" ] && [ -d "$lab" ]; then
  cd -- "$lab"
  mkdir -- source reports backups
  printf 'noodle 2 20\nrice 1 40\nnoodle 1 20\nsoup 3 30\n' > source/orders.txt
  printf '工作区：%s\n' "$lab"
else
  printf '工作区创建失败，请停止\n' >&2
fi
```

只在工作区创建成功后继续。以下代码块完整创建脚本，无需复制提示符；使用 `bash` 启动，不需要增加执行权限。

## 二、完整脚本：验证、暂存、发布、清理

```bash
cat > "$lab/report.sh" <<'SCRIPT'
#!/usr/bin/env bash
set -u
set -o pipefail
export LC_ALL=C
umask 077
work=''
cleanup() {
  if [[ -n "$work" && -d "$work" ]]; then
    if [[ -f "$work/summary.txt" ]]; then
      rm -- "$work/summary.txt" || printf '临时文件清理失败\n' >&2
    fi
    rmdir -- "$work" || printf '临时目录保留，请人工检查\n' >&2
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [[ $# -ne 2 ]]; then
  printf '用法：bash report.sh 输入文件 已存在的输出目录\n' >&2
  exit 2
fi
source_file=$1
output_dir=$2
if [[ ! -f "$source_file" || ! -r "$source_file" || -L "$source_file" ]]; then
  printf '输入必须是可读的普通文件，不能是符号链接\n' >&2
  exit 2
fi
if [[ ! -d "$output_dir" || ! -w "$output_dir" || -L "$output_dir" ]]; then
  printf '输出必须是可写的现有目录，不能是符号链接\n' >&2
  exit 2
fi
source_file=$(realpath -- "$source_file") || exit 1
output_dir=$(realpath -- "$output_dir") || exit 1
work=$(mktemp -d "$output_dir/.report.XXXXXX") || exit 1
if ! awk '
  NF != 3 || $1 !~ /^[A-Za-z]+$/ || $2 !~ /^[1-9][0-9]*$/ || $3 !~ /^[0-9]+$/ {
    bad = 1
    exit 2
  }
  { rows++; portions += $2; amount += $3 }
  END {
    if (bad || rows == 0) exit 2
    printf "orders=%d\nportions=%d\namount_yuan=%d\n", rows, portions, amount
  }
' "$source_file" > "$work/summary.txt"; then
  printf '输入读取或格式验证失败，未发布报表\n' >&2
  exit 2
fi
target="$output_dir/summary.txt"
if [[ -e "$target" || -L "$target" ]]; then
  if [[ -f "$target" && ! -L "$target" ]] && cmp -s -- "$work/summary.txt" "$target"; then
    printf '结果一致，无需更新：%s\n' "$target"
    exit 0
  fi
  printf '目标已存在且不符合本次结果，拒绝覆盖\n' >&2
  exit 3
fi
if ! ln -T -- "$work/summary.txt" "$target"; then
  printf '发布失败，可能有并发写入或文件系统不支持硬链接\n' >&2
  exit 1
fi
printf '已发布：%s\n' "$target"
SCRIPT
bash -n "$lab/report.sh" &&
bash "$lab/report.sh" "$lab/source/orders.txt" "$lab/reports" &&
cat -- "$lab/reports/summary.txt"
```

预期语法检查无输出，运行返回 0，报表为 `orders=4`、`portions=7`、`amount_yuan=110` 三行。`bash -n` 仅检查语法，不执行输入验证，更不能证明业务正确；若它失败，先修正再运行下一行。

### 为什么不只写一行重定向？

- 引号保留路径边界；固定格式串避免把输入解释成格式指令。
- `set -u` 帮助发现未定义变量，`pipefail` 暴露管道错误；本脚本用显式分支处理关键步骤，不把 `set -e` 当完整异常机制。
- 暂存目录建在输出目录内，硬链接发布位于同一文件系统；`ln -T` 把目标严格当作文件名且不覆盖已有目标，避免并发出现目录时误把报表写进其中。其他进程不会看到逐行写到一半的报表。
- EXIT trap 清理本次已知临时文件与空目录，不使用递归删除。发布后的硬链接仍引用完整数据，删除临时名字不会删掉报表。
- INT、TERM 转为可解释退出码并触发 EXIT；断电、不可捕获终止或存储故障可能留下暂存目录，trap 不是持久性保证。

脚本的状态码契约为：0 成功或内容已一致；1 工作区或发布失败；2 用法、输入或格式问题；3 目标冲突。上层调度器必须记录非零结果，不应无条件打印“成功”。

## 三、重跑与失败注入

```bash
bash "$lab/report.sh" "$lab/source/orders.txt" "$lab/reports"
printf '重跑状态：%s\n' "$?"
printf 'rice invalid 40\n' > "$lab/source/bad-orders.txt"
mkdir -- "$lab/bad-reports"
if bash "$lab/report.sh" "$lab/source/bad-orders.txt" "$lab/bad-reports"; then
  printf '意外成功，请检查验证规则\n'
else
  status=$?
  printf '预期失败，状态=%s\n' "$status"
fi
ls -la -- "$lab/bad-reports"
```

预期重跑状态 0，提示结果一致；坏输入状态 2，bad-reports 内没有 summary.txt，也没有本次暂存目录。若清理失败，以终端提示为证据，不假定目录已消失。
幂等要定义对象：这里保证“相同输入和相同目标状态”的报表不变；日志追加、发送通知、创建新备份通常不是幂等，应另外设计去重键和重试策略。
局限：这是小规模、可信本地文本处理，不处理引号 CSV、货币小数、大整数精度、并发输入修改、敌对目录路径竞争或磁盘落盘持久性。硬链接可能在非 Linux 挂载盘不受支持；并发发布会安全失败，但没有完整队列和重试机制。

## 四、备份之后，必须在新目录恢复

只归档本章亲自创建的 orders.txt，不归档脚本、真实凭据或系统配置。下面在独立子 Shell 中失败即停止后续步骤；它只备份这一个文件，不代表全系统备份。

```bash
(
  set -e
  backup_dir=$(mktemp -d "$lab/backups/snapshot.XXXXXX")
  tar -C "$lab/source" -cf "$backup_dir/orders.tar" orders.txt
  (
    cd -- "$backup_dir"
    sha256sum orders.tar > SHA256SUMS
    sha256sum -c SHA256SUMS
  )
  tar -tf "$backup_dir/orders.tar"
  restore_dir=$(mktemp -d "$lab/restore.XXXXXX")
  tar --extract --file="$backup_dir/orders.tar" --directory="$restore_dir" --no-same-owner --no-same-permissions orders.txt
  cmp -- "$lab/source/orders.txt" "$restore_dir/orders.txt"
  printf '备份：%s\n恢复到新目录：%s\n逐字节比较通过\n' "$backup_dir" "$restore_dir"
)
```

预期校验显示 orders.tar 成功，归档列表只有 orders.txt，cmp 无输出且返回 0，最后打印两个新目录。任何一步失败都不应把恢复标为成功；重跑会创建新的备份和恢复目录，不覆盖旧副本或原文件。
这里只解压你刚创建、可确认成员的归档。来源不明的 tar 可能含路径穿越、符号链接或特殊文件，不能仅凭“列过清单”就信任它；本课不提供任意不可信归档的安全恢复工具。
SHA-256 可检测内容变化，但校验清单与归档放在同处，不能证明攻击者未同时改动它们。生产备份还需独立存储、访问控制、保留策略及可信校验记录；同盘副本无法抵御整盘故障。
正在变化的源文件可能产生不一致快照；数据库需要应用一致性方案，不能直接套用 tar。恢复演练应核对应用可读性，不能只看压缩包存在。

### 保留策略的教学预算

**模拟模型**：每天恰好生成一份 12 MiB 完整快照，不压缩、不去重，保留 D 天，逻辑数据量 = 12 × D MiB。未计文件系统元数据、校验文件、临时副本、增长和异地副本；不是实际磁盘读数。

<ClientOnly>
  <LearningSlider v-model="retentionDays" label="模拟保留时长" :min="MIN_RETENTION_DAYS" :max="MAX_RETENTION_DAYS" unit=" 天" />
  <LearningCounter label="保留快照的逻辑数据量" :value="retainedMiB" unit=" MiB" />
  <LearningFlipCard question="备份文件能列出来，为什么仍要恢复到新目录？" answer="存在不等于可用。新目录恢复能检查归档可读取、文件内容与业务预期，同时避免覆盖原件。成功还应包含完整性检查及应用层验证。" />
</ClientOnly>

调到 7 天与 30 天，应分别得到 84 MiB 与 360 MiB；真实容量用 df、du 和业务增长趋势验证。恢复点目标 RPO 描述最多容忍多少数据丢失，恢复时间目标 RTO 描述多快恢复服务；两者不是单靠备份频率就能保证。

## 五、定时执行：闹钟不会替你做验收

<ClientOnly>
  <LearningTabs id="linux-automation-schedulers" v-model="scheduler" label="调度器选择" :options="schedulerOptions">
    <template #cron><p>cron 用时间表达式触发命令，环境变量和 PATH 往往比交互 Shell 少。基础 cron 不保证补跑关机期间的任务；日志输出与重叠执行需要明确安排。不同 cron 实现细节不同。</p></template>
    <template #timer><p>systemd timer 负责触发，对应 service 负责执行。支持依赖、日志和部分补跑策略；Persistent=true 主要针对日历定时器，并不是补齐每个漏掉的时间点。同一服务仍在运行时通常不会新启动一份。</p></template>
  </LearningTabs>
</ClientOnly>

下面是**格式说明，不安装任务**。五个时间字段依次是分钟、小时、月内日、月份、星期；示意路径必须替换为已验证、持久化、权限正确的真实脚本位置，不能使用本章临时目录。

```text
15 2 * * * /bin/bash /home/learner/kitchen/report.sh /home/learner/kitchen/source/orders.txt /home/learner/kitchen/reports
```

含义是按调度器时区每天 02:15 触发。交互 Shell 的变量 lab 不会自动存在于任务环境；还要显式设计工作目录、日志、锁和失败通知。本章报表遇到变化会返回 3，因此正式每日任务需设计按日期分区输出，而不是直接照抄。
systemd 方案通常拆成 `.service` 的 `Type=oneshot` / `ExecStart` 和 `.timer` 的 `OnCalendar`；用本机工具先验证日历表达式，不创建单元：

```bash
systemd-analyze calendar '*-*-* 02:15:00'
```

仅在工具存在时执行，预期显示规范化表达式及下一次触发时间，具体结果取决于当前时间和时区。查已存在定时器可用 `systemctl list-timers --all --no-pager`，仍要求 systemd 可用。
用户 timer 还受用户管理器生命周期影响；WSL 停止、VM 关机或宿主机休眠时任务不一定执行。安装任务前应先确认守护进程可用性、时区、夏令时、补跑规则和是否允许重叠。

## 六、验收练习与答案

1. 将坏输入第二列改成 0，为什么仍不符合契约？
2. 两次脚本调用都返回 0，是否证明输出文件时间戳被刷新？
3. 为什么不把恢复目录指定成 source？若校验通过但业务仍读不懂，应算成功吗？

<details>
<summary>查看答案</summary>
<p>份数要求正整数，0 被拒绝。同一内容的重复调用不更新目标，所以成功不意味着时间戳变化。恢复到 source 会危及原件，必须新建目录；完整性通过只证明字节一致，业务格式与应用一致性仍需单独验收，不能提前宣布恢复成功。</p>
</details>

## 总结与下一章

你已经把菜谱写成有输入契约、发布边界与失败路径的流程，并验证了新目录恢复。下一章进入[高级排障](./advanced)，学习如何用实际读取的证据找出餐厅变慢的原因；需要复习权限与日志可返回[系统管理](./administration)。
