import { useMemo } from "react";

type Blockchain = "Osmosis" | "Ethereum" | "Arbitrum" | "Zilliqa" | "Neo";

interface BoxProps {
  className?: string;
}

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

export default function WalletPage(props: Props) {
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
