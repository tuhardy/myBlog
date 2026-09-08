import type { AlgorithmTestCase, JsonValue } from './sandbox-types'

export function jsonEqual(left: JsonValue, right: JsonValue): boolean {
  if (left === right) return true
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => jsonEqual(value, right[index]))
  }
  const leftObject = left as { readonly [key: string]: JsonValue }
  const rightObject = right as { readonly [key: string]: JsonValue }
  const keys = Object.keys(leftObject)
  return keys.length === Object.keys(rightObject).length
    && keys.every(key => Object.hasOwn(rightObject, key) && jsonEqual(leftObject[key], rightObject[key]))
}

function twoSumIndices(actual: JsonValue, test: AlgorithmTestCase): boolean {
  if (!Array.isArray(actual) || actual.length !== 2) return false
  const [left, right] = actual
  const [nums, target] = test.args
  if (!Array.isArray(nums) || typeof target !== 'number') return false
  if (typeof left !== 'number' || typeof right !== 'number' || !Number.isInteger(left) || !Number.isInteger(right)) return false
  if (left === right || left < 0 || right < 0 || left >= nums.length || right >= nums.length) return false
  return typeof nums[left] === 'number' && typeof nums[right] === 'number' && nums[left] + nums[right] === target
}

export const JUDGES = Object.freeze({
  'json-equal': (actual: JsonValue, test: AlgorithmTestCase) => jsonEqual(actual, test.expected),
  'two-sum-indices': twoSumIndices,
})
