// Learning 组件脚手架：一条命令完成机械接线，人工只需填实现与文档。
// 用法：node new-component.mjs <LearningXxx>（仓库根目录下执行）
//
// 自动完成：
//   1. 生成 config/.vitepress/theme/components/learning/<Name>.vue 骨架（含约定提示）
//   2. 向 learning/index.ts 追加导出
//   3. 生成 docs/notes/learning-components/<slug>.md 组件参考页桩
//   4. 向 config.mts 的 notes 侧边栏组件分组插入链接（// components:end 锚点）
//   5. 向 learning-components/index.md 选型表插入行（<!-- components:table-end --> 锚点）
//   6. 向 SKILL.md 组件索引表追加一行桩
// 仍需人工：实现组件、填写文档页各节；需要深层断言时在 verify-site.mjs
// 的 COMPONENT_PROBES 注册专属探针（不注册也能被自动发现，仅跑通用断言）。
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const name = process.argv[2]
assert.ok(/^Learning[A-Z][A-Za-z0-9]*$/.test(name || ''), '用法：node new-component.mjs <LearningXxx>（大驼峰，以 Learning 开头）')

const root = resolveRoot()
const suffix = name.slice('Learning'.length)
const slug = suffix.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).slice(1)
const cls = `learning-${slug}`
const componentPath = join(root, 'config/.vitepress/theme/components/learning', `${name}.vue`)
const indexPath = join(root, 'config/.vitepress/theme/components/learning/index.ts')
const docPath = join(root, 'docs/notes/learning-components', `${slug}.md`)
const overviewPath = join(root, 'docs/notes/learning-components/index.md')
const configPath = join(root, 'config/.vitepress/config.mts')
const skillPath = join(root, '.devin/skills/vitepress-interactive-writing/SKILL.md')

assert.ok(!existsSync(componentPath), `组件已存在：${componentPath}`)
assert.ok(!existsSync(docPath), `文档页已存在：${docPath}`)

function resolveRoot() {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir
    const parent = dirname(dir)
    assert.ok(parent !== dir, '未找到仓库根目录（缺少 package.json）')
    dir = parent
  }
}

function patch(file, anchor, insertion) {
  const text = readFileSync(file, 'utf8')
  assert.ok(text.includes(anchor), `锚点缺失：${file} 中找不到 ${JSON.stringify(anchor)}`)
  const patched = text.replace(anchor, `${insertion}${anchor}`)
  assert.notEqual(patched, text, `写入失败：${file}`)
  writeFileSync(file, patched)
}

const today = new Date().toISOString().slice(0, 10)

writeFileSync(componentPath, `<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <!-- TODO: 实现结构与交互；保持键盘可达与 aria 语义 -->
  <div class="${cls}">{{ label }}</div>
</template>

<style scoped>
.${cls} { padding: 20px; margin: 20px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
/* TODO: 焦点态用 :focus-visible 描边；动画补 prefers-reduced-motion 分支 */
</style>
`)

const indexText = readFileSync(indexPath, 'utf8')
assert.ok(!indexText.includes(`${name}.vue`), `导出已存在：${name}`)
writeFileSync(indexPath, `${indexText.trimEnd()}\nexport { default as ${name} } from './${name}.vue'\n`)

writeFileSync(docPath, `---
title: ${name} · TODO 一句话用途
date: ${today}
tags: [VitePress, 组件库]
description: ${name} 组件参考：TODO。
---

<script setup>
import { ${name} } from '../../../config/.vitepress/theme/components/learning'
</script>

# ${name} · TODO 一句话用途

**何时用**：TODO

**演示**：

<ClientOnly>
  <${name} label="TODO" />
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| label | string | 是 | TODO |

**调用**：

\`\`\`vue
<${name} label="……" />
\`\`\`

**边界**：TODO
`)

patch(configPath, '// components:end', `                { text: '${suffix}', link: '/notes/learning-components/${slug}' },\n`)
patch(overviewPath, '<!-- components:table-end', `| ${name} | TODO 用途 | TODO | TODO | [${slug}](./${slug}) |\n`)
patch(skillPath, '全部组件仅依赖项目 Vue', `| ${name} | TODO 用途 | TODO 接口（props / v-model / 插槽） |\n\n`)

console.log(`已生成 ${name} 骨架，剩余人工步骤：`)
console.log(`  1. 实现组件：${componentPath}`)
console.log(`  2. 填写文档页：${docPath}（何时用 / 演示 / 接口 / 调用 / 边界）`)
console.log(`  3. 填选型表与接口表行：${overviewPath}、${skillPath}`)
console.log(`  4. 需要深层交互断言时，在 verify-site.mjs 的 COMPONENT_PROBES 注册 '${cls}'`)
console.log(`  5. 验证：verify-article.mjs --changed → docs:build → verify-site.mjs --serve notes`)
