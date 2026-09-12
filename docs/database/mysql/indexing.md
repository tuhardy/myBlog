---
title: "索引底层原理：B+ 树、回表与最左前缀"
date: 2026-09-12
tags: [MySQL, 索引, B+树, 回表, 覆盖索引]
description: "用图书馆找书的方式理解索引：为什么选 B+ 树、聚簇索引与二级索引差在哪、回表与覆盖索引、联合索引的最左前缀。"
category: "数据库"
layout: doc
---

<script setup>
import { computed, ref } from 'vue'
import {
  LearningTabs,
  LearningSlider,
  LearningCounter,
  LearningFlipCard,
  LearningQuiz,
  LearningPopover,
  LearningTerminal,
  LearningHotspot,
} from '../../../config/.vitepress/theme/components/learning'

const MIN_ROWS_WAN = 1
const MAX_ROWS_WAN = 100000 // 100 亿行封顶
const ROWS_PER_WAN = 10000
const LEAF_PAGE_ROWS = 16 // 假设一个 16KB 叶子页装 16 行
const INTERNAL_FANOUT = 1170 // 16KB 页 ÷ (key+页指针约 14B)

const rowsWan = ref(1000)
const structTab = ref('bst')
const structOptions = [
  { value: 'bst', label: '二叉搜索树' },
  { value: 'bplus', label: 'B+ 树' },
  { value: 'hash', label: '哈希表' },
]
const totalRows = computed(() => rowsWan.value * ROWS_PER_WAN)
const treeLevels = computed(() => {
  const n = totalRows.value
  if (structTab.value === 'hash') return 1
  if (structTab.value === 'bst') return Math.ceil(Math.log2(Math.max(n, 2)))
  // B+ 树：叶子页数 = N/每页行数，内部层 = log_扇出(叶子页数)，再加叶子层
  const leafPages = Math.ceil(n / LEAF_PAGE_ROWS)
  if (leafPages <= 1) return 1
  return Math.ceil(Math.log(leafPages) / Math.log(INTERNAL_FANOUT)) + 1
})

const indexSpots = [
  { x: 6, y: 10, w: 82, h: 26, title: '非叶子节点', content: '只存索引分界值和子页指针，不存行数据。一页 16KB 能放上千个指针，所以树才长得矮——B 树在每个节点存行数据，同样的页扇出小得多，树就高了。' },
  { x: 2, y: 44, w: 44, h: 18, title: '聚簇索引叶子', content: '叶子节点就是按主键排好序的整行数据。主键查询走到叶子即拿到全部列，没有第二次查找。' },
  { x: 2, y: 62, w: 44, h: 12, title: '叶子双向链表', content: '所有叶子页用双向链表串成有序序列。范围查询定位起点后顺着链表扫，不回跳——这是 B+ 树赢过 B 树做范围扫的关键。' },
  { x: 53, y: 44, w: 34, h: 18, title: '二级索引叶子', content: '只存 (索引列值, 主键值) 两样东西，没有完整行——所以它更小更密，但要的列不在索引上就得回表。' },
  { x: 46, y: 30, w: 10, h: 14, title: '回表', content: '二级索引命中后拿到主键，再回聚簇索引按主键定位整行——多走一次 B+ 树。命中行越多，回表代价越大；需要的列都在索引上就不用回表，即覆盖索引。' },
]

const prefixTab = ref('full')
const prefixOptions = [
  { value: 'full', label: '三列全用' },
  { value: 'prefix', label: '只用前两列' },
  { value: 'skip', label: '跳过中间列' },
  { value: 'noleft', label: '丢了最左列' },
  { value: 'range', label: '范围截断' },
]

const explainScript = [
  { cmd: "EXPLAIN SELECT * FROM orders\nWHERE city = 'hangzhou' AND age = 30;", out: "+-------+------+------+---------+-----------------------------+\n| table | type | key  | rows    | Extra                       |\n+-------+------+------+---------+-----------------------------+\n| orders| ALL  | NULL | 1240000 | Using where                 |\n+-------+------+------+---------+-----------------------------+" },
  { cmd: 'CREATE INDEX idx_city_age ON orders(city, age);', out: 'Query OK, 0 rows affected (2.31 sec)\nRecords: 0  Duplicates: 0  Warnings: 0' },
  { cmd: "EXPLAIN SELECT * FROM orders\nWHERE city = 'hangzhou' AND age = 30;", out: "+-------+------+--------------+------+-----------------------------+\n| table | type | key          | rows | Extra                       |\n+-------+------+--------------+------+-----------------------------+\n| orders| ref  | idx_city_age |   96 |                             |\n+-------+------+--------------+------+-----------------------------+" },
  { cmd: "EXPLAIN SELECT city, age FROM orders\nWHERE city = 'hangzhou' AND age = 30;", out: "+-------+------+--------------+------+-----------------------------+\n| table | type | key          | rows | Extra                       |\n+-------+------+--------------+------+-----------------------------+\n| orders| ref  | idx_city_age |   96 | Using index                 |\n+-------+------+--------------+------+-----------------------------+" },
]
</script>

# 索引底层原理：为什么主键等值永远只扫一行

同样一张 124 万行的表，`WHERE id = 7` 毫秒级返回，`WHERE phone = '…'` 却要把全表翻一遍。差的不是运气，是数据被组织的方式。这篇把索引的物理结构拆开：为什么选 B+ 树、回表到底是什么动作、联合索引为什么挑食。

> **环境与安全**：以 MySQL 8.0 + InnoDB 为准。`CREATE INDEX` 请在实验库上演练——虽然 8.0 的 Online DDL 不锁表读写，但建索引会扫全表、吃 IO 和磁盘，大表上仍要选低峰窗口。文中的页容量、扇出、行数都是标注了假设的估算模型，不是实测值。

> 把 InnoDB 想成一座图书馆，索引就是它的检索系统：
>
> - 楼层导览牌 → **B+ 树非叶子节点**：只写「A–F 在三楼」，不放书
> - 按索书号排好的书架 → **聚簇索引**：书（整行数据）就在架上
> - 按书名排的卡片目录 → **二级索引**：卡片上只有索书号（主键）
> - 拿卡片回书架找书 → **回表**；卡片写全了你要的信息 → **覆盖索引**
> - 按「姓氏-名字」排序的电话簿 → **联合索引**：跳过姓氏没法查

## 先修与验收标准

先修：会写 SELECT 和基本 WHERE 条件；知道 SQL 要过优化器这一站即可（可参考[一条 SQL 的一生](./lifecycle)）。

验收：能说清 B+ 树为什么矮胖、叶子链表解决什么问题；能画出聚簇索引与二级索引的结构差异并解释回表；能判断 `EXPLAIN` 里 `Using index` 的含义；给定联合索引和 WHERE，能判断索引能用到第几列。

## 一、为什么是 B+ 树：矮胖赢过深瘦

索引的数据结构之争，本质是「树的高度」之争——每下一层≈一次磁盘 IO（页不在 buffer pool 时）。**离散估算模型**：假设表共 N 行（滑块控制），B+ 树一个 16KB 叶子页装 16 行、内部页每个指针占约 14B 即扇出约 1170；哈希表按理想一次命中计。拖动数据量、切换结构看层数：

<ClientOnly>
  <LearningSlider v-model="rowsWan" label="表数据量" :min="MIN_ROWS_WAN" :max="MAX_ROWS_WAN" unit=" 万行" />
  <LearningTabs id="index-struct" v-model="structTab" label="候选数据结构" :options="structOptions">
    <template #bst>
      <p>每层只分两叉，N 行数据树高 ⌈log₂N⌉。1 亿行需要约 27 层——27 次磁盘 IO 谁也救不回来。</p>
    </template>
    <template #bplus>
      <p>内部节点不存数据只存指针，一页上千扇出；叶子页用双向链表串成有序序列。10 亿行约 4 层，千万级只要 3 层——绝大多数查询 3 次 IO 内定位。</p>
    </template>
    <template #hash>
      <p>等值查询一次定位，比 B+ 树还快。但哈希没有顺序：范围、排序、前缀模糊、最左前缀全废——只能当储物柜，当不了图书馆目录。</p>
    </template>
  </LearningTabs>
  <LearningCounter label="估算层数 ≈ 磁盘 IO 次数" :value="treeLevels" unit=" 层" />
</ClientOnly>

把滑块拖到 1 亿行再切回来：二叉树要 27 层，B+ 树只要 4 层。这就是「矮胖」的意义——**层数由扇出决定，扇出由一页能放多少指针决定**。B 树在非叶子节点也存行数据，一页放不下几个指针，同数据量树更高；B+ 树把行数据全部压到叶子层，内部页成了纯粹的导览牌。

所以答案不是「B+ 树最快」，而是「在磁盘按页读写的世界里，矮胖 + 叶子有序链表的 B+ 树最划算」：等值查得快，范围查顺着链表扫，`ORDER BY` 还能白嫖叶子的天然顺序。

## 二、聚簇索引与回表：两次查找差在哪

InnoDB 的表数据本身就是按主键组织的聚簇索引；你在其它列上建的索引全是二级索引。点下图中的区域看每个部分存什么：

<ClientOnly>
  <LearningHotspot id="index-anatomy" label="聚簇索引 vs 二级索引结构图" :spots="indexSpots">
    <svg viewBox="0 0 660 340" role="img" aria-label="聚簇索引与二级索引结构对比示意" style="display:block;width:100%;height:auto;">
      <defs>
        <marker id="idx-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--vp-c-brand-1)" />
        </marker>
      </defs>
      <!-- 左：聚簇索引 -->
      <text x="155" y="22" text-anchor="middle" font-size="14" font-weight="700" fill="var(--vp-c-text-1)">聚簇索引（主键 id）</text>
      <rect x="105" y="40" width="100" height="32" rx="4" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-divider)" />
      <text x="155" y="60" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">id 分界值</text>
      <rect x="55" y="100" width="80" height="30" rx="4" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-divider)" />
      <rect x="185" y="100" width="80" height="30" rx="4" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-divider)" />
      <text x="95" y="119" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">页指针</text>
      <text x="225" y="119" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">页指针</text>
      <line x1="140" y1="72" x2="95" y2="100" stroke="var(--vp-c-text-3)" stroke-width="1" />
      <line x1="170" y1="72" x2="225" y2="100" stroke="var(--vp-c-text-3)" stroke-width="1" />
      <rect x="15" y="160" width="90" height="40" rx="4" fill="var(--vp-c-brand-1)" opacity="0.12" stroke="var(--vp-c-brand-1)" />
      <rect x="115" y="160" width="90" height="40" rx="4" fill="var(--vp-c-brand-1)" opacity="0.12" stroke="var(--vp-c-brand-1)" />
      <rect x="215" y="160" width="90" height="40" rx="4" fill="var(--vp-c-brand-1)" opacity="0.12" stroke="var(--vp-c-brand-1)" />
      <text x="60" y="178" text-anchor="middle" font-size="11" fill="var(--vp-c-text-1)">id=1 · 整行</text>
      <text x="160" y="178" text-anchor="middle" font-size="11" fill="var(--vp-c-text-1)">id=5 · 整行</text>
      <text x="260" y="178" text-anchor="middle" font-size="11" fill="var(--vp-c-text-1)">id=9 · 整行</text>
      <line x1="95" y1="130" x2="60" y2="160" stroke="var(--vp-c-text-3)" stroke-width="1" />
      <line x1="95" y1="130" x2="160" y2="160" stroke="var(--vp-c-text-3)" stroke-width="1" />
      <line x1="225" y1="130" x2="260" y2="160" stroke="var(--vp-c-text-3)" stroke-width="1" />
      <line x1="20" y1="218" x2="300" y2="218" stroke="var(--vp-c-brand-1)" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#idx-arr)" />
      <line x1="300" y1="226" x2="20" y2="226" stroke="var(--vp-c-brand-1)" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#idx-arr)" opacity="0.55" />
      <text x="160" y="245" text-anchor="middle" font-size="11" fill="var(--vp-c-text-3)">叶子页双向链表：范围查询顺链扫</text>
      <!-- 右：二级索引 -->
      <text x="490" y="22" text-anchor="middle" font-size="14" font-weight="700" fill="var(--vp-c-text-1)">二级索引（name）</text>
      <rect x="440" y="40" width="100" height="32" rx="4" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-divider)" />
      <text x="490" y="60" text-anchor="middle" font-size="12" fill="var(--vp-c-text-2)">name 分界值</text>
      <rect x="355" y="160" width="100" height="40" rx="4" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-divider)" />
      <rect x="470" y="160" width="100" height="40" rx="4" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-divider)" />
      <text x="405" y="178" text-anchor="middle" font-size="11" fill="var(--vp-c-text-2)">ann → 主键 1</text>
      <text x="405" y="192" text-anchor="middle" font-size="10" fill="var(--vp-c-text-3)">没有整行</text>
      <text x="520" y="178" text-anchor="middle" font-size="11" fill="var(--vp-c-text-2)">bob → 主键 5</text>
      <text x="520" y="192" text-anchor="middle" font-size="10" fill="var(--vp-c-text-3)">没有整行</text>
      <line x1="470" y1="72" x2="405" y2="160" stroke="var(--vp-c-text-3)" stroke-width="1" />
      <line x1="510" y1="72" x2="520" y2="160" stroke="var(--vp-c-text-3)" stroke-width="1" />
      <!-- 回表箭头 -->
      <path d="M 470 152 C 420 118 345 118 308 152" fill="none" stroke="var(--vp-c-brand-1)" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#idx-arr)" />
      <text x="388" y="112" text-anchor="middle" font-size="11" font-weight="700" fill="var(--vp-c-brand-1)">回表</text>
    </svg>
  </LearningHotspot>
</ClientOnly>

由此得到两条推论：

- **主键查询是单程票**：沿聚簇索引到叶子即拿整行，无论表多大扫描行数恒为 1；
- **二级索引可能是往返票**：索引叶子只有主键，`SELECT *` 要的其它列必须拿主键<LearningPopover term="回表" content="二级索引叶子只存索引列和主键值。要取整行就得拿主键回聚簇索引再定位一次——每命中一行回表一次。" />一次。

**覆盖索引**是往返票的豁免：查询要的所有列恰好都在二级索引上（含它自带的主键），就不回表。`EXPLAIN` 的 Extra 出现 `Using index` 就是这个标志——注意它和「用了索引」是两回事，type=ref 时也可能要回表。

## 三、最左前缀：电话簿的排序脾气

联合索引 `(city, age, gender)` 按三列字典序排序——像「姓氏-名字-中间名」的电话簿。挑一个 WHERE 看索引能用到第几列：

<ClientOnly>
  <LearningTabs id="index-prefix" v-model="prefixTab" label="联合索引 (city, age, gender) 的命中情况" :options="prefixOptions">
    <template #full>
      <p><code>WHERE city='hz' AND age=30 AND gender='F'</code></p>
      <p><strong>命中 city + age + gender</strong>。等值条件按序匹配，key_len 吃满整个索引。</p>
    </template>
    <template #prefix>
      <p><code>WHERE city='hz' AND age=30</code></p>
      <p><strong>命中 city + age</strong>。用到前两列没问题——最左前缀不要求用满，只要求从左边连续用。</p>
    </template>
    <template #skip>
      <p><code>WHERE city='hz' AND gender='F'</code></p>
      <p><strong>只命中 city</strong>。age 缺席后 gender 在索引里的局部顺序不保证有用——gender 只能靠 <LearningPopover term="索引条件下推" content="ICP：MySQL 5.6+ 把 WHERE 中能由索引列判断的部分下推到引擎层过滤，减少回表次数。用了 ICP 时 EXPLAIN 的 Extra 显示 Using index condition。" /> 在引擎层过滤或回表后在服务层过滤。</p>
    </template>
    <template #noleft>
      <p><code>WHERE age=30 AND gender='F'</code></p>
      <p><strong>通常不走该索引</strong>。丢了最左列 city，电话簿没了姓氏，只能全本翻——优化器多选 type=ALL 或索引全扫。</p>
    </template>
    <template #range>
      <p><code>WHERE city='hz' AND age>25 AND gender='F'</code></p>
      <p><strong>命中 city + age，到范围列为止</strong>。age 是范围条件，它之后的 gender 在索引中不再有序——「等值列可以用满，范围列是第一根终止柱」。排序同理：<code>ORDER BY city, age</code> 白嫖索引序，<code>ORDER BY age, city</code> 只能 filesort。</p>
    </template>
  </LearningTabs>
</ClientOnly>

规律一句话：**索引序是按 (city, age, gender) 整体排的，任何一列缺席或变成范围，它右边的列就失去排序可用了。**

<ClientOnly>
  <LearningFlipCard
    question="既然索引这么快，给每一列都建一个不就完了？"
    answer="索引不是免费的：每次 INSERT/UPDATE 都要同步维护所有相关索引树（写放大），索引本身占磁盘和 buffer pool，优化器还要在更多候选间估算成本。读多写少的列建索引才划算——这是读与写的权衡，不是读的单赢。"
  />
</ClientOnly>

## 四、操作 → 观察 → 原理：让 EXPLAIN 作证

理论说完，在实验库里把四个标志拍下来。切「动手敲」模式跟着练：

<ClientOnly>
  <LearningTerminal id="index-explain" label="索引前后 EXPLAIN 对比" :script="explainScript" prompt="mysql>" />
</ClientOnly>

| 观察 | 原理 |
| --- | --- |
| 建索引前 `type=ALL, rows=1240000` | 无可用索引只能全表扫，rows 是优化器的估算行数 |
| 建索引后 `type=ref, rows=96` | 走 `idx_city_age` 等值定位，扫描行数掉了四个数量级 |
| `SELECT city, age` 时 `Extra=Using index` | 要的两列都在索引上 → 覆盖索引，不回表 |
| `SELECT *` 同样走索引但没有 `Using index` | 索引里没有整行，命中 96 行就要回表 96 次 |

最后一行解释了生产里最常见的困惑——「明明走了索引为什么还慢」：**ref 只说明走了索引树，不说明省了回表**。命中率高的条件 + `SELECT *`，回表代价比全表扫还贵的情况真实存在，[慢 SQL 排查实战](./optimize)里的「二级索引 + 回表」实验可以拖滑块感受数量级。

<ClientOnly>
  <LearningQuiz
    id="index-quiz"
    question="已有联合索引 (a, b, c)，查询 WHERE a = 1 AND c = 3，索引的实际使用情况是？"
    :options="[
      { value: 'a', label: 'a 和 c 都命中索引，因为两列都在索引里' },
      { value: 'b', label: '只有 a 命中索引；b 缺席后 c 失去排序可用性，只能靠 ICP 或服务层过滤' },
      { value: 'c', label: '完全不走索引，因为条件没按索引顺序写' },
      { value: 'd', label: '走索引全扫描，比全表扫更慢' },
    ]"
    answer="b"
    explanation="最左前缀看的是连续性：a 等值命中后 b 缺席，c 在索引中的顺序对查询不可用。但 c 条件可在引擎层用 ICP 过滤（Extra: Using index condition），减少回表——'命中索引'和'利用索引过滤'是两回事。"
  />
</ClientOnly>

## 练习：给查询开索引

表 `orders(id, user_id, city, amount, created_at)`，高频查询：

```sql
SELECT user_id, amount FROM orders
WHERE city = 'hangzhou' AND created_at >= '2026-09-01'
ORDER BY amount DESC LIMIT 20;
```

设计一个联合索引并说明理由（考虑过滤选择性、范围截断和排序），再展开对照。

<details>
<summary>参考方案</summary>
<p><code>(city, amount, created_at)</code> 不理想——amount 排序和 created_at 范围互相打架。更合理的是 <code>(city, created_at, amount)</code>：city 等值 + created_at 范围都走索引，<code>SELECT user_id, amount</code> 全部在索引内（主键自带）→ 覆盖索引不回表；代价是 ORDER BY amount 仍需 filesort，但只排 20 行级别的候选集，代价可控。若 ORDER BY 才是瓶颈，反过来建 <code>(city, amount)</code> 用索引序消 filesort，让 created_at 走 ICP——按真实数据分布 EXPLAIN 验证后二选一。</p>
</details>

## 总结

索引的全部直觉可以归到两点：**矮胖的 B+ 树把定位压进常数次 IO**，**聚簇/二级索引之分决定了要不要回表**。最左前缀不是规则怪谈，只是「整体排序的字典序」的必然结果——任何列缺席或变范围，右边的列就乱序了。优化器的选择都可以被 `EXPLAIN` 拷问，别猜。

想继续深入，推荐阅读：[一条 SQL 的一生](./lifecycle)（优化器在流水线里的位置）、[事务隔离：MVCC 与锁的分工](./transaction)（索引上的快照读与锁）、[慢 SQL 排查实战](./optimize)（拿 EXPLAIN 做完整排查），或回到 [MySQL 专题](./index)看完整目录。
