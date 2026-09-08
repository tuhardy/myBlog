---
title: Linux 基础：把订单变成可靠流水线
date: 2026-09-08
tags: [Linux, Bash, 文本处理]
description: 在隔离工作区练习路径、帮助、文件操作、引号、退出码与文本管道，理解 Shell 和内核的分工。
---

<script setup>
import { computed, ref } from 'vue'
import { LearningTabs, LearningSlider, LearningCounter, LearningFlipCard } from '../../config/.vitepress/theme/components/learning'

const pathMode = ref('absolute')
const pathOptions = [{ value: 'absolute', label: '绝对路径' }, { value: 'relative', label: '相对路径' }]
const MIN_ORDER_AMOUNT = 0
const MAX_ORDER_AMOUNT = 50
const AMOUNT_STEP = 10
const trainingAmounts = [20, 40, 20, 30]
const minimumAmount = ref(30)
const matchingOrders = computed(() => trainingAmounts.filter(amount => amount >= minimumAmount.value).length)
</script>

# Linux 基础：把订单变成可靠流水线

同一条命令昨天能找到菜单，今天却找不到，是菜单丢了，还是你站错了仓库？先搞清路径、输入与退出码，你就不会靠反复粘贴命令碰运气。

> **环境与安全**：先完成[环境准备](./index)。本页命令全部属于 Ubuntu 24.04 LTS 的 Linux Bash，不在 Windows PowerShell 执行。以普通用户在 `mktemp` 创建的目录练习；不读取真实客户订单，不处理生产日志。命令是教学示例，未宣称实测；预期结果基于下文固定样本。

> - 点单员 → Shell：展开变量、处理引号、连接命令。
> - 后厨调度 → 内核：为程序提供文件、进程和设备能力。
> - 仓库货架 → 路径与目录：定位数据，而不代表数据内容。
> - 分单、汇总与传菜 → 文本管道：让小程序按输入输出协作。

## 先修与验收标准

先修：知道当前是 Linux Bash，能确认普通用户身份。
验收：解释绝对与相对路径；安全处理带空格的文件名；从四条样本订单得到确定汇总；区分“没有匹配”和“工具报错”。
所有实验在同一个 Bash 会话按顺序执行；换终端后变量会丢失，应重新建立工作区。

## 一、Shell 不是内核，终端也不是 Shell

终端提供输入输出界面；Bash 是 Shell 的一种。它先解析命令，再调用内建命令或启动外部程序；程序通过系统调用请求内核服务。
`cd` 必须影响当前 Shell 的工作目录，所以通常是内建命令。`cat` 通常是外部程序；发行版把内核、工具与包管理整合到一起。

```bash
type cd
type printf
type cat
help cd
```

预期 `cd` 被识别为 Shell 内建命令；`printf` 通常也有内建版本，`cat` 的路径取决于系统。不要用“所有命令都是可执行文件”理解 Bash。
寻求帮助时先查工具是否存在，再查本机手册；本机版本的说明优先于网上不同版本的帖子。

```bash
command -v grep
grep --help
man grep
```

在 `man` 中用 `/pattern` 搜索、`n` 跳到下一处、`q` 退出。最小安装若没有 `man`，先用 `--help`，不要把帮助工具缺失误判为 grep 不可用。

## 二、建立隔离仓库，理解路径

```bash
lab=$(mktemp -d "${TMPDIR:-/tmp}/linux-basics.XXXXXX")
if [ -n "$lab" ] && [ -d "$lab" ]; then
  cd -- "$lab"
  mkdir -- incoming reports
  printf '工作区：%s\n' "$PWD"
else
  printf '工作区创建失败，请停止后续实验\n' >&2
fi
```

只在成功打印工作区后继续。`/` 是根目录，`~` 在合适的语法位置展开为家目录，`.` 是当前目录，`..` 是父目录。Linux 路径区分大小写；Windows 的盘符与反斜杠规则不能直接套用。
`/home` 常放普通用户目录，`/etc` 常放配置，`/var` 常放变化数据，`/tmp` 用于临时文件；它们是约定，不是“可以随意修改”的授权。

<ClientOnly>
  <LearningTabs id="linux-basics-paths" v-model="pathMode" label="路径如何定位" :options="pathOptions">
    <template #absolute><p>绝对路径从根目录开始。例如变量 lab 保存 mktemp 返回的完整目录；引用 "$lab/incoming" 不依赖当前目录。不要把示意名称替换成系统目录做写入。</p></template>
    <template #relative><p>相对路径依赖当前工作目录。在实验根目录中，incoming 指向收单区；进入 incoming 后，../reports 才指向同级报表区。先用 pwd 核对站位。</p></template>
  </LearningTabs>
</ClientOnly>

```bash
pwd
ls -la
cd -- incoming
pwd
cd -- "$lab"
printf 'menu draft\n' > "incoming/menu draft.txt"
cp -- "incoming/menu draft.txt" "reports/menu copy.txt"
mv -- "reports/menu copy.txt" "reports/menu checked.txt"
ls -l -- incoming reports
```

预期原文件仍在 incoming，复制并重命名的文件在 reports。双引号把空格保留在同一个参数里，`--` 告诉支持它的工具“选项到此结束”，避免以短横线开头的文件名被当作参数。
复制或移动到已存在的目标可能覆盖文件；这里的目标在新工作区中才安全。`touch` 会创建空文件或更新时间，不会自动清空已有内容。

## 三、引号、展开与退出码：点单必须准确

```bash
dish='noodle soup'
printf '%s\n' "$dish"
printf '%s\n' '$dish'
printf '%s\n' "incoming/"*.txt
```

第一条输出变量内容，第二条输出字面量 `$dish`。第三条的星号没有被引用，会做文件名展开；若完全引用为 `"incoming/*.txt"`，就只是一个含星号的字符串。不要依赖未引用变量的分词或通配展开。
`printf` 的格式串固定为 `%s\n`，把数据放在后续参数，避免把数据里的百分号解释为格式。命令替换 `$(...)` 会捕获标准输出并移除末尾换行，不适合无损保存任意二进制数据。

```bash
if test -f "incoming/menu draft.txt"; then
  printf '菜单文件存在\n'
else
  printf '菜单文件不存在\n' >&2
fi
false
printf '上一条退出码：%s\n' "$?"
```

预期先报告文件存在，再显示退出码 1。零通常表示成功，非零含义由工具定义；`$?` 会被下一条命令更新，应立即保存或使用 `if` 检查。
`cmd1 && cmd2` 仅在前者成功后执行后者；`cmd1 ; cmd2` 不要求成功。`cmd1 || cmd2` 适合显式失败分支，但不能把所有非零结果都当成同一种故障。

## 四、文本流水线：先看样本，再做报表

创建四笔固定教学订单。使用带引号的 here-document 分隔符，正文中的变量不会被 Shell 展开。

```bash
cat > incoming/orders.txt <<'DATA'
noodle 2 20
rice 1 40
noodle 1 20
soup 3 30
DATA
cat -- incoming/orders.txt
head -n 2 -- incoming/orders.txt
wc -l -- incoming/orders.txt
```

预期四行、三列。此样本以空白分列，空格与制表符均可被默认 awk 识别；菜名本身不能含空格，它不是通用 CSV 解析方案。列含义是菜品、份数、该笔订单金额，金额不是单价。
`cat` 适合小文件，`head` / `tail` 用于抽样，`less` 适合交互浏览；不要直接把巨大或未知二进制文件倾倒到终端。

```bash
grep -n -F -- 'noodle' incoming/orders.txt
awk '{print $1}' incoming/orders.txt | LC_ALL=C sort | uniq -c
awk '{total += $3} END {printf "amount=%d\n", total}' incoming/orders.txt
awk '$3 >= 30 {print $1, $3}' incoming/orders.txt > reports/large-orders.txt
cat -- reports/large-orders.txt
```

预期 grep 命中第 1、3 行；按字节排序后的计数为 noodle 2 次、rice 1 次、soup 1 次；总金额为 110；大额报表为 `rice 40` 和 `soup 30`。
`grep -F` 按固定字符串匹配，正则匹配则不要带 `-F`；`grep '^noodle '` 用行首约束可以避免匹配到行中其他文字。匹配规则要来自输入格式，而非猜测。
`uniq` 只合并相邻重复项，因此先排序。`LC_ALL=C` 固定该命令的排序规则，避免不同区域设置导致顺序差异。金额总和并非份数总和，汇总前必须先定义列语义。

### 操作 → 观察 → 原理：金额门槛会保留几单？

**固定样本模型**：金额集合为 `[20, 40, 20, 30]` 元，保留数 = 满足“订单金额 ≥ 门槛”的元素个数；每条记录计一次，不按份数加权。模型只重现上方筛选，不访问文件，也不是吞吐量测试。

<ClientOnly>
  <LearningSlider v-model="minimumAmount" label="保留订单的最低金额" :min="MIN_ORDER_AMOUNT" :max="MAX_ORDER_AMOUNT" :step="AMOUNT_STEP" unit=" 元" />
  <LearningCounter label="样本中保留的订单" :value="matchingOrders" unit=" 单" />
  <LearningFlipCard question="为什么直接 uniq -c 不能统计这里所有 noodle 订单？" answer="uniq 只合并相邻的相同行。这里两个 noodle 不相邻，且完整行的份数不同；应先用 awk 提取菜品列，再 sort，最后 uniq -c。" />
</ClientOnly>

门槛调到 20、30、50 元，预期分别保留 4、2、0 单；把对应数字替换到上方 awk 条件，手动核对结果。这里的比较包含等于，不是“大于”。

## 五、重定向与管道：分清收银纸带和报警铃

文件描述符 0、1、2 通常分别是标准输入、标准输出、标准错误。管道 `|` 默认只把左侧标准输出传给右侧；错误信息通常仍留在终端。
`>` 创建或截断目标，`>>` 追加，`<` 提供输入。绝不能写 `sort file > file`：Shell 可能在 sort 读取前就把文件截断。

```bash
wc -l < incoming/orders.txt
printf 'checked\n' >> reports/audit.txt
grep -F -- 'dessert' incoming/orders.txt > reports/dessert.txt
status=$?
printf 'grep 退出码：%s\n' "$status"
```

预期行数是 4，grep 退出码为 1，结果文件存在但为空。grep 的 0 表示找到匹配，1 表示未找到，2 通常表示错误；空报表不一定是失败。
下面故意读取不存在的实验文件，分开保存两种输出，不隐藏错误：

```bash
if cat -- incoming/not-created.txt > reports/read.out 2> reports/read.err; then
  printf '读取成功\n'
else
  status=$?
  printf '读取失败，退出码=%s\n' "$status"
  cat -- reports/read.err
fi
```

预期进入失败分支，错误文件说明目标不存在，具体语言随系统设置变化。`> out 2>&1` 先重定向输出，再让错误跟随它；顺序反过来语义不同。
默认管道退出码通常只反映最后一个命令，左边失败可能被掩盖。在独立子 Shell 中体验 `pipefail`，不修改当前会话设置：

```bash
(
  set -o pipefail
  false | cat
  printf '启用 pipefail 后：%s\n' "$?"
)
```

预期显示 1；没有 `pipefail` 时这里通常是 0。它提升可见性，但不能替你定义 grep 未匹配是否符合业务要求。

## 六、验收练习与答案

1. 在当前工作区把所有份数相加，预期是多少？
2. 若进入 incoming 后执行 `cat incoming/orders.txt`，为什么失败？
3. 生成一个新报表，只包含菜品及金额，保持原文件不变；如何检查行数？

<details>
<summary>查看答案与可执行核对</summary>
<p>份数总计为 7。相对路径会从当前目录再次查找 incoming；可改用 orders.txt，或引用 "$lab/incoming/orders.txt"。报表必须写入新的目标，不能把输入文件作为重定向目标。</p>
</details>

回到工作区根目录再执行答案中的命令；`columns.txt` 是本练习新目标：

```bash
cd -- "$lab"
awk '{count += $2} END {print count}' incoming/orders.txt
awk '{print $1, $3}' incoming/orders.txt > reports/columns.txt
wc -l -- incoming/orders.txt reports/columns.txt
```

预期两个文件各 4 行，总计 8；原订单仍有三列。若只看到“命令没有报错”，还不算验收，应把份数、金额、行数分别核对。

## 总结与下一章

你已能把订单定位、解析、筛选并核对结果，也知道错误该走哪条通道。下一章进入[系统管理](./administration)，给仓库设置恰当门禁，并学会读进程、服务和系统资源的值班记录。需要重建环境时返回[课程路线](./index)。
