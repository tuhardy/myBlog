---
title: Linux 系统管理：门禁、排班与巡检
date: 2026-09-08
tags: [Linux, 权限, 系统管理]
description: 用最小权限管理实验文件，识别进程与服务，读取日志、包信息、磁盘及网络证据。
---

<script setup>
import { computed, ref } from 'vue'
import { LearningTabs, LearningSlider, LearningCounter, LearningFlipCard } from '../../config/.vitepress/theme/components/learning'

const objectType = ref('file')
const objectOptions = [{ value: 'file', label: '普通文件' }, { value: 'directory', label: '目录' }]
const MIN_PERMISSION_DIGIT = 0
const MAX_PERMISSION_DIGIT = 7
const READ_BIT = 4
const WRITE_BIT = 2
const EXECUTE_BIT = 1
const ownerDigit = ref(6)
const enabledBits = computed(() => [READ_BIT, WRITE_BIT, EXECUTE_BIT].filter(bit => (ownerDigit.value & bit) !== 0).length)
const symbolicMode = computed(() => `${ownerDigit.value & READ_BIT ? 'r' : '-'}${ownerDigit.value & WRITE_BIT ? 'w' : '-'}${ownerDigit.value & EXECUTE_BIT ? 'x' : '-'}`)
</script>

# Linux 系统管理：门禁、排班与巡检

仓库门打不开，你会给所有人万能钥匙吗？服务出问题，你会直接把后厨断电吗？系统管理的第一步是确认对象和证据，第二步才是选择影响最小的动作。

> **环境与安全**：先完成[命令行基础](./basics)。以下是 Ubuntu 24.04 LTS 的 Linux Bash 命令，权限实验仅操作新建临时目录；系统巡检以只读为主。软件安装会修改实验机，单独标注。WSL 或容器若没有 systemd，跳过服务相关命令；日志和进程详情可能因权限不足不可见，不能据此断言不存在。

> - 仓库工牌 → 用户、组与权限：确认谁可接触什么。
> - 厨师与排班 → 进程与服务：区分一次执行和持续托管。
> - 值班本 → 日志：按时间与对象收集证据。
> - 库容与送餐路线 → 磁盘和网络：逐层核对资源边界。

## 先修与验收标准

先修：会引用路径、读退出码、区分标准输出和错误。
验收：能解释文件 640 与目录 750；只终止自己启动的练习进程；按时间查服务日志；分别判断磁盘空间、inode、监听端口和名字解析是否有证据。
“最小权限”不是给得越少越好，而是只授予任务所需的主体、动作、对象和时长。

## 一、文件与目录的 rwx 不是一回事

`ls -l` 第一列先标明类型，再按属主、属组、其他用户排列三组 rwx。普通权限之外还有 ACL、安全模块和只读挂载等约束；看到 rwx 并不意味着一定允许操作。

| 权限 | 普通文件 | 目录 |
| --- | --- | --- |
| r，值 4 | 读取内容 | 列出目录项名称 |
| w，值 2 | 修改内容 | 配合 x 创建、删除、重命名目录项 |
| x，值 1 | 请求执行；还需有效格式或解释器 | 搜索、穿越目录，访问已知名称 |

删除文件主要取决于父目录权限，而非文件本身是否可写；粘滞位、ACL 等还会限制行为。目录没有 x，即使有 r，也可能能看见名称却无法读取条目属性或进入目录。

```bash
lab=$(mktemp -d "${TMPDIR:-/tmp}/linux-admin.XXXXXX")
if [ -n "$lab" ] && [ -d "$lab" ]; then
  cd -- "$lab"
  mkdir -- pantry
  printf 'stock=12\n' > pantry/stock.txt
  chmod 750 pantry
  chmod 640 pantry/stock.txt
  id
  ls -ld -- pantry
  ls -l -- pantry/stock.txt
else
  printf '创建失败，请停止文件实验\n' >&2
fi
```

预期目录权限为 `drwxr-x---`，文件为 `-rw-r-----`，属主是你；属组取决于目录继承和系统配置。`640 = 6/4/0`，不是十进制“六百四十”：属主读写，组只读，其他无权限。
`750` 则是属主读写穿越、组读取穿越、其他无权限。父级临时目录通常仅属主可进入，因此这里的组权限不会自动让其他用户穿透整个路径；这是隔离实验，不是多用户授权验证。

<ClientOnly>
  <LearningTabs id="linux-administration-permissions" v-model="objectType" label="权限语义对照" :options="objectOptions">
    <template #file><p>给文件加 x 不会自动把文本变成正确程序；脚本还需要解释器和有效语法。普通数据文件通常不需要执行权限。</p></template>
    <template #directory><p>目录的 x 是穿越能力，不是执行目录。授予共享目录权限时，要检查沿途每一级目录，不能只看最终文件。</p></template>
  </LearningTabs>
  <LearningSlider v-model="ownerDigit" label="属主权限的八进制单个数字" :min="MIN_PERMISSION_DIGIT" :max="MAX_PERMISSION_DIGIT" unit="" />
  <LearningCounter label="该数字启用的权限位" :value="enabledBits" unit=" 项" />
  <p>属主符号权限：<strong>{{ symbolicMode }}</strong></p>
  <LearningFlipCard question="把只读文件放进可写且可穿越的目录，是否就防止了别人删除它？" answer="不是。删除通常修改父目录的目录项，主要检查父目录权限，还受粘滞位等机制约束。文件只读主要限制内容写入，不能独立保护文件名。" />
</ClientOnly>

**权限编码模型**：数字 d 为 0–7 的整数，d = 4r + 2w + x，各变量只取 0 或 1；计数 = r + w + x。拖到 6 应显示 rw-、2 项，拖到 5 应显示 r-x、2 项。计数相同不表示能力相同；这不是安全评分，也不会修改系统权限。

属主决定哪组传统权限适用，并不是把三组权限全部相加。用 `id` 核对用户及组，用 `stat` 检查实际对象：

```bash
stat -c '%A %a %U:%G %n' -- pantry pantry/stock.txt
umask
```

`umask` 是创建时屏蔽的位，不是对现有文件减法。常见文件请求 666、目录请求 777；若掩码是 027 且没有默认 ACL 等额外因素，新文件得到 640、新目录得到 750。这里的数值用于解释位运算，不要求修改系统默认值。
修改属主通常需要特权，修改属组也受成员资格限制；不要为了绕过访问失败直接加 sudo。先确认路径、身份、需求，再由授权管理员做最小范围变更。

## 二、进程与信号：只给自己的练习厨师下班通知

PID 是进程标识，PPID 是父进程。进程会退出，PID 会复用；根据过期列表发送信号可能打到其他进程。
下面启动一个短暂的练习进程，立即保存 PID、核对命令，再发送 TERM；仅在同一会话、同一练习中使用该变量。

```bash
sleep 120 &
worker_pid=$!
ps -p "$worker_pid" -o pid,ppid,user,stat,etime,args
kill -TERM "$worker_pid"
wait "$worker_pid"
worker_status=$?
printf '练习进程退出码：%s\n' "$worker_status"
```

正常路径下你会看到自己的 sleep；Bash 中被 TERM 终止通常得到 143，即 128 + 信号 15，但调度与执行时机可能使结果不同。进程若已结束，kill 会报告对象不存在，不应换一个猜测的 PID。
TERM 是可处理的终止请求，程序可以执行清理；INT 通常来自前台 Ctrl+C；HUP 是否重载配置由程序定义，不能通用套用。僵尸进程是已退出但未被父进程回收的状态，不靠给它发终止信号解决。

```bash
ps -eo pid,ppid,user,stat,%cpu,%mem,comm --sort=-%cpu | head -n 11
```

这是一个瞬时列表；`ps` 的 CPU 百分比通常是进程生存期平均值，不等同于实时采样。完整命令行可能含敏感参数，分享巡检记录前要脱敏。

## 三、systemd 与日志：分清“运行中”和“开机启用”

先看 PID 1，只有实际为 systemd 才执行下面的 systemctl 和 journalctl。WSL、容器与精简系统缺少该管理器时，记录“不适用”，不要把环境差异当作服务故障。

```bash
ps -p 1 -o comm=
systemctl is-system-running
systemctl --failed --no-pager
systemctl list-units --type=service --state=running --no-pager
```

从本机列表选择确实存在的单元，下面先交互读取其名称，避免把示意服务名当成真实对象。仅输入一个完整服务名，不输入空格或额外参数。

```bash
read -r -p '输入列表中一个完整的 .service 单元名：' unit
if [[ "$unit" =~ ^[A-Za-z0-9_.@:-]+\.service$ ]]; then
  systemctl status --no-pager -- "$unit"
  journalctl -u "$unit" --since '30 minutes ago' -n 40 --no-pager
else
  printf '单元名不符合本练习格式，未执行查询\n' >&2
fi
```

预期状态信息包含 active/inactive/failed 等；退出码非零可能代表单元不活跃，而非工具本身坏了。`enabled` 描述启动链接配置，不保证现在 active；反之 active 也可能是手工启动。
日志空白可能因为无事件、时间范围、日志持久化策略或读取权限。先检查系统时间、筛选条件及访问提示，再下结论。不要为“让它绿起来”盲目重启；重启会中断请求并可能抹掉现场。

## 四、软件包：先查库存，再确认进货

这些查询不安装软件。Ubuntu 用 dpkg 查已安装包，用 apt 查仓库候选版本；缓存可能过时。

```bash
dpkg-query -W bash coreutils
apt-cache policy curl
command -v curl
command -v python3
```

如后续本地 HTTP 实验缺少工具，**仅在获授权的 Ubuntu 实验机**上可执行以下安装。sudo 提升权限；update 更新索引，install 下载包并修改系统，可能拉取依赖。阅读提示并确认，不自动应答，不执行全系统升级。

```bash
sudo apt update
sudo apt install curl python3
```

先确认来源为你信任的发行版仓库；仓库签名用于验证包来源，不是“每个包绝对没有漏洞”的保证。服务类包安装后可能自动启动，安装前查影响。
Fedora/RHEL 系通常用 dnf/rpm，Alpine 用 apk；包名、拆包方式、默认服务名可能不同。不要简单把 apt 单词替换成别的命令。脚本中通常优先使用面向脚本的 apt-get，但仍需明确权限、锁等待与错误处理。

## 五、磁盘：货架体积和格子数量都要看

```bash
df -h .
df -i .
du -sh -- "$lab"
find "$lab" -maxdepth 2 -type f -printf '%p\n'
```

`df -h` 看所在文件系统可用块空间，`df -i` 看 inode 数量，`du` 汇总可遍历文件占用。很多小文件可能耗尽 inode，而字节空间仍充足；某些文件系统不提供有意义的固定 inode 上限。
`df` 与 `du` 不一致还可能来自删除但仍打开的文件、权限不可见、挂载点、保留块或统计时刻不同；不能马上判定损坏。当前目录在哪个挂载点很重要，WSL 的 Linux 文件系统和 Windows 挂载盘不能混看。
调查先限定范围；全盘递归扫描可能制造额外 I/O。这里的 find 只列出隔离目录内文件，不跟随符号链接去系统目录，也不执行删除。

## 六、网络：门牌、路线、窗口、名字逐层确认

```bash
ip -brief address
ip route
ss -ltn
getent ahosts localhost
```

`ip` 看接口地址与路由，`ss -ltn` 看 TCP 监听端口，`getent` 走系统名称解析规则。localhost 常由 hosts 文件解析，所以成功不证明外部 DNS 正常。
若系统使用 systemd-resolved，可只读运行 `resolvectl status` 看接口 DNS 配置；命令缺失或服务未运行时记录实际解析机制，不修改配置。调查外部域名时必须使用你实际获授权的目标，本课不猜测外部 URL。

### 可选：仅回环可访问的 HTTP 实验

确认 Python 3 和 curl 已存在，且 `ss -ltn` 中没有占用 8765 端口。终端 A 在本章工作区运行，只共享新建 public 子目录；不用家目录或系统目录当网页根目录。

```bash
mkdir -- "$lab/public"
printf 'kitchen ready\n' > "$lab/public/index.html"
python3 -m http.server 8765 --bind 127.0.0.1 --directory "$lab/public"
```

终端 A 应保持前台运行；若报端口占用，不去停止未知进程，跳过实验或先调查。终端 B 必须进入同一 Linux 实例，不依赖 Windows 与 WSL 的转发：

```bash
ss -ltn 'sport = :8765'
curl --noproxy '*' --fail --show-error --silent --connect-timeout 2 --max-time 5 http://127.0.0.1:8765/
```

预期看到回环监听与 `kitchen ready`。`--noproxy '*'` 避免代理环境变量把回环请求送到代理；超时限制等待，`--fail` 把 HTTP 4xx/5xx 作为失败。完成后在终端 A 按 Ctrl+C；Python 的简易服务器不是生产部署方案。
连接被拒绝常指目标没有接受该连接，超时可能是丢包、路由或服务等待，HTTP 错误则说明已到应用层；具体仍要关联监听与日志证据。

## 七、SSH 身份与防火墙：先验人，再开门

SSH 连接前，从管理员通过独立可信渠道取得服务器地址、端口和主机公钥指纹。首次提示时逐项比对主机与指纹；指纹是服务器身份，不是你的登录口令。
遇到主机身份变化提示应停止连接，核实重装、地址复用或攻击可能，再按组织流程更新记录。不要关闭主机校验，也不要直接接受未知指纹。本课不涉及密钥文件查找或收集。
防火墙变更先列出必要方向、源地址、目标端口和已有连接，再计划最小放行；远程操作必须有带外恢复渠道、回滚计划与第二会话验证。不要先改默认策略再想如何恢复 SSH。
本页不提供防火墙写入命令，也不要求开启远程 SSH 服务。本地回环实验不需要对局域网开放端口；WSL 的 Windows 防火墙与 Linux 网络层也需分开定位。

## 八、验收练习与答案

1. 640 的数据文件可以直接执行吗？750 的目录对属组意味着什么？
2. systemctl 显示 enabled，但网站不通，能否断言服务正在运行？
3. df 字节空间充足但创建文件失败，下一条应收集什么证据？
4. 回环 HTTP 成功是否证明 DNS 和公网入口都正常？

<details>
<summary>查看值班答案</summary>
<p>640 没有任何执行位；750 让属组读取目录项并穿越，但不能创建目录项。enabled 只表示启动配置，还需状态、监听及应用检查。创建失败先读错误，再查 df -i、权限、配额和只读挂载等相关证据。回环请求不经过公网入口，使用数字地址也绕过了 DNS，因此不能证明这些层正常。</p>
</details>

验收记录至少包含查询时间、对象、命令、实际输出摘要及下一步；“未授权读取”也应如实记录。不要把示例预期复制成你的真实巡检结果。

## 总结与下一章

你已能解释门禁、区分厨师与排班管理器，并按仓库和路线收集证据。下一章进入[自动化](./automation)，把重复工作写成可检查、可恢复的交接班流程；返回[课程路线](./index)可调整学习顺序。
