/**
 * Lightweight Vitest-to-Node:test Adapter Shim
 * Allows running tests/unit/*.test.ts directly via Node's native test runner
 * when node_modules/vitest is not installed in an offline environment.
 */
import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';

function createExpect(actual, inverted = false) {
  const check = (fn) => {
    if (!inverted) {
      fn();
    } else {
      let threw = false;
      try {
        fn();
      } catch {
        threw = true;
      }
      if (!threw) {
        throw new Error(`Expected assertion to fail (negated .not), but it passed for value: ${JSON.stringify(actual)}`);
      }
    }
  };

  return {
    get not() {
      return createExpect(actual, !inverted);
    },
    toBe(expected) {
      check(() => assert.strictEqual(actual, expected));
    },
    toEqual(expected) {
      check(() => assert.deepStrictEqual(actual, expected));
    },
    toBeNull() {
      check(() => assert.strictEqual(actual, null));
    },
    toBeUndefined() {
      check(() => assert.strictEqual(actual, undefined));
    },
    toContain(item) {
      check(() => {
        if (typeof actual === 'string' || Array.isArray(actual)) {
          assert.ok(actual.includes(item), `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
        } else {
          throw new Error('toContain requires string or array');
        }
      });
    },
    toThrow(expectedPattern) {
      check(() => {
        if (expectedPattern) {
          assert.throws(actual, expectedPattern);
        } else {
          assert.throws(actual);
        }
      });
    },
  };
}

export function expect(actual) {
  return createExpect(actual, false);
}

export { describe, it, test };
