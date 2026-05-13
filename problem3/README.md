# Problem 3: Computational Inefficiencies and Anti-patterns

## Issues found

1. `getPriority` accepts `blockchain: any`.
   This removes TypeScript's safety and allows invalid blockchain values to pass silently. It should use a union type, enum, or at least `string`.

2. `getPriority` is declared inside the component.
   The function is recreated on every render. It is also used inside `useMemo`, which can create dependency confusion. Since the priority table is static, it should live outside the component.

3. The `WalletBalance` interface is incomplete.
   The code uses `balance.blockchain`, but the interface only defines `currency` and `amount`. This is a type bug and should be represented in the interface.

4. The filter logic references `lhsPriority`, which does not exist.
   The variable created inside the filter is `balancePriority`. This would fail at compile time in TypeScript.

5. The amount filter appears reversed.
   The code returns `true` when `balance.amount <= 0`, which means zero or negative balances are kept. A wallet UI normally should keep positive balances and remove non-positive ones.

6. `prices` is included in the dependency array for `sortedBalances`, but it is not used there.
   This causes unnecessary filtering and sorting whenever prices change.

7. Priority is recalculated many times during sorting.
   The sort comparator calls `getPriority` for both sides on every comparison. With `n` balances, this can run many extra priority lookups. Compute priority once per balance before sorting.

8. The sort comparator does not return `0` for equal priorities.
   A comparator should always return a number. Returning `undefined` for equal priorities is an anti-pattern and can lead to inconsistent sorting behavior.

9. `formattedBalances` is computed but not used.
   The code maps `sortedBalances` into `formattedBalances`, then renders from `sortedBalances` instead. This wastes work and also means `formattedAmount={balance.formatted}` is likely `undefined`.

10. The render map uses the wrong type.
    `sortedBalances.map((balance: FormattedWalletBalance) => ...)` is incorrect because `sortedBalances` contains `WalletBalance`, not `FormattedWalletBalance`.

11. `key={index}` is unstable.
    Using the array index as a React key can cause incorrect row reuse when balances are sorted, added, or removed. A stable key such as `currency` plus `blockchain` is better.

12. `usdValue` can become `NaN`.
    If `prices[balance.currency]` is missing, multiplying `undefined * amount` returns `NaN`. The code should default missing prices to `0` or skip those rows.

13. `children` is destructured but unused.
    This creates noise and may trigger lint warnings. Either render `children` or remove it.

14. `React.FC` is unnecessary here.
    It can make props less explicit. A plain typed function component is usually clearer with modern React and TypeScript.

15. Derived render data is split across multiple passes.
    The original code filters, sorts, formats, and renders in separate steps, including one unused step. It is clearer and cheaper to derive the row data once with `useMemo`.

## Refactored version

The same refactor is also available as a separate file: [refactored-wallet-page.tsx](./refactored-wallet-page.tsx).

```tsx
type Blockchain = "Osmosis" | "Ethereum" | "Arbitrum" | "Zilliqa" | "Neo";

interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: Blockchain;
}

interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
  usdValue: number;
  priority: number;
}

interface Props extends BoxProps {}

const BLOCKCHAIN_PRIORITIES: Record<Blockchain, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

function getPriority(blockchain: string): number {
  return BLOCKCHAIN_PRIORITIES[blockchain as Blockchain] ?? -99;
}

function WalletPage(props: Props) {
  const balances = useWalletBalances();
  const prices = usePrices();

  const rows = useMemo(() => {
    return balances
      .map((balance): FormattedWalletBalance => {
        const price = prices[balance.currency] ?? 0;

        return {
          ...balance,
          priority: getPriority(balance.blockchain),
          formatted: balance.amount.toFixed(2),
          usdValue: price * balance.amount,
        };
      })
      .filter((balance) => balance.priority > -99 && balance.amount > 0)
      .sort((left, right) => right.priority - left.priority);
  }, [balances, prices]);

  return (
    <div {...props}>
      {rows.map((balance) => (
        <WalletRow
          className={classes.row}
          key={`${balance.blockchain}-${balance.currency}`}
          amount={balance.amount}
          usdValue={balance.usdValue}
          formattedAmount={balance.formatted}
        />
      ))}
    </div>
  );
}
```

## Why this is better

The refactor fixes the runtime/type bugs, removes unused work, avoids unstable React keys, handles missing prices safely, and makes the expensive derived data calculation explicit. Priority is computed once per balance instead of repeatedly during sorting, and the `useMemo` dependencies now match the data actually used to build the rendered rows.
