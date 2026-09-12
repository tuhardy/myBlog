---
title: "事务隔离：MVCC 与锁的分工"
date: 2026-09-12
tags: [MySQL, 事务, 隔离级别, MVCC, 锁]
description: "用共享厨房理解并发控制：脏读/不可重复读/幻读三种病，四种隔离级别，MVCC 快照与 Next-Key Lock 各管哪一半。"
category: "数据库"
layout: doc
---

<script setup>
import { computed, ref } from 'vue'
import {
  LearningSteps,
  LearningTabs,
  LearningFlipCard,
  LearningQuiz,
  LearningPopover,
  LearningTerminal,
} from '../../../config/.vitepress/theme/components/learning'

const isoLevel = ref('rr')
const isoOptions = [
  { value: 'rc', label: '读已提交 RC' },
  { value: 'rr', label: '可重复读 RR（InnoDB 默认）' },
]
const txStep = ref('t1begin')
const txSteps = [
  { value: 't1begin', label: 'T1 开启事务' },
  { value: 't1read1', label: 'T1 第一次读' },
  { value: 't2write', label: 'T2 修改并提交' },
  { value: 't1read2', label: 'T1 第二次读' },
]
// T1 第二次读到的余额：RR 沿 undo 链回到 100，RC 新快照看到已提交的 70
const secondRead = computed(() => (isoLevel.value === 'rr' ? 100 : 70))
const secondReadNote = computed(() =>
  isoLevel.value === 'rr'
    ? 'RR：ReadView 在第一次读时已冻结，trx=60 对它不可见——沿 undo 链取回旧值 100。'
    : 'RC：这条 SELECT 新建 ReadView，trx=60 已提交可见——读到最新值 70。',
)

const chainStep = ref('v80')
const chainSteps = [
  { value: 'v80', label: '最新版 trx=80' },
  { value: 'v60', label: '回溯 trx=60' },
  { value: 'v50', label: '回溯 trx=50' },
]

const lockScript = [
  { cmd: 'BEGIN;', out: 'Query OK, 0 rows affected (0.00 sec)' },
  { cmd: 'SELECT * FROM accounts WHERE id > 5 FOR UPDATE;', out: '+----+---------+\n| id | balance |\n+----+---------+\n|  6 |     300 |\n|  9 |     850 |\n+----+---------+' },
  { cmd: 'SELECT OBJECT_NAME, LOCK_TYPE, LOCK_MODE, LOCK_DATA\nFROM performance_schema.data_locks;', out: '+-------------+-----------+-----------+------------------------+\n| OBJECT_NAME | LOCK_TYPE | LOCK_MODE | LOCK_DATA              |\n+-------------+-----------+-----------+------------------------+\n| accounts    | TABLE     | IX        | NULL                   |\n| accounts    | RECORD    | X         | 6                      |\n| accounts    | RECORD    | X         | 9                      |\n| accounts    | RECORD    | X         | supremum pseudo-record |\n+-------------+-----------+-----------+------------------------+' },
  { cmd: 'INSERT INTO accounts (id, balance) VALUES (8, 500);', out: '--（会话 B 另开连接执行）\nERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction' },
]
</script>

# 事务隔离：两个事务如何不互相踩脚

账户余额 100。T1 开启事务查了一次；与此同时 T2 把余额改成 70 并提交。T1 再查一次——看到 100 还是 70？答案是「看隔离级别」。这篇把并发控制拆开：并发会生什么病、MVCC 快照怎么治读、锁又怎么治写。

> **环境与安全**：以 MySQL 8.0 + InnoDB 为准，默认隔离级别 RR。`FOR UPDATE`、`data_locks` 观察请在实验库演练——当前读会真实持有锁，别在跑着的业务库上试。文中事务 ID、输出均为演示数据。

> 把并发事务想成合租室友共用一间厨房：
>
> - 冰箱里食材的库存照片 → **ReadView / MVCC 快照**：做饭全程按照片看，不管别人中途改了什么
> - 改动前先给旧食材拍照 → **undo log**：能还原，也留着旧版本给照片用
> - 先记采购账再动手 → **redo log**：做了一半断电，账本还在
> - 灶台挂「占用中」的牌子 → **行锁 / 间隙锁**：这块地方我先用，别人别插手
> - 厨房的合租规矩严一点还是松一点 → **隔离级别**

## 先修与验收标准

先修：知道事务的 BEGIN/COMMIT，写过 UPDATE；了解[一条 SQL 的一生](./lifecycle)里 undo/redo 的位置更好。

验收：能区分脏读、不可重复读、幻读；能说清 RC 与 RR 的 ReadView 建立时机差异；能沿 undo 版本链做一次可见性判断；能说明「快照读靠 MVCC、当前读靠 Next-Key Lock」的分工。

## 一、并发不隔离，会生三种病

厨房没规矩时，三个经典症状：

| 症状 | 场景 | 一句话 |
| --- | --- | --- |
| 脏读 | T1 读到 T2 **还没提交**的修改 | 拿了别人没洗的碗 |
| 不可重复读 | T1 同事务内两次读**同一行**，结果不同（T2 UPDATE 已提交） | 切菜中途案板上的菜被换了 |
| 幻读 | T1 同事务内两次查**同一范围**，行数不同（T2 INSERT/DELETE 已提交） | 数好的 3 个鸡蛋，回头多了一个 |

注意后两者的分界：不可重复读是**同一行内容**变了（UPDATE），幻读是**范围行数**变了（INSERT/DELETE）。防的手段也不一样——这正是后面 MVCC 和锁分工的原因。

## 二、操作 → 观察 → 原理：同一份数据，两个世界

回到开头的场景。先切隔离级别，再逐步走时间线，看 T1 第二次读到什么：

<ClientOnly>
  <LearningTabs id="iso-level" v-model="isoLevel" label="选择隔离级别" :options="isoOptions">
    <template #rc>
      <p><strong>RC 规则</strong>：每条 SELECT 都新建一个 ReadView——永远能看到「本语句开始时」已提交的最新数据。</p>
    </template>
    <template #rr>
      <p><strong>RR 规则</strong>：事务内第一条快照读建立 ReadView 并贯穿整个事务——整个做饭过程只看同一张库存照片。</p>
    </template>
  </LearningTabs>
  <LearningSteps id="tx-timeline" v-model="txStep" label="T1 / T2 交错时间线" :steps="txSteps">
    <template #t1begin>
      <p>T1 <code>BEGIN</code>。注意：<strong>此刻还没有 ReadView</strong>——两个级别都是等第一条快照读才真正拍照。</p>
    </template>
    <template #t1read1>
      <p>T1 <code>SELECT balance → 100</code>（行的可见版本 trx=50，早已提交）。{{ isoLevel === 'rr' ? 'RR：这一读建立 ReadView，之后整个事务都用它判断可见性。' : 'RC：本条语句的临时快照，用完即弃。' }}</p>
    </template>
    <template #t2write>
      <p>T2 <code>UPDATE balance = 70; COMMIT;</code> 新版本 trx=60 落盘，旧值 100 进了 undo 版本链——它没有消失。</p>
    </template>
    <template #t1read2>
      <p>T1 再 <code>SELECT balance</code>：</p>
      <p><strong>读到 {{ secondRead }}</strong>。{{ secondReadNote }}</p>
    </template>
  </LearningSteps>
</ClientOnly>

切到 RC 重走一遍：同一个 T1、同一个动作序列，第二次读却从 100 变成 70。**差别不在数据，在「照片什么时候拍的」**——RC 每条语句拍一张新照片，RR 一个事务只用一张照片。这就是不可重复读在 RC 下发生、在 RR 下被挡住的全部机关。

## 三、MVCC 内部：版本链与 ReadView 的判断规则

照片不是魔法，它的实现是两条隐藏列加一张可见性名单：

- 每行有 `trx_id`（最后改它的事务）和 `roll_pointer`（指向 undo log 里的上一版本）——一行数据背后挂着一串历史版本；
- ReadView 拍照时记下：<LearningPopover term="ReadView 四要素" content="creator_trx_id 创建者、m_ids 拍照时仍活跃的事务名单、min_trx_id 活跃最小 ID、max_trx_id 下一个将分配的 ID。判断一个版本可见与否全靠这四个数。" />，用来回答「这个版本我该不该看见」。

可见性判断规则（对版本上的 trx_id）：

| 条件 | 判定 |
| --- | --- |
| trx_id = creator | 可见——自己改的当然看得见 |
| trx_id &lt; min_trx_id | 可见——拍照前已提交 |
| trx_id ≥ max_trx_id | 不可见——拍照后才出生的版本 |
| 落在 [min, max) 且 trx_id ∈ m_ids | 不可见——拍照时它还活跃（未提交） |
| 落在 [min, max) 且 trx_id ∉ m_ids | 可见——拍照时已提交 |

现在把规则跑一遍。场景：行版本链为 `trx=80 → trx=60 → trx=50`，T1 的 ReadView 是 `creator=70, m_ids=[60,80], min=60, max=81`。沿链条逐步回溯：

<ClientOnly>
  <LearningSteps id="undo-chain" v-model="chainStep" label="沿 undo 版本链找可见版本" :steps="chainSteps">
    <template #v80>
      <p>先看最新版本 <strong>trx=80</strong>：80 在 m_ids=[60,80] 里——拍照时它还活跃未提交，<strong>不可见</strong>。沿 roll_pointer 回溯。</p>
    </template>
    <template #v60>
      <p>上一版 <strong>trx=60</strong>：60 也在 m_ids 里，同样活跃未提交，<strong>不可见</strong>。继续回溯。</p>
    </template>
    <template #v50>
      <p>再上一版 <strong>trx=50</strong>：50 &lt; min(60)，拍照前已提交，<strong>可见</strong>——SELECT 返回这个旧值。所谓「读快照」，是真的沿 undo 链把旧版本走回来，不是读某个缓存副本。</p>
    </template>
  </LearningSteps>
</ClientOnly>

## 四、四种隔离级别：合租规矩的松紧

把前面的机制按级别摆成一张表：

| 级别 | 脏读 | 不可重复读 | 幻读 | 实现要点 |
| --- | --- | --- | --- | --- |
| 读未提交 RU | 会 | 会 | 会 | 不建 ReadView，直接读最新版本 |
| 读已提交 RC | 否 | 会 | 会 | 每条 SELECT 新建 ReadView |
| 可重复读 RR（默认） | 否 | 否 | 快照读不会 | 首次快照读建 ReadView 贯穿事务 |
| 串行化 | 否 | 否 | 否 | 普通 SELECT 也按当前读加锁，并发基本消失 |

级别越高越安全、并发越差——规矩越严，厨房里能同时干活的人越少。RR 是 InnoDB 的折中：用一张照片挡住大部分并发问题，又不至于把人赶出厨房。RC 常见于读多、对「同事务读到新值」不敏感的业务；互联网大厂也有主动降到 RC 减轻 undo 链压力的做法。

## 五、幻读的双保险：快照读与当前读的分工

RR 防幻读不是一招鲜，得看你怎么读：

- **快照读**（普通 `SELECT`）：走 MVCC，照片里没有的行永远看不到——天然防幻读；
- **当前读**（`SELECT ... FOR UPDATE`、`UPDATE`、`INSERT`、`DELETE`）：必须读最新已提交数据，MVCC 帮不上忙，靠 <LearningPopover term="Next-Key Lock" content="记录锁 + 间隙锁的组合：不光锁住命中的行，还锁住行与行之间的间隙，别人没法往里 INSERT——正是防幻读需要的。" /> 把范围焊死。

在实验库亲眼看看这块「焊死」的范围（最后一条要在**另一个连接**里执行）：

<ClientOnly>
  <LearningTerminal id="lock-observe" label="当前读与锁观察会话" :script="lockScript" prompt="mysql>" />
</ClientOnly>

`FOR UPDATE` 之后 `data_locks` 里出现了覆盖 id=6、id=9 以及 supremum（正无穷哨兵）的 X 锁——Next-Key Lock 实际是「记录 + 它前面的间隙」的组合，(5, +∞) 整个区间都进不去新人。会话 B 的 `INSERT id=8` 只能干等到超时——幻读被物理手段挡住了。

<ClientOnly>
  <LearningFlipCard
    question="RR 级别下幻读绝对不可能发生吗？"
    answer="快照读确实不会。但混用读写会出意外：T1 快照读没看到某行（T2 刚插入），接着 T1 对该范围 UPDATE——这是当前读，会改到那行，而且改完它就变成 T1 自己可见的版本。防御靠纪律：范围内有写入意图就尽早上 FOR UPDATE 或用唯一约束兜底，别依赖「我先查过没有」。"
  />
</ClientOnly>

## 六、回到 ACID：四个性质各自由谁兜底

把 ACID 摊开看，会发现它不是四个并列的机制，而是一条因果链：

| 性质 | 含义 | 谁兜底 |
| --- | --- | --- |
| A 原子性 | 要么全成功要么全失败 | **undo log**：每处改动先留旧值，回滚按链还原 |
| I 隔离性 | 并发事务互不干扰 | **MVCC + 锁**：本文主角 |
| D 持久性 | 提交后不丢 | **redo log + 两阶段提交**（见[一条 SQL 的一生](./lifecycle)） |
| C 一致性 | 前后都满足业务约束 | 是 A、I、D 加上业务约束的**结果**，没有单独的「一致性机制」 |

<ClientOnly>
  <LearningQuiz
    id="mvcc-quiz"
    question="T1 的 ReadView 为 creator=70、m_ids=[60,80]、min=60、max=81；行的版本链是 trx=80 → trx=60 → trx=50。SELECT 最终读到哪个版本？"
    :options="[
      { value: 'a', label: 'trx=80——最新版本总是可见' },
      { value: 'b', label: 'trx=60——它比 max 小' },
      { value: 'c', label: 'trx=50——80 和 60 都在 m_ids 中不可见，50 早于拍照点已提交' },
      { value: 'd', label: '读不到任何版本，报错' },
    ]"
    answer="c"
    explanation="80 和 60 都落在 m_ids（拍照时仍活跃未提交）里，均不可见；沿 roll_pointer 回溯到 trx=50 < min=60，拍照前已提交，可见。m_ids 与 max 的边界判断是 MVCC 最容易记混的地方。"
  />
</ClientOnly>

## 练习：判断可见性

行版本链 `trx=90 → trx=75 → trx=40`，T1 的 ReadView 为 `creator=85, m_ids=[75,90], min=75, max=91`。SELECT 读到哪个版本？如果 T1 是 RC 级别、第二次读时 trx=90 已提交呢？

<details>
<summary>参考答案</summary>
<p>第一问：90、75 都在 m_ids 中不可见，回溯到 trx=40 &lt; min(75)，已提交可见——读 trx=40 的旧值。第二问：RC 下第二条 SELECT 新建 ReadView，此时 90 已提交（不在新 m_ids 中），直接读最新版本 trx=90——同一行两次读不一样，正是 RC 允许的不可重复读。</p>
</details>

## 总结

并发控制的分工可以一句话说完：**读多的事交给 MVCC 的照片，写抢地盘的事交给锁。** ReadView 在 RC 下每条语句拍一张、在 RR 下一个事务只用一张，差别仅此而已；可见性判断就是拿着四要素沿 undo 链往回走；幻读则拆成两半——快照读由照片挡住，当前读由 Next-Key Lock 焊死范围。

想继续深入，推荐阅读：[索引底层原理](./indexing)（锁挂在索引记录上）、[一条 SQL 的一生](./lifecycle)（undo/redo 在执行链路中的位置）、[慢 SQL 排查实战](./optimize)（`Waiting for lock` 的排查），或回到 [MySQL 专题](./index)看完整目录。
