// verify-article.mjs — 互动教程写作规范的静态守门员：在构建前机械校验 frontmatter、
// 交互形态下限、script setup 导入有效性。纯 Node，不启动浏览器。
// 用法：node verify-article.mjs [--all | --changed | <md 文件> ...]
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIN_INTERACTION_FORMS = 2
const ESSENTIAL_FRONTMATTER = ['title', 'description']
const REQUIRED_FRONTMATTER = ['title', 'date', 'tags', 'description']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/
const RESOLVE_EXTENSIONS = ['.ts', '.mts', '.vue', '.js', '.jsx', '.tsx']
const CODE_EXTENSIONS = new Set(RESOLVE_EXTENSIONS)
const EXEMPT_LAYOUTS = /\blayout\s*:\s*(home|page)\b/
const SANDBOX_TAG = /<AlgorithmSandbox\b/
const LEARNING_TAG = /<Learning\w+\b/
const PAIRED_TAGS = ['ClientOnly', 'details']

// 交互形态自动发现：页面上出现的任意 <Learning\w+> 标签去重计数；
// 无效组件名由导入校验与浏览器 console 断言兜底，无需在此枚举
const LEARNING_USAGE = /<Learning(\w+)\b/g
const CUSTOM_BINDING = /\s(?:v-model|@click|@input|@change|v-on:click)=/
// 组件标签上的 v-model/@click 属于该组件形态本身；剥掉项目组件标签后残留的绑定才算页内自定义演示
const COMPONENT_TAG = /<\/?(?:Learning\w+|AlgorithmSandbox)\b[\s\S]*?>/g

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const docsRoot = join(repoRoot, 'docs')

function listMarkdown(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...listMarkdown(full))
    else if (entry.endsWith('.md')) found.push(full)
  }
  return found
}

function changedMarkdown() {
  const output = execFileSync('git', ['status', '--porcelain', '--', 'docs/'], { cwd: repoRoot, encoding: 'utf8' })
  const files = []
  for (const line of output.split('\n')) {
    if (!line.trim()) continue
    const pathPart = line.slice(3).split(' -> ').pop().trim().replace(/^"|"$/g, '')
    const full = resolve(repoRoot, pathPart)
    if (pathPart.endsWith('.md') && existsSync(full)) files.push(full)
  }
  return files
}

// 剥离 ``` / ~~~ 代码围栏：围栏内示例的 <script setup>、组件标签不得参与判定
function stripCodeFences(source) {
  const kept = []
  let fence = null
  for (const line of source.split('\n')) {
    const match = line.match(/^\s*(`{3,}|~{3,})/)
    if (match) {
      if (fence === null) fence = match[1]
      else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = null
      continue
    }
    if (fence === null) kept.push(line)
  }
  return kept.join('\n')
}

// 剥离行内代码 `...`：正文中的 `<ClientOnly>`、`<script setup>` 提及不计入真实用法
function stripInlineCode(source) {
  return source.split('\n').map(line => line.replace(/`+[^`\n]*`+/g, '')).join('\n')
}

const SCRIPT_BLOCK = /<script\s+setup[^>]*>([\s\S]*?)<\/script>/gi

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)
  if (!match) return null
  const fields = new Set()
  for (const line of match[1].split(/\r?\n/)) {
    const key = line.match(/^([A-Za-z_][\w-]*)\s*:/)
    if (key) fields.add(key[1])
  }
  return { fields, raw: match[1] }
}

function extractImports(script) {
  const imports = []
  for (const match of script.matchAll(/import\s+(?:type\s+)?([^'";]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    imports.push({ clause: match[1].trim(), specifier: match[2] })
  }
  for (const match of script.matchAll(/import\s+['"]([^'"]+)['"]/g)) {
    imports.push({ clause: null, specifier: match[1] })
  }
  return imports
}

// 解析相对导入：剥掉 ?query，依次尝试原样、补扩展名、目录 index
function resolveModule(fromDir, specifier) {
  const bare = specifier.split('?')[0]
  const absolute = resolve(fromDir, bare)
  const candidates = [absolute, ...RESOLVE_EXTENSIONS.map(ext => `${absolute}${ext}`), ...RESOLVE_EXTENSIONS.map(ext => join(absolute, `index${ext}`))]
  return candidates.find(candidate => existsSync(candidate) && statSync(candidate).isFile()) || null
}

function importedNames(clause) {
  const result = { named: [], wantsDefault: false }
  if (!clause) return result
  const brace = clause.match(/\{([^}]*)\}/)
  if (brace) {
    for (const part of brace[1].split(',')) {
      const name = part.trim().match(/^(?:type\s+)?([A-Za-z_$][\w$]*)/)?.[1]
      if (name) result.named.push(name)
    }
  }
  const head = clause.replace(/\{[^}]*\}/, '').replace(/,$/, '').trim()
  if (head && !head.startsWith('*')) result.wantsDefault = true
  return result
}

// 收集代码文件导出名：命名导出、as 别名、default；.data.* 按 VitePress 约定提供 data，.vue 隐含 default
function exportedNames(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const names = new Set()
  const reexportTargets = []
  for (const match of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}(?:\s+from\s+['"]([^'"]+)['"])?/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().match(/(?:\bas\s+)?([A-Za-z_$][\w$]*)$/)?.[1]
      if (name) names.add(name)
    }
    if (match[2]) reexportTargets.push(match[2])
  }
  for (const match of source.matchAll(/export\s+(?:declare\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1])
  if (/export\s+default\b/.test(source)) names.add('default')
  const star = /export\s*\*\s*(?:as\s+[A-Za-z_$][\w$]*\s+)?from/.test(source)
  if (/\.data\.[cm]?[jt]s$/.test(filePath)) names.add('data')
  if (/\.vue$/.test(filePath)) names.add('default')
  return { names, star, reexportTargets }
}

function checkFile(file) {
  const fails = []
  const warns = []
  const source = readFileSync(file, 'utf8')
  const body = stripInlineCode(stripCodeFences(source))
  const scripts = [...body.matchAll(SCRIPT_BLOCK)].map(match => match[1])
  const prose = body.replace(SCRIPT_BLOCK, '')
  const frontmatter = parseFrontmatter(source)
  const layoutExempt = frontmatter !== null && EXEMPT_LAYOUTS.test(frontmatter.raw)
  const isSandboxPage = SANDBOX_TAG.test(prose)
  const usesLearning = LEARNING_TAG.test(prose)
  const forms = [...new Set([...prose.matchAll(LEARNING_USAGE)].map(match => `Learning${match[1]}`))]
  if (/<details\b/.test(prose)) forms.push('details')
  if (CUSTOM_BINDING.test(prose.replace(COMPONENT_TAG, ''))) forms.push('页内自定义绑定')
  // 明确属于本 skill 产出的页面（使用 Learning 组件或算法沙盒）适用严格规则；
  // 组件参考文档目录下的页面逐组件单演示，豁免形态数量要求
  const isSkillPage = isSandboxPage || usesLearning
  const isComponentDoc = file.replace(/\\/g, '/').includes('/learning-components/')
  const report = (isSkillPage ? fails : warns)

  if (!frontmatter) report.push('缺少 frontmatter')
  else if (!layoutExempt) {
    for (const key of ESSENTIAL_FRONTMATTER) {
      if (!frontmatter.fields.has(key)) report.push(`frontmatter 缺少 ${key}`)
    }
    for (const key of REQUIRED_FRONTMATTER.filter(key => !ESSENTIAL_FRONTMATTER.includes(key))) {
      if (!frontmatter.fields.has(key)) warns.push(`frontmatter 缺少 ${key}`)
    }
    const dateValue = frontmatter.raw.match(/^date\s*:\s*["']?([^"'\s#]+)/m)?.[1]
    if (frontmatter.fields.has('date') && !DATE_PATTERN.test(dateValue || '')) warns.push(`date 应为 YYYY-MM-DD，实际：${dateValue}`)
  }

  if (!layoutExempt && !isSandboxPage && !isComponentDoc) {
    if (usesLearning && forms.length < MIN_INTERACTION_FORMS) fails.push(`仅 ${forms.length} 种交互形态（${forms.join('、')}），教学页要求 ≥${MIN_INTERACTION_FORMS} 处交互`)
    else if (!usesLearning && forms.length === 1) warns.push(`仅 1 种交互形态（${forms.join('、')}）；教学页建议 ≥${MIN_INTERACTION_FORMS} 处交互`)
    else if (forms.length === 0 && scripts.length > 0) warns.push('存在 script setup 但未检测到已知交互形态；若是教学页请补充交互')
  }

  for (const tag of PAIRED_TAGS) {
    const open = (prose.match(new RegExp(`<${tag}\\b`, 'g')) || []).length
    const close = (prose.match(new RegExp(`</${tag}>`, 'g')) || []).length
    if (open !== close) fails.push(`<${tag}> 标签不配对：${open} 开 / ${close} 闭`)
  }

  for (const script of scripts) {
    for (const entry of extractImports(script)) {
      if (!entry.specifier.startsWith('.')) continue
      const resolved = resolveModule(dirname(file), entry.specifier)
      if (!resolved) {
        fails.push(`导入路径无法解析：${entry.specifier}`)
        continue
      }
      if (!CODE_EXTENSIONS.has(extname(resolved))) continue
      const { names, star, reexportTargets } = exportedNames(resolved)
      for (const target of reexportTargets) {
        if (target.startsWith('.') && !resolveModule(dirname(resolved), target)) {
          fails.push(`重导出目标缺失：${entry.specifier} → ${target}`)
        }
      }
      const wanted = importedNames(entry.clause)
      for (const name of wanted.named) {
        if (!star && !names.has(name)) fails.push(`导入名 ${name} 不在 ${entry.specifier} 的导出列表中`)
      }
      if (wanted.wantsDefault && !names.has('default')) fails.push(`默认导入缺失：${entry.specifier} 无 default 导出`)
    }
  }

  return { fails, warns, forms, exempt: isSandboxPage || layoutExempt }
}

const args = process.argv.slice(2)
let files
if (args.includes('--all')) files = listMarkdown(docsRoot)
else if (args.includes('--changed') || args.length === 0) files = changedMarkdown()
else files = args.map(arg => resolve(arg))

if (files.length === 0) {
  console.log('没有需要检查的 Markdown 文件')
  process.exit(0)
}

let failCount = 0
let warnCount = 0
for (const file of files) {
  const relative = file.replace(`${repoRoot}${sep}`, '')
  const { fails, warns, forms, exempt } = checkFile(file)
  failCount += fails.length
  warnCount += warns.length
  const notes = exempt ? '（按约定豁免：沙盒页或特殊布局）' : forms.length ? `（交互形态：${forms.join('、')}）` : ''
  if (fails.length) console.log(`FAIL ${relative}${notes}`)
  else if (warns.length) console.log(`WARN ${relative}${notes}`)
  else console.log(`PASS ${relative}${notes}`)
  for (const message of [...fails.map(m => `  ✗ ${m}`), ...warns.map(m => `  ! ${m}`)]) console.log(message)
}
console.log(`\n${files.length} 个文件：${failCount} 项失败，${warnCount} 项警告`)
process.exit(failCount ? 1 : 0)
