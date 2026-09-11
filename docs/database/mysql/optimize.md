---
title: "慢 SQL 排查实战：从告警到验证的完整链路"
date: 2026-09-11
tags: [MySQL, 慢查询, EXPLAIN, 性能排查]
description: "用医生问诊的思路走完整条排查链路：开慢日志取证、读懂 EXPLAIN 化验单、对照常见慢因、优化后重测验证。"
category: "数据库"
layout: doc
---

<script setup>
import { computed, ref } from 'vue'
import {
  LearningSteps,
  LearningTabs,
  LearningSlider,
  LearningCounter,
  LearningFlipCard,
  LearningQuiz,
  LearningPopover,
} from '../../../config/.vitepress/theme/components/learning'

const flowStep = ref('detect')
const flowSteps = [
  { value: 'detect', label: '发现与界定' },
  { value: 'evidence', label: '取证' },
  { value: 'analyze', label: '分析计划' },
  { value: 'fix', label: '优化' },
  { value: 'verify', label: '验证' },
]

const MIN_ROWS_WAN = 1
const MAX_ROWS_WAN = 1000
const ROWS_PER_WAN = 10000
const SECONDARY_HIT_RATE = 0.01

const rowsWan = ref(50)
const queryMode = ref('noindex')
const queryModeOptions = [
  { value: 'noindex', label: '无可用索引' },
  { value: 'secondary', label: '二级索引 + 回表' },
  { value: 'pk', label: '主键等值' },
]
const totalRows = computed(() => rowsWan.value * ROWS_PER_WAN)
const scannedRows = computed(() => {
  if (queryMode.value === 'pk') return 1
  if (queryMode.value === 'secondary') return Math.max(1, Math.round(totalRows.value * SECONDARY_HIT_RATE))
  return totalRows.value
})
const lookupCount = computed(() => (queryMode.value === 'secondary' ? scannedRows.value : 0))

const scenarioTab = ref('func')
const scenarioOptions = [
  { value: 'func', label: '函数包裹索引列' },
  { value: 'like', label: '前导 % 模糊匹配' },
  { value: 'leftmost', label: '违反最左前缀' },
  { value: 'implicit', label: '隐式类型转换' },
  { value: 'paging', label: '深分页' },
]
const scenarios = {
  func: {
    sql: "SELECT * FROM orders WHERE YEAR(created_at) = 2026;",
    sign: 'type=ALL、key=NULL。索引列被函数包裹，B+ 树存的是原始值，无法直接和函数结果比较，只能全表扫。',
    fix: "SELECT * FROM orders\nWHERE created_at >= '2026-01-01'\n  AND created_at <  '2027-01-01';",
  },
  like: {
    sql: "SELECT * FROM users WHERE phone LIKE '%1234';",
    sign: 'type=ALL。前导 % 让 B+ 树失去排序起点，phone 上的索引用不上。',
    fix: "-- 能改需求：前缀匹配可以走索引\nWHERE phone LIKE '138%'\n-- 改不了需求：考虑全文索引或搜索引擎",
  },
  leftmost: {
    sql: "-- 已有联合索引 (city, age, gender)\nSELECT * FROM users\nWHERE age = 30 AND gender = 'F';",
    sign: 'key=NULL 或 key_len 偏短。丢掉最左列 city，联合索引后半段排不上用场。',
    fix: "-- 补上最左列，或按查询频率调整索引列顺序\nWHERE city = 'hangzhou' AND age = 30 AND gender = 'F';",
  },
  implicit: {
    sql: "-- phone 列是 VARCHAR 类型\nSELECT * FROM users WHERE phone = 13800000000;",
    sign: 'type=ALL。字符串列和数字比较触发隐式转换，等价于给索引列套了层函数。',
    fix: "SELECT * FROM users WHERE phone = '13800000000';",
  },
  paging: {
    sql: "SELECT * FROM orders ORDER BY id LIMIT 100000, 20;",
    sign: 'rows 约 100020。先扫出前 100020 行、丢掉前 10 万，只为取最后 20 行。',
    fix: "-- 记住上一页最大 id，把偏移量改成范围条件\nSELECT * FROM orders\nWHERE id > 98210  -- 上一页最后一条的 id\nORDER BY id LIMIT 20;",
  },
}
</script>

# 慢 SQL 排查实战：从告警到验证的完整链路

凌晨两点，监控告警：订单列表接口 P99 从 200 毫秒飙到 8 秒。第一反应是「加个索引」？医生不会没看化验单就开刀——先弄清病在哪，再决定下刀的位置。

> **环境与安全**：以 MySQL 8.0 + InnoDB 为准。文中 `SET GLOBAL`、慢日志、锁视图查询都请先在实验库或只读实例上演练；生产变更需要授权、低峰窗口和回滚方案。`pt-query-digest` 属于 percona-toolkit，通常在 Linux 上运行，Windows 可借助 Docker Desktop 或 WSL2。文中的订单表与扫描行数是标注了假设的估算模型，不是某台真实机器的实测值。

> - 门诊病历 → 慢查询日志与 `PROCESSLIST`：先知道「谁病了、病多久」
> - 化验单 → `EXPLAIN`：不真正执行，也能看到优化器打算怎么跑
> - 药房取药路线 → 索引、回表、扫描行数：路线对了才快
> - 复诊复查 → 优化后重测并复看慢日志：要证据，不要祈祷

## 先修与验收标准

先修：会写基础 SELECT / JOIN，知道「索引能加速查找」这一直觉即可；想深入原理可配合[索引底层原理](./indexing)。

验收：能开出慢日志并捞出消耗最高的 TOP SQL；能说出 EXPLAIN 中 type、key、rows、Extra 的含义；能识别至少 5 种索引失效写法；能区分「执行慢」与「等锁慢」；优化后能拿出前后对照证据，而不是一句「感觉快了」。

## 一、排查主流程：先走流程，再谈技巧

慢 SQL 排查最忌讳想到哪查到哪。把下面五步走顺，每一步都在缩小嫌疑范围：

<ClientOnly>
  <LearningSteps id="slow-sql-flow" v-model="flowStep" label="慢 SQL 排查五步走" :steps="flowSteps">
    <template #detect>
      <p>明确「谁在慢」：是单个接口、单条 SQL，还是整库一起抖？记录告警时间、影响范围、能否稳定复现。整库都慢先查机器资源（CPU、IO、连接数），别急着盯单条 SQL。</p>
    </template>
    <template #evidence>
      <p>让数据库自己交代：慢查询日志按总耗时排行捞 TOP SQL；<code>SHOW FULL PROCESSLIST</code> 看「此刻」正在跑什么。前者看历史账本，后者看案发现场。</p>
    </template>
    <template #analyze>
      <p>把嫌疑 SQL 拿去 <code>EXPLAIN</code>：不执行就能看到执行计划。重点看 type、key、rows、Extra 四个字段，下一节细讲。</p>
    </template>
    <template #fix>
      <p>一次只改一个变量：改 SQL 写法或加索引。改完立刻 EXPLAIN 对比，别一次改五处然后说不清哪处起了效。</p>
    </template>
    <template #verify>
      <p>低峰期重测真实耗时，复看慢日志确认该 SQL 不再上榜。没有前后对照数据的优化，等于没做。</p>
    </template>
  </LearningSteps>
</ClientOnly>

## 二、取证：让数据库自己交代

### 慢查询日志：事后的病历本

```sql
-- 动态开启（重启失效；对已有连接不一定生效）
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;                  -- 执行超过 1 秒就记
SET GLOBAL log_queries_not_using_indexes = 'ON'; -- 没用索引的也记

-- 确认日志落在哪个文件
SHOW VARIABLES LIKE 'slow_query_log_file';
```

`SET GLOBAL` 需要相应系统变量权限，且只影响新连接。长期使用要写进 `my.cnf`：

```ini
[mysqld]
slow_query_log = 1
long_query_time = 1
log_queries_not_using_indexes = 1
```

`log_queries_not_using_indexes` 打开后，没走索引的语句哪怕很快也会被记录——日志量会变大，排查窗口外建议关掉或调回阈值。

### PROCESSLIST：案发现场快照

```sql
SHOW FULL PROCESSLIST;
```

看 `Time`、`State`、`Info` 三列：哪条 SQL 跑了多久、卡在什么状态。MySQL 8.0 还可以查 `performance_schema.threads` 或 `sys.session` 拿更细的现场。

### pt-query-digest：把病历汇总成报告

慢日志原文是流水账，用它聚合成「哪类 SQL 消耗了最多总时间」：

```bash
# Linux（percona-toolkit 包），慢日志路径以实际配置为准
pt-query-digest /var/log/mysql/slow.log > slow_report.txt
```

报告按「总耗时」排序，排头的那条往往比「单次最慢」更值得先处理——慢 10 秒跑 1 次，不如慢 0.5 秒跑 10 万次伤人。Windows 上没有原生命令，可在 Docker / WSL2 里跑，或直接在慢日志里按 `Query_time` 粗筛。

<ClientOnly>
  <LearningFlipCard
    question="把 slow_query_log 打开后，之前的慢 SQL 会被补记吗？"
    answer="不会。慢日志只记录开启之后执行、且耗时超过 long_query_time（或没走索引且对应开关打开）的语句。SET GLOBAL 对已有连接不一定生效，重启后丢失要写入 my.cnf。所以取证必须在故障复现的时间窗口内做——病历只记未来的病。"
  />
</ClientOnly>

## 三、读懂 EXPLAIN：这张化验单怎么看

拿到嫌疑 SQL，先别执行，给它开一张化验单：

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'paid' ORDER BY created_at DESC LIMIT 20;
```

重点看四列：

| 列 | 含义 | 健康标准 |
| --- | --- | --- |
| type | 访问方式 | const / eq_ref / ref / range 依次递减，大表出现 ALL 基本就要处理 |
| key | 实际使用的索引 | NULL 说明没走任何索引 |
| rows | 预估扫描行数 | 是优化器的估算而非精确值，但数量级不会骗人 |
| Extra | 附加信息 | `Using index`（覆盖索引）是好信号；`Using filesort`、`Using temporary` 要警惕 |

### 操作 → 观察 → 原理：扫描行数才是慢的根

**离散估算模型**：假设 `orders` 表共 N 行（滑块控制，单位万行），数据均匀分布，忽略缓存与并发。三种取药路线：

- **全表扫描**：逐行翻完全表，扫 N 行；
- **二级索引 + 回表**：假设条件命中 1% 的行，先扫 0.01N 个索引项，每一项再<LearningPopover term="回表" content="二级索引的叶子节点只存索引列和主键值；要拿整行数据，得拿着主键再回聚簇索引查一次。命中行越多，回表代价越大。" />一次取整行；
- **主键等值**：沿聚簇索引 B+ 树定位到 1 行。

这不是 EXPLAIN 的真实算法，也不是耗时预测——只为让你直观感受「扫描行数」的数量级差异。

<ClientOnly>
  <LearningSlider v-model="rowsWan" label="orders 表数据量" :min="MIN_ROWS_WAN" :max="MAX_ROWS_WAN" unit=" 万行" />
  <LearningTabs id="slow-sql-scan" v-model="queryMode" label="选择取药路线" :options="queryModeOptions">
    <template #noindex>
      <p>条件列没有任何可用索引：MySQL 只能逐行扫完全表，EXPLAIN 给出 type=ALL、rows≈N。表越大越致命。</p>
    </template>
    <template #secondary>
      <p>走二级索引只命中 1% 的行（假设值），但 <code>SELECT *</code> 要取整行，每个命中项都得回表一次。rows 小了，回表次数跟着命中数走。</p>
    </template>
    <template #pk>
      <p>主键等值查询：B+ 树一般 3 层就能覆盖千万级行数，无论表多大，扫描行数恒为 1。</p>
    </template>
  </LearningTabs>
  <LearningCounter label="预估扫描行数" :value="scannedRows" unit=" 行" />
  <LearningCounter label="预估回表次数" :value="lookupCount" unit=" 次" />
</ClientOnly>

把滑块从 1 万拖到 1000 万再切回来看看：全表扫描从 1 万行涨到 1000 万行，而主键等值始终是 1 行。

慢 SQL 的本质大多是**扫描行数远大于返回行数**——索引的作用就是把要扫的圈子画小。回表次数则解释了另一个常见困惑：「明明走了索引为什么还慢」——命中 50 万行、回表 50 万次，未必比全表扫便宜。

## 四、五种典型病因：症状 → 化验单 → 处方

下面五种写法是慢 SQL 的常客。切换对照「症状 SQL、EXPLAIN 特征、处方」：

<ClientOnly>
  <LearningTabs id="slow-sql-scenarios" v-model="scenarioTab" label="常见索引失效场景" :options="scenarioOptions">
    <template #func>
      <p><strong>症状 SQL</strong></p>
      <pre><code>{{ scenarios.func.sql }}</code></pre>
      <p><strong>化验单</strong>：{{ scenarios.func.sign }}</p>
      <p><strong>处方</strong></p>
      <pre><code>{{ scenarios.func.fix }}</code></pre>
    </template>
    <template #like>
      <p><strong>症状 SQL</strong></p>
      <pre><code>{{ scenarios.like.sql }}</code></pre>
      <p><strong>化验单</strong>：{{ scenarios.like.sign }}</p>
      <p><strong>处方</strong></p>
      <pre><code>{{ scenarios.like.fix }}</code></pre>
    </template>
    <template #leftmost>
      <p><strong>症状 SQL</strong></p>
      <pre><code>{{ scenarios.leftmost.sql }}</code></pre>
      <p><strong>化验单</strong>：{{ scenarios.leftmost.sign }}</p>
      <p><strong>处方</strong></p>
      <pre><code>{{ scenarios.leftmost.fix }}</code></pre>
    </template>
    <template #implicit>
      <p><strong>症状 SQL</strong></p>
      <pre><code>{{ scenarios.implicit.sql }}</code></pre>
      <p><strong>化验单</strong>：{{ scenarios.implicit.sign }}</p>
      <p><strong>处方</strong></p>
      <pre><code>{{ scenarios.implicit.fix }}</code></pre>
    </template>
    <template #paging>
      <p><strong>症状 SQL</strong></p>
      <pre><code>{{ scenarios.paging.sql }}</code></pre>
      <p><strong>化验单</strong>：{{ scenarios.paging.sign }}</p>
      <p><strong>处方</strong></p>
      <pre><code>{{ scenarios.paging.fix }}</code></pre>
    </template>
  </LearningTabs>
</ClientOnly>

::: warning 一个反直觉的点
小表（几千行以内）全表扫未必比走索引慢，优化器有时会故意选 ALL。重点盯的是「大表 + ALL + 高 rows」的组合，不是见 ALL 就加索引。
:::

## 五、不是所有慢都在执行：也许它在等锁

SQL 计划本身没问题，却偶发超时——病人没病，是药房门口排了长队。行锁、间隙锁被长事务占着不放，后来的当前读只能干等。

EXPLAIN 帮不上忙：它只描述执行计划，不描述排队。分辨方法是看现场和锁视图（MySQL 8.0+）：

```sql
-- 谁在等谁：blocking / waiting 一目了然
SELECT * FROM sys.innodb_lock_waits;

-- 更底层：当前持有的锁与活跃事务
SELECT * FROM performance_schema.data_locks;
SELECT * FROM information_schema.innodb_trx;
```

典型信号：`PROCESSLIST` 里 State 出现 `lock` 字样、Time 持续增长，而 EXPLAIN 显示计划正常。处置思路是找到 blocking 事务让业务方提交或回滚，而不是直接 `KILL`——杀连接需要权限，且可能触发大面积回滚，先确认它是什么再动手。

## 六、优化不是终点：验证闭环

改完不算完，复诊才算数：

1. **重跑 EXPLAIN**：type 是否从 ALL 变成 ref/range，rows 是否降下来；
2. **同一缓存状态下重测**：第一次慢、第二次快可能只是 buffer pool 预热，不是优化的功劳——对比要控制缓存变量；
3. **复看慢日志 / pt-query-digest**：确认这条 SQL 真的从榜上消失，而不是被你「感觉好了」。

<ClientOnly>
  <LearningQuiz
    id="slow-sql-quiz"
    question="EXPLAIN 输出 type=ALL、key=NULL、rows=4,800,000、Extra=Using where，最说明什么？"
    :options="[
      { value: 'a', label: '表太小，优化器故意选了全表扫描' },
      { value: 'b', label: '查询条件没用上索引，正在全表扫描约 480 万行' },
      { value: 'c', label: '这条 SQL 正在等锁' },
      { value: 'd', label: '需要调大 innodb_buffer_pool_size' },
    ]"
    answer="b"
    explanation="rows 是预估扫描行数；大表 + ALL + key=NULL 是典型的索引缺失或失效信号。锁等待不会出现在 EXPLAIN 里，要查锁视图；buffer pool 大小与这份计划没有直接因果。"
  />
</ClientOnly>

## 练习：看化验单下诊断

某慢日志捞出的 SQL 与它的 EXPLAIN：

```sql
EXPLAIN SELECT * FROM orders
WHERE YEAR(created_at) = 2026
ORDER BY amount DESC
LIMIT 20;
-- type=ALL, key=NULL, rows=4800000
-- Extra: Using where; Using filesort
```

写出你的诊断（至少两处问题）和处方，再展开对照。

<details>
<summary>参考诊断</summary>
<p>两处问题：① <code>YEAR(created_at)</code> 函数包裹索引列，type=ALL 全表扫；② <code>ORDER BY amount</code> 无可用索引，Extra 出现 filesort。处方：把时间条件改成范围 <code>created_at >= '2026-01-01' AND created_at < '2027-01-01'</code>；若该查询高频，建联合索引 <code>(created_at, amount)</code> 可同时消掉 filesort。改完重跑 EXPLAIN 对比 type 与 Extra。</p>
</details>

## 总结

慢 SQL 排查和看病是同一套逻辑：病历（慢日志、PROCESSLIST）告诉你谁病了，化验单（EXPLAIN）告诉你病在哪，处方（改写法、加索引）对症下刀，复诊（重测与复看日志）确认痊愈。跳过取证直接加索引，等于没看化验单就开刀。

想继续深入，推荐阅读：[索引底层原理](./indexing)（B+ 树、回表、最左前缀）、[事务 ACID 与 MVCC](./transaction)（快照读与锁），或回到 [MySQL 专题](./index)看完整目录。
