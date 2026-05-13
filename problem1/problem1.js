var sum_to_n_a = function(n) {
  // Implementation A: iterative loop
  let sum = 0;

  if (n > 0) {
    for (let i = 1; i <= n; i++) sum += i;
  } else {
    for (let i = -1; i >= n; i--) sum += i;
  }

  return sum;
};

var sum_to_n_b = function(n) {
  // Implementation B: math formula (O(1))
  if (n === 0) return 0;
  const m = Math.abs(n);
  const s = (m * (m + 1)) / 2;
  return n > 0 ? s : -s;
};

var sum_to_n_c = function(n) {
  // Implementation C: recursion
  if (n === 0) return 0;
  if (n > 0) return n + sum_to_n_c(n - 1);
  return n + sum_to_n_c(n + 1);
};

// Quick test output for Problem 1
const testInputs = [5, 1, 0, -3, 10];
for (const n of testInputs) {
  console.log(
    `n=${n} | a=${sum_to_n_a(n)} | b=${sum_to_n_b(n)} | c=${sum_to_n_c(n)}`
  );
}
