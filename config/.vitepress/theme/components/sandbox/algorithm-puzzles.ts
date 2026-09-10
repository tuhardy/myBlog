import { MAX_ERROR_BYTES, MAX_INPUT_BYTES, MAX_TEST_CASES, MAX_VALUE_DEPTH, MAX_VALUE_NODES, validateSource } from './sandbox-types'
import type { AlgorithmPuzzle, JsonValue, PuzzleId } from './sandbox-types'

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function freezeJson(value: JsonValue): void {
  if (value === null || typeof value !== 'object') return
  Object.values(value).forEach(freezeJson)
  Object.freeze(value)
}

function validateJson(value: JsonValue, depth = 0, state = { nodes: 0, seen: new Set<object>() }): void {
  if (++state.nodes > MAX_VALUE_NODES || depth > MAX_VALUE_DEPTH) throw new Error('题目 JSON 超过结构限制。')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (typeof value !== 'object' || state.seen.has(value)) throw new Error('题目只接受无循环、有限数值的 JSON 数据。')
  const prototype = Object.getPrototypeOf(value)
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) throw new Error('题目参数和期望值必须为普通 JSON 数据。')
  state.seen.add(value)
  const keys = Reflect.ownKeys(value)
  if (keys.length > MAX_VALUE_NODES) throw new Error('题目 JSON 超过结构限制。')
  for (const key of keys) {
    if (Array.isArray(value) && key === 'length') continue
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (typeof key !== 'string' || !descriptor || !('value' in descriptor) || !descriptor.enumerable) throw new Error('题目 JSON 不接受访问器、Symbol 或隐藏属性。')
    validateJson(descriptor.value, depth + 1, state)
  }
  if (Array.isArray(value)) {
    if (keys.length !== value.length + 1) throw new Error('题目 JSON 数组不接受空位或额外属性。')
    for (let index = 0; index < value.length; index++) {
      if (!Object.hasOwn(value, index)) throw new Error('题目 JSON 数组不接受空位。')
    }
  }
  state.seen.delete(value)
}

export function definePuzzle(puzzle: AlgorithmPuzzle): AlgorithmPuzzle {
  if (!puzzle.id || !puzzle.title || !IDENTIFIER.test(puzzle.entryPoint)) throw new Error('题目 ID、标题或函数入口无效。')
  if (validateSource(puzzle.initialCode)) throw new Error('题目初始代码为空或超过限制。')
  if (!puzzle.failureMessage.trim() || puzzle.failureMessage.length > MAX_ERROR_BYTES || new TextEncoder().encode(puzzle.failureMessage).byteLength > MAX_ERROR_BYTES) throw new Error('判错提示不能为空或超过错误文本预算。')
  if (!puzzle.tests.length || puzzle.tests.length > MAX_TEST_CASES) throw new Error('题目测试用例数量不符合限制。')
  if (new Set(puzzle.parameterNames).size !== puzzle.parameterNames.length || puzzle.parameterNames.some(name => !IDENTIFIER.test(name))) throw new Error('参数名必须是互不重复的标识符。')
  const ids = new Set<string>()
  for (const test of puzzle.tests) {
    if (!test.id || ids.has(test.id) || test.args.length !== puzzle.parameterNames.length) throw new Error('用例 ID 重复、为空或参数数量不匹配。')
    ids.add(test.id)
    validateJson(test.args)
    validateJson(test.expected)
  }
  if (new TextEncoder().encode(JSON.stringify(puzzle.tests)).byteLength > MAX_INPUT_BYTES) throw new Error('题目测试数据超过输入预算。')
  for (const test of puzzle.tests) {
    freezeJson(test.args)
    freezeJson(test.expected)
    Object.freeze(test)
  }
  Object.freeze(puzzle.tests)
  Object.freeze(puzzle.parameterNames)
  return Object.freeze(puzzle)
}

export const TWO_SUM = definePuzzle({
  id: 'two-sum',
  title: '两数之和',
  entryPoint: 'twoSum',
  parameterNames: ['nums', 'target'],
  judge: 'two-sum-indices',
  expectedHint: '下标顺序不限',
  failureMessage: '请返回两个不同且有效的整数下标，对应数值之和必须等于 target；下标顺序不限。',
  initialCode: `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j]
      }
    }
  }
  return []
}`,
  tests: [
    { id: 'ordinary', label: '基础配对', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { id: 'later', label: '答案不在开头', args: [[3, 2, 4], 6], expected: [1, 2] },
    { id: 'duplicate', label: '相同数值、不同下标', args: [[3, 3], 6], expected: [0, 1] },
    { id: 'negative', label: '负数参与配对', args: [[-3, 4, 3, 90], 0], expected: [0, 2] },
    { id: 'zero', label: '两个零', args: [[0, 4, 3, 0], 0], expected: [0, 3] },
  ],
})

export const BINARY_SEARCH = definePuzzle({
  id: 'binary-search',
  title: '二分查找',
  entryPoint: 'binarySearch',
  parameterNames: ['nums', 'target'],
  judge: 'json-equal',
  expectedHint: '返回单个整数下标，未找到返回 -1',
  failureMessage: '请返回目标值在原始有序数组中的整数下标；未找到时返回数值 -1，不接受字符串或数组。',
  initialCode: `function binarySearch(nums, target) {
  let left = 0
  let right = nums.length - 1
  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2)
    if (nums[middle] === target) return middle
    if (nums[middle] < target) left = middle + 1
    else right = middle - 1
  }
  return -1
}`,
  tests: [
    { id: 'first', label: '首元素也是左邻', args: [[5, 6, 7], 5], expected: 0 },
    { id: 'middle', label: '命中内部元素', args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
    { id: 'last', label: '末元素也是右邻', args: [[5, 6, 7], 7], expected: 2 },
    { id: 'missing', label: '目标不存在', args: [[1, 3, 5, 7], 4], expected: -1 },
    { id: 'empty', label: '空数组', args: [[], 3], expected: -1 },
    { id: 'single-found', label: '单元素命中', args: [[8], 8], expected: 0 },
    { id: 'single-missing', label: '单元素未命中', args: [[8], 2], expected: -1 },
  ],
})

export const PUZZLES = Object.freeze({
  'two-sum': TWO_SUM,
  'binary-search': BINARY_SEARCH,
})

export function isPuzzleId(id: unknown): id is PuzzleId {
  return typeof id === 'string' && Object.hasOwn(PUZZLES, id)
}

export function getPuzzle(id: PuzzleId): AlgorithmPuzzle {
  if (!isPuzzleId(id) || PUZZLES[id].id !== id) throw new Error('不支持的算法题目。')
  return PUZZLES[id]
}
