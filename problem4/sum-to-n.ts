/**
 * Implementation A: iterative loop.
 *
 * Time complexity: O(|n|)
 * Space complexity: O(1)
 *
 * This is straightforward and easy to read, but it does one addition per number.
 */
function sum_to_n_a(n: number): number {
  let sum = 0;
  const step = n >= 0 ? 1 : -1;

  for (let current = step; Math.abs(current) <= Math.abs(n); current += step) {
    sum += current;
  }

  return sum;
}

/**
 * Implementation B: arithmetic series formula.
 *
 * Time complexity: O(1)
 * Space complexity: O(1)
 *
 * This is the most efficient option because it computes the result directly.
 */
function sum_to_n_b(n: number): number {
  const sign = n >= 0 ? 1 : -1;
  const absoluteN = Math.abs(n);

  return sign * ((absoluteN * (absoluteN + 1)) / 2);
}

/**
 * Implementation C: recursion.
 *
 * Time complexity: O(|n|)
 * Space complexity: O(|n|) because every recursive call adds a stack frame.
 *
 * This demonstrates a different approach, but it is less practical for large n
 * because JavaScript engines may throw a call stack overflow.
 */
function sum_to_n_c(n: number): number {
  if (n === 0) return 0;
  return n > 0 ? n + sum_to_n_c(n - 1) : n + sum_to_n_c(n + 1);
}

export { sum_to_n_a, sum_to_n_b, sum_to_n_c };
