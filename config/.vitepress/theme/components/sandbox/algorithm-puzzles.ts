import type { AlgorithmPuzzle, AlgorithmTestCase, PuzzleId } from './sandbox-types'

const tests: readonly AlgorithmTestCase[] = Object.freeze([
  { id: 'ordinary', label: '基础配对', nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
  { id: 'later', label: '答案不在开头', nums: [3, 2, 4], target: 6, expected: [1, 2] },
  { id: 'duplicate', label: '相同数值、不同下标', nums: [3, 3], target: 6, expected: [0, 1] },
  { id: 'negative', label: '负数参与配对', nums: [-3, 4, 3, 90], target: 0, expected: [0, 2] },
  { id: 'zero', label: '两个零', nums: [0, 4, 3, 0], target: 0, expected: [0, 3] },
].map(test => Object.freeze({
  ...test,
  nums: Object.freeze(test.nums),
  expected: Object.freeze(test.expected) as readonly [number, number],
})))

export const TWO_SUM: AlgorithmPuzzle = Object.freeze({
  id: 'two-sum',
  title: '两数之和',
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
  tests,
})

export function getPuzzle(id: PuzzleId): AlgorithmPuzzle {
  if (id !== TWO_SUM.id) throw new Error('不支持的算法题目。')
  return TWO_SUM
}
