import "./styles.css";

const PRICE_URL = "https://interview.switcheo.com/prices.json";
const ICON_URL = "https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens";

const state = {
  prices: [],
  from: "ETH",
  to: "USDC",
  amount: "1",
  isLoading: true,
  isSubmitting: false,
  error: "",
  successMessage: "",
  activePicker: null,
  search: "",
};

const fallbackNames = {
  ETH: "Ethereum",
  WBTC: "Wrapped Bitcoin",
  BTC: "Bitcoin",
  USDC: "USD Coin",
  USDT: "Tether",
  USD: "US Dollar",
  SWTH: "Carbon Protocol",
  ATOM: "Cosmos",
  OSMO: "Osmosis",
  LUNA: "Terra",
  BUSD: "Binance USD",
};

function iconFor(symbol) {
  return `${ICON_URL}/${symbol}.svg`;
}

function formatNumber(value, maximumFractionDigits = 6) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 6,
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePrices(rows) {
  const latest = new Map();

  for (const row of rows) {
    if (!row.currency || typeof row.price !== "number" || row.price <= 0) continue;

    const current = latest.get(row.currency);
    const currentDate = current ? new Date(current.date).getTime() : 0;
    const rowDate = new Date(row.date).getTime();

    if (!current || rowDate >= currentDate) {
      latest.set(row.currency, row);
    }
  }

  return [...latest.values()]
    .map((row) => ({
      symbol: row.currency,
      name: fallbackNames[row.currency] || row.currency,
      price: row.price,
      icon: iconFor(row.currency),
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function getToken(symbol) {
  return state.prices.find((token) => token.symbol === symbol);
}

function getQuote() {
  const from = getToken(state.from);
  const to = getToken(state.to);
  const amount = Number(state.amount);

  if (!from || !to || Number.isNaN(amount)) {
    return { output: 0, usdValue: 0, rate: 0, inverseRate: 0 };
  }

  const output = (amount * from.price) / to.price;
  return {
    output,
    usdValue: amount * from.price,
    rate: from.price / to.price,
    inverseRate: to.price / from.price,
  };
}

function getValidationError() {
  if (state.isLoading || state.error) return "";
  if (!state.amount.trim()) return "Enter an amount to continue.";

  const amount = Number(state.amount);
  if (Number.isNaN(amount)) return "Amount must be a valid number.";
  if (amount <= 0) return "Amount must be greater than zero.";
  if (state.from === state.to) return "Choose two different currencies.";

  return "";
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function focusAmountInput(selectionStart, selectionEnd = selectionStart) {
  const input = document.querySelector('[data-action="amount"]');
  if (!input || input.readOnly) return;

  const valueLength = input.value.length;
  const start = Math.min(selectionStart ?? valueLength, valueLength);
  const end = Math.min(selectionEnd ?? start, valueLength);

  input.focus({ preventScroll: true });
  input.setSelectionRange(start, end);
}

function tokenButton(token, type) {
  return `
    <button class="tokenButton" ${state.isSubmitting ? "disabled" : ""} data-action="open-picker" data-type="${escapeHtml(type)}" type="button">
      <img src="${escapeHtml(token.icon)}" alt="" onerror="this.src=''; this.classList.add('missingIcon')" />
      <span>${escapeHtml(token.symbol)}</span>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5.5 7.5 10 12l4.5-4.5" />
      </svg>
    </button>
  `;
}

function renderSwapBox(type, token, amountValue, outputValue) {
  const isFrom = type === "from";
  const label = isFrom ? "You pay" : "You receive";
  const value = isFrom ? amountValue : outputValue;
  const readonly = isFrom && !state.isSubmitting ? "" : "readonly";
  const inputMode = isFrom ? "decimal" : "text";

  return `
    <section class="swapBox ${isFrom ? "source" : "target"}">
      <div class="swapBoxTop">
        <span>${label}</span>
        ${tokenButton(token, type)}
      </div>
      <input
        class="amountInput"
        ${readonly}
        inputmode="${inputMode}"
        value="${escapeHtml(value)}"
        data-action="${isFrom ? "amount" : ""}"
        aria-label="${label}"
        placeholder="0.00"
      />
      <div class="assetLine">
        <span>${escapeHtml(token.name)}</span>
        <strong>${escapeHtml(formatUsd(token.price))}</strong>
      </div>
    </section>
  `;
}

function renderPicker() {
  if (!state.activePicker) return "";

  const selected = state.activePicker === "from" ? state.from : state.to;
  const query = state.search.trim().toLowerCase();
  const tokens = state.prices
    .filter((token) => {
      return (
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query)
      );
    })
    .slice(0, 40);

  return `
    <div class="overlay" data-action="close-picker">
      <aside class="picker" role="dialog" aria-modal="true" aria-label="Select currency">
        <div class="pickerHeader">
          <h2>Select currency</h2>
          <button class="iconButton" data-action="close-picker" type="button" aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <input
          class="searchInput"
          data-action="search"
          value="${escapeHtml(state.search)}"
          placeholder="Search token"
          autocomplete="off"
          autofocus
        />
        <div class="tokenList">
          ${tokens
            .map(
              (token) => `
                <button class="tokenRow ${token.symbol === selected ? "selected" : ""}" data-action="select-token" data-symbol="${escapeHtml(token.symbol)}" type="button">
                  <img src="${escapeHtml(token.icon)}" alt="" onerror="this.src=''; this.classList.add('missingIcon')" />
                  <span>
                    <strong>${escapeHtml(token.symbol)}</strong>
                    <small>${escapeHtml(token.name)}</small>
                  </span>
                  <em>${escapeHtml(formatUsd(token.price))}</em>
                </button>
              `,
            )
            .join("")}
        </div>
      </aside>
    </div>
  `;
}

function render() {
  const app = document.querySelector("#app");

  if (state.isLoading) {
    app.innerHTML = `
      <div class="shell">
        <div class="swapCard loadingCard">
          <div class="loader"></div>
          <p>Loading market prices...</p>
        </div>
      </div>
    `;
    return;
  }

  if (state.error) {
    app.innerHTML = `
      <div class="shell">
        <div class="swapCard errorCard">
          <h1>Currency Swap</h1>
          <p>${state.error}</p>
          <button class="primaryButton" data-action="retry" type="button">Try again</button>
        </div>
      </div>
    `;
    return;
  }

  const from = getToken(state.from) || state.prices[0];
  const to = getToken(state.to) || state.prices[1];
  const quote = getQuote();
  const validationError = getValidationError();
  const canSwap = !validationError && !state.isSubmitting;
  const outputValue = quote.output ? formatNumber(quote.output, 8) : "";

  app.innerHTML = `
    <div class="shell">
      <section class="marketRail" aria-label="Market rates">
        <span>Live markets</span>
        <div class="ticker">
          ${state.prices
            .slice(0, 12)
            .map(
              (token) => `
                <div class="tickerItem">
                  <img src="${escapeHtml(token.icon)}" alt="" onerror="this.src=''; this.classList.add('missingIcon')" />
                  <strong>${escapeHtml(token.symbol)}</strong>
                  <em>${escapeHtml(formatUsd(token.price))}</em>
                </div>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="swapCard" aria-label="Currency swap form">
        <div class="cardHeader">
          <div>
            <p>Swap</p>
            <h1>Currency Swap</h1>
          </div>
          <button class="ghostButton" ${state.isSubmitting ? "disabled" : ""} data-action="refresh" type="button">Refresh</button>
        </div>

        <form class="swapForm">
          ${renderSwapBox("from", from, state.amount, outputValue)}

          <button class="flipButton" ${state.isSubmitting ? "disabled" : ""} data-action="flip" type="button" aria-label="Flip currencies">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7h10l-3-3M17 17H7l3 3" />
            </svg>
          </button>

          ${renderSwapBox("to", to, state.amount, outputValue)}

          <div class="quotePanel">
            <div>
              <span>Rate</span>
              <strong>1 ${escapeHtml(from.symbol)} = ${escapeHtml(formatNumber(quote.rate, 8))} ${escapeHtml(to.symbol)}</strong>
            </div>
            <div>
              <span>Inverse</span>
              <strong>1 ${escapeHtml(to.symbol)} = ${escapeHtml(formatNumber(quote.inverseRate, 8))} ${escapeHtml(from.symbol)}</strong>
            </div>
            <div>
              <span>Value</span>
              <strong>${escapeHtml(formatUsd(quote.usdValue || 0))}</strong>
            </div>
          </div>

          ${validationError ? `<p class="formError">${escapeHtml(validationError)}</p>` : ""}
          ${state.successMessage ? `<p class="formSuccess">${escapeHtml(state.successMessage)}</p>` : ""}

          <button class="primaryButton" ${canSwap ? "" : "disabled"} data-action="submit" type="submit">
            ${state.isSubmitting ? `<span class="buttonSpinner" aria-hidden="true"></span>Submitting swap...` : "Review swap"}
          </button>
        </form>
      </section>
    </div>
    ${renderPicker()}
  `;
}

async function loadPrices() {
  state.isLoading = true;
  state.isSubmitting = false;
  state.error = "";
  state.successMessage = "";
  render();

  try {
    const response = await fetch(PRICE_URL);
    if (!response.ok) throw new Error("Price feed is unavailable.");

    state.prices = normalizePrices(await response.json());
    if (state.prices.length < 2) throw new Error("Not enough priced tokens.");

    if (!getToken(state.from)) state.from = state.prices[0].symbol;
    if (!getToken(state.to)) state.to = state.prices.find((token) => token.symbol !== state.from).symbol;
  } catch (error) {
    state.error = error.message || "Could not load price data.";
  } finally {
    state.isLoading = false;
    render();
  }
}

document.addEventListener("input", (event) => {
  const action = event.target.dataset.action;

  if (action === "amount") {
    const rawValue = event.target.value;
    const selectionStart = event.target.selectionStart ?? rawValue.length;
    const selectionEnd = event.target.selectionEnd ?? selectionStart;
    const commasBeforeStart = (rawValue.slice(0, selectionStart).match(/,/g) || []).length;
    const commasBeforeEnd = (rawValue.slice(0, selectionEnd).match(/,/g) || []).length;

    state.amount = rawValue.replace(/,/g, "");
    state.successMessage = "";
    render();
    focusAmountInput(selectionStart - commasBeforeStart, selectionEnd - commasBeforeEnd);
  }

  if (action === "search") {
    state.search = event.target.value;
    render();
    document.querySelector(".searchInput")?.focus();
  }
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  if (state.isSubmitting && action !== "close-picker") return;

  if (action === "retry" || action === "refresh") {
    loadPrices();
  }

  if (action === "open-picker") {
    state.activePicker = target.dataset.type;
    state.search = "";
    render();
  }

  if (action === "close-picker" && (event.target === target || target.classList.contains("iconButton"))) {
    state.activePicker = null;
    render();
  }

  if (action === "select-token") {
    const symbol = target.dataset.symbol;
    if (state.activePicker === "from") state.from = symbol;
    if (state.activePicker === "to") state.to = symbol;
    state.successMessage = "";
    state.activePicker = null;
    state.search = "";
    render();
  }

  if (action === "flip") {
    [state.from, state.to] = [state.to, state.from];
    state.successMessage = "";
    render();
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.isSubmitting) return;

  const validationError = getValidationError();
  if (validationError) {
    render();
    return;
  }

  const quote = getQuote();
  const from = getToken(state.from);
  const to = getToken(state.to);
  state.isSubmitting = true;
  state.successMessage = "";
  render();

  await wait(1200);

  state.isSubmitting = false;
  state.successMessage = `Swap ready: ${state.amount} ${from.symbol} -> ${formatNumber(quote.output, 8)} ${to.symbol}.`;
  render();
});

loadPrices();
