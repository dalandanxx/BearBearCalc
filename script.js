"use strict";

const HISTORY_KEY = "addu-calculation-history";

const conversionOptions = [
  { id: "c-f", label: "Celsius to Fahrenheit", from: "°C", to: "°F" },
  { id: "f-c", label: "Fahrenheit to Celsius", from: "°F", to: "°C" },
  { id: "m-ft", label: "Meters to Feet", from: "m", to: "ft" },
  { id: "ft-m", label: "Feet to Meters", from: "ft", to: "m" },
];

const taxBrackets = [
  { range: "Up to ₱250,000", rate: "0%", over: 0, ceiling: 250000, base: 0, percent: 0 },
  {
    range: "₱250,000–₱400,000",
    rate: "20% excess",
    over: 250000,
    ceiling: 400000,
    base: 0,
    percent: 0.2,
  },
  {
    range: "₱400,000–₱800,000",
    rate: "₱30,000 + 25%",
    over: 400000,
    ceiling: 800000,
    base: 30000,
    percent: 0.25,
  },
  {
    range: "₱800,000–₱2,000,000",
    rate: "₱130,000 + 30%",
    over: 800000,
    ceiling: 2000000,
    base: 130000,
    percent: 0.3,
  },
  {
    range: "₱2M–₱8M",
    rate: "₱490,000 + 32%",
    over: 2000000,
    ceiling: 8000000,
    base: 490000,
    percent: 0.32,
  },
  {
    range: "Over ₱8,000,000",
    rate: "₱2,410,000 + 35%",
    over: 8000000,
    ceiling: Infinity,
    base: 2410000,
    percent: 0.35,
  },
];

const historySections = [
  {
    id: "conversion",
    title: "Unit Conversion",
    subtitle: "Temperature and length conversions",
  },
  { id: "tax", title: "Income Tax", subtitle: "Taxable income calculations" },
  {
    id: "loops",
    title: "Natural Numbers",
    subtitle: "Factorial, sum and average results",
  },
  { id: "payroll", title: "Simple Payroll", subtitle: "Employee pay calculations" },
];

const iconPaths = {
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
  calculator:
    '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>',
  conversion:
    '<path d="M4 7h14m0 0-3-3m3 3-3 3M20 17H6m0 0 3 3m-3-3 3-3"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  loop: '<path d="M17.7 6.3A8 8 0 1 0 20 12"/><path d="M17 2v5h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  receipt: '<path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2-3-2Z"/><path d="M9 9h6M9 13h6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
};

function icon(name, size = 18) {
  return `<svg aria-hidden="true" fill="none" height="${size}" viewBox="0 0 24 24" width="${size}" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">${iconPaths[name] || ""}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    const records = saved ? JSON.parse(saved) : [];
    return Array.isArray(records)
      ? records.filter(
          (record) =>
            record &&
            typeof record.id === "string" &&
            typeof record.assignment === "string" &&
            typeof record.calculation === "string" &&
            typeof record.input === "string" &&
            typeof record.result === "string" &&
            typeof record.createdAt === "string",
        )
      : [];
  } catch (error) {
    console.error("Could not load saved calculation history.", error);
    return [];
  }
}

const state = {
  activeTool: "conversion",
  mobileMenu: false,
  history: loadHistory(),
  conversionType: "c-f",
  conversionInput: "",
  conversionSubmitted: false,
  taxIncome: "",
  taxSubmitted: false,
  naturalValue: "",
  naturalSubmitted: false,
  employees: [],
  nextEmployeeId: 1,
  payrollName: "",
  payrollDays: "",
  payrollRate: "",
  payrollDeduction: "",
  deleteLine: "",
  payrollError: "",
};

const app = document.getElementById("app");
const appShell = document.querySelector(".app-shell");

function money(value) {
  return value.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });
}

function pageHeading(kicker, title, description) {
  return `
    <header class="page-heading">
      <div>
        <p class="eyebrow">${escapeHtml(kicker)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="page-description">${escapeHtml(description)}</p>
      </div>
    </header>`;
}

function formulaNote(text) {
  return `<div class="formula-note"><span>${icon("info", 16)}</span><p>${text}</p></div>`;
}

function numberField(label, field, value, options = {}) {
  const min = options.min === undefined ? "" : ` min="${options.min}"`;
  const max = options.max === undefined ? "" : ` max="${options.max}"`;
  const step = options.step || "any";
  const placeholder = options.placeholder || "0";
  const required = options.required ? " required" : "";
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input data-field="${field}" inputmode="decimal"${min}${max}${required} placeholder="${placeholder}" step="${step}" type="number" value="${escapeHtml(value)}" />
    </label>`;
}

function conversionResult() {
  const value = Number(state.conversionInput);
  if (state.conversionInput === "" || !Number.isFinite(value)) return null;

  let result;
  let formula;
  let substitution;
  switch (state.conversionType) {
    case "c-f":
      result = value * (9 / 5) + 32;
      formula = "°F = (°C × 9/5) + 32";
      substitution = `(${value} × 9/5) + 32`;
      break;
    case "f-c":
      result = (value - 32) * (5 / 9);
      formula = "°C = (°F − 32) × 5/9";
      substitution = `(${value} − 32) × 5/9`;
      break;
    case "m-ft":
      result = value * 3.28084;
      formula = "ft = m × 3.28084";
      substitution = `${value} × 3.28084`;
      break;
    default:
      result = value / 3.28084;
      formula = "m = ft ÷ 3.28084";
      substitution = `${value} ÷ 3.28084`;
  }

  const display = Number.isInteger(result)
    ? result.toString()
    : result.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return { value, result, formula, substitution, display };
}

function renderConversion() {
  const option = conversionOptions.find((item) => item.id === state.conversionType);
  const result = state.conversionSubmitted ? conversionResult() : null;
  return `
    ${pageHeading(
      "Measurement tools",
      "Unit conversion",
      "Convert temperature and length values with transparent, step-by-step solutions.",
    )}
    <div class="two-column">
      <section class="card">
        <div class="card-heading">
          <div><span class="step-number">1</span><h2>Choose a conversion</h2></div>
          <p>Select one of the four supported units.</p>
        </div>
        <div class="choice-grid">
          ${conversionOptions
            .map(
              (item) => `
                <button class="choice${state.conversionType === item.id ? " active" : ""}" data-action="conversion-type" data-type="${item.id}" type="button">
                  <span>${item.from}</span>${icon("arrow", 15)}<span>${item.to}</span>
                  <small>${item.label}</small>
                </button>`,
            )
            .join("")}
        </div>
        <div class="divider"></div>
        <div class="card-heading compact">
          <div><span class="step-number">2</span><h2>Enter your value</h2></div>
        </div>
        <form class="calculation-form" data-form="conversion">
          <label class="measure-field">
            <input data-field="conversionInput" inputmode="decimal" placeholder="0" required type="number" value="${escapeHtml(state.conversionInput)}" />
            <span>${option.from}</span>
          </label>
          <p class="autosave-note">Select Convert to see the result and save it to history.</p>
          <button class="primary-button" type="submit">${icon("conversion", 17)}Convert</button>
        </form>
      </section>
      <section class="result-card${result ? " has-result" : ""}" data-result="conversion" aria-live="polite">
        <p class="result-label">Converted value</p>
        ${
          result
            ? `
              <div class="big-result">${result.display}<span>${option.to}</span></div>
              <div class="calculation-steps">
                <p>How it was calculated</p>
                <div><span>Formula</span><strong>${result.formula}</strong></div>
                <div><span>Substitute</span><strong>${escapeHtml(result.substitution)}</strong></div>
                <div><span>Answer</span><strong>${result.display} ${option.to}</strong></div>
              </div>`
            : `<div class="empty-result">${icon("calculator", 26)}<p>Enter a value, then select Convert.</p></div>`
        }
      </section>
    </div>`;
}

function taxResult() {
  const amount = Math.max(0, Number(state.taxIncome) || 0);
  const bracket = taxBrackets.find((item) => amount <= item.ceiling) || taxBrackets[5];
  const excess = Math.max(0, amount - bracket.over);
  const percentageTax = excess * bracket.percent;
  return { amount, bracket, excess, percentageTax, total: bracket.base + percentageTax };
}

function renderTax() {
  const hasValue = state.taxSubmitted && state.taxIncome !== "";
  const { amount, bracket, excess, percentageTax, total } = taxResult();
  return `
    ${pageHeading(
      "Finance tools",
      "Income tax calculator",
      "Estimate annual Philippine income tax using the supplied graduated tax table.",
    )}
    <div class="two-column tax-layout">
      <section class="card">
        <div class="card-heading">
          <div><span class="step-number">1</span><h2>Taxable income</h2></div>
          <p>Enter the annual net taxable income in Philippine pesos.</p>
        </div>
        <form class="calculation-form" data-form="tax">
          <label class="money-field">
            <span>₱</span>
            <input data-field="taxIncome" inputmode="decimal" min="0" placeholder="0.00" required type="number" value="${escapeHtml(state.taxIncome)}" />
          </label>
          <p class="autosave-note">Select Calculate tax to see the estimate and save it to history.</p>
          <button class="primary-button" type="submit">${icon("calculator", 17)}Calculate tax</button>
        </form>
        ${formulaNote("Income tax = basic tax + rate on the excess")}
      </section>
      <section class="result-card tax-result" data-result="tax" aria-live="polite">
        <p class="result-label">Estimated income tax</p>
        <div class="big-result money">${hasValue ? money(total) : "—"}</div>
        <p class="bracket-label">${hasValue ? bracket.range : "Enter an amount to begin"}</p>
        ${
          hasValue
            ? `<div class="calculation-steps">
                <p>Tax breakdown</p>
                <div><span>Basic tax</span><strong>${money(bracket.base)}</strong></div>
                <div><span>Taxable excess</span><strong>${money(excess)}</strong></div>
                <div><span>${Math.round(bracket.percent * 100)}% of excess</span><strong>${money(percentageTax)}</strong></div>
                <div><span>Total tax</span><strong>${money(total)}</strong></div>
              </div>`
            : ""
        }
      </section>
    </div>
    <section class="card tax-table-card">
      <div class="card-heading table-title">
        <div><span class="step-number">2</span><h2>Graduated tax table</h2></div>
        <p>The active bracket is highlighted automatically.</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Net taxable income</th><th>Basic tax + rate</th></tr></thead>
          <tbody>
            ${taxBrackets
              .map(
                (item) => `
                  <tr class="${hasValue && item === bracket ? "selected-row" : ""}">
                    <td>${item.range}</td><td>${item.rate}</td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function naturalResults() {
  const input = Number(state.naturalValue);
  if (!Number.isInteger(input) || input < 1 || input > 170) return null;

  let factorial = 1;
  let factor = 1;
  while (factor <= input) {
    factorial *= factor;
    factor++;
  }

  let sum = 0;
  let addend = 1;
  do {
    sum += addend;
    addend++;
  } while (addend <= input);

  let averageSum = 0;
  for (let number = 1; number <= input; number++) {
    averageSum += number;
  }

  return { input, factorial, sum, average: averageSum / input };
}

function renderNaturalNumbers() {
  const results = state.naturalSubmitted ? naturalResults() : null;
  const input = Number(state.naturalValue);
  const factorialSequence =
    input <= 8
      ? Array.from({ length: Math.max(input, 0) }, (_, index) => index + 1).join(" × ")
      : `1 × 2 × 3 × … × ${input}`;

  return `
    ${pageHeading(
      "Looping exercise",
      "First N natural numbers",
      "Explore factorial, sum, and average using the required JavaScript loop structures.",
    )}
    <section class="card natural-input">
      <div class="card-heading">
        <div><span class="step-number">1</span><h2>Enter a natural number</h2></div>
        <p>Use a whole number from 1 to 170.</p>
      </div>
      <form class="natural-calculation-form" data-form="loops">
        <div class="natural-field-group">
          ${numberField("Value of N", "naturalValue", state.naturalValue, { min: 1, max: 170, required: true, step: "1" })}
          <p class="autosave-note">Select Solve to show the results and save them to history.</p>
        </div>
        <button class="primary-button" type="submit">${icon("calculator", 17)}Solve</button>
      </form>
    </section>
    <div class="loop-grid" aria-live="polite">
      <article class="loop-card">
        <div class="loop-card-top"><span>01</span><code>while</code></div>
        <h2>Nth factorial</h2>
        <p>Multiplies each natural number from 1 through N.</p>
        <div class="loop-answer">${results ? results.factorial.toLocaleString("en-US") : "—"}</div>
        <div class="loop-formula"><span>Steps</span><strong>${results ? `${factorialSequence} = ${results.factorial.toLocaleString("en-US")}` : "Enter N to calculate"}</strong></div>
      </article>
      <article class="loop-card">
        <div class="loop-card-top"><span>02</span><code>do...while</code></div>
        <h2>Sum of numbers</h2>
        <p>Adds all natural numbers from 1 through N.</p>
        <div class="loop-answer">${results ? results.sum.toLocaleString("en-US") : "—"}</div>
        <div class="loop-formula"><span>Formula</span><strong>${results ? `${input} × (${input} + 1) ÷ 2 = ${results.sum}` : "Enter N to calculate"}</strong></div>
      </article>
      <article class="loop-card">
        <div class="loop-card-top"><span>03</span><code>for</code></div>
        <h2>Average</h2>
        <p>Finds the mean of all natural numbers from 1 through N.</p>
        <div class="loop-answer">${results ? results.average.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</div>
        <div class="loop-formula"><span>Formula</span><strong>${results ? `${results.sum} ÷ ${input} = ${results.average}` : "Enter N to calculate"}</strong></div>
      </article>
    </div>`;
}

function renderPayroll() {
  const totalNet = state.employees.reduce(
    (total, employee) => total + employee.days * employee.rate - employee.deduction,
    0,
  );
  const employeeRows = state.employees.length
    ? state.employees
        .map((employee, index) => {
          const gross = employee.days * employee.rate;
          const net = gross - employee.deduction;
          return `
            <tr>
              <td>${String(index + 1).padStart(2, "0")}</td>
              <td><strong>${escapeHtml(employee.name)}</strong></td>
              <td>${employee.days}</td>
              <td>${money(employee.rate)}</td>
              <td>${money(gross)}</td>
              <td>${money(employee.deduction)}</td>
              <td><strong>${money(net)}</strong></td>
              <td><button aria-label="Delete ${escapeHtml(employee.name)}" class="row-delete" data-action="delete-employee" data-line="${index + 1}" type="button">${icon("trash", 15)}</button></td>
            </tr>`;
        })
        .join("")
    : `<tr><td class="empty-table" colspan="8">${icon("briefcase", 23)}<span>No employees yet. Add your first record above.</span></td></tr>`;

  return `
    ${pageHeading(
      "Payroll tools",
      "Simple payroll",
      "Add employees, calculate gross and net pay, and manage the payroll list.",
    )}
    <section class="card payroll-form-card">
      <div class="card-heading">
        <div><span class="step-number">1</span><h2>Add an employee</h2></div>
        <p>Gross and net pay are calculated automatically. Add an employee to save the result to history.</p>
      </div>
      <form class="payroll-form" data-form="payroll">
        <label class="field name-field">
          <span>Employee name</span>
          <input data-field="payrollName" placeholder="e.g. Juan Dela Cruz" type="text" value="${escapeHtml(state.payrollName)}" />
        </label>
        ${numberField("Days worked", "payrollDays", state.payrollDays, { min: 0 })}
        ${numberField("Daily rate (₱)", "payrollRate", state.payrollRate, { min: 0 })}
        ${numberField("Deduction (₱)", "payrollDeduction", state.payrollDeduction, { min: 0 })}
        <button class="primary-button" type="submit">${icon("plus", 17)}Add employee</button>
      </form>
      ${state.payrollError ? `<p class="error-text" data-payroll-error>${escapeHtml(state.payrollError)}</p>` : ""}
      ${formulaNote("Gross pay = days worked × daily rate &nbsp;·&nbsp; Net pay = gross pay − deduction")}
    </section>
    <section class="card payroll-table-card">
      <div class="payroll-table-heading">
        <div class="card-heading compact">
          <div><span class="step-number">2</span><h2>Payroll list</h2></div>
          <p>${state.employees.length} ${state.employees.length === 1 ? "employee" : "employees"}</p>
        </div>
        <div class="delete-control">
          <label><span>Delete line</span><input data-field="deleteLine" min="1" placeholder="No." type="number" value="${escapeHtml(state.deleteLine)}" /></label>
          <button aria-label="Delete line" data-action="delete-payroll-line" type="button">${icon("trash", 17)}</button>
        </div>
      </div>
      <div class="table-wrap payroll-table">
        <table>
          <thead><tr><th>No.</th><th>Employee</th><th>Days</th><th>Daily rate</th><th>Gross pay</th><th>Deduction</th><th>Net pay</th><th></th></tr></thead>
          <tbody>${employeeRows}</tbody>
          ${state.employees.length ? `<tfoot><tr><td colspan="6">Total net payroll</td><td>${money(totalNet)}</td><td></td></tr></tfoot>` : ""}
        </table>
      </div>
    </section>`;
}

function renderHistory() {
  const sections = historySections
    .map((section) => {
      const records = state.history.filter((record) => record.assignment === section.id);
      const rows = records.length
        ? records
            .map(
              (record, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${escapeHtml(record.calculation)}</strong></td>
                  <td>${escapeHtml(record.input)}</td>
                  <td>${escapeHtml(record.result)}</td>
                  <td>${new Date(record.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td><button aria-label="Delete ${escapeHtml(record.calculation)} history record" class="row-delete" data-action="delete-history" data-id="${escapeHtml(record.id)}" type="button">${icon("trash", 14)}</button></td>
                </tr>`,
            )
            .join("")
        : '<tr><td class="history-empty" colspan="6">No saved calculations yet.</td></tr>';

      return `
        <section class="history-section">
          <div class="history-section-heading">
            <div><h2>${section.title}</h2><p>${section.subtitle}</p></div>
            <span>${records.length} record${records.length === 1 ? "" : "s"}</span>
          </div>
          <div class="table-wrap history-table">
            <table>
              <thead><tr><th>No.</th><th>Calculation</th><th>Input / Details</th><th>Result</th><th>Date &amp; Time</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>`;
    })
    .join("");

  return `
    ${pageHeading(
      "Your calculations",
      "Calculation history",
      "Saved calculations, organized by tool.",
    )}
    <div class="history-toolbar">
      <p>Records are saved in this browser and remain available when you return.</p>
      ${state.history.length ? `<button class="clear-history" data-action="clear-history" type="button">${icon("trash", 14)}Clear all history</button>` : ""}
    </div>
    <div class="history-sections">${sections}</div>`;
}

function renderPage() {
  switch (state.activeTool) {
    case "tax":
      return renderTax();
    case "loops":
      return renderNaturalNumbers();
    case "payroll":
      return renderPayroll();
    case "history":
      return renderHistory();
    default:
      return renderConversion();
  }
}

function render() {
  const activeElement = document.activeElement;
  const focusedField = activeElement && activeElement.dataset ? activeElement.dataset.field : null;
  const selectionStart =
    focusedField && typeof activeElement.selectionStart === "number"
      ? activeElement.selectionStart
      : null;

  app.innerHTML = renderPage();
  appShell.querySelector(".sidebar").classList.toggle("open", state.mobileMenu);
  appShell.querySelector(".backdrop").hidden = !state.mobileMenu;
  appShell.querySelector("[data-current-tool]").textContent =
    appShell.querySelector(`.sidebar [data-tool="${state.activeTool}"]`).textContent.trim();
  appShell.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === state.activeTool);
  });

  if (focusedField) {
    const nextField = Array.from(app.querySelectorAll("[data-field]")).find(
      (element) => element.dataset.field === focusedField,
    );
    if (nextField) {
      nextField.focus({ preventScroll: true });
      if (selectionStart !== null && nextField.type !== "number") {
        nextField.setSelectionRange(selectionStart, selectionStart);
      }
    }
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
  } catch (error) {
    console.error("Could not save calculation history in this browser.", error);
  }
}

function addHistory(record) {
  state.history = [
    {
      ...record,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    },
    ...state.history,
  ].slice(0, 200);
  saveHistory();
}

function saveCalculationForField(field) {
  if (field === "conversionInput") {
    const option = conversionOptions.find((item) => item.id === state.conversionType);
    const result = conversionResult();
    if (!result) return;
    addHistory({
      assignment: "conversion",
      calculation: option.label,
      input: `${state.conversionInput} ${option.from}`,
      result: `${result.display} ${option.to}`,
    });
  } else if (field === "taxIncome" && state.taxIncome !== "") {
    const { amount, bracket, total } = taxResult();
    addHistory({
      assignment: "tax",
      calculation: `Income tax · ${bracket.range}`,
      input: money(amount),
      result: money(total),
    });
  } else if (field === "naturalValue") {
    const results = naturalResults();
    if (!results) return;
    addHistory({
      assignment: "loops",
      calculation: "Factorial, sum and average",
      input: `N = ${results.input}`,
      result: `Factorial: ${results.factorial.toLocaleString("en-US")} · Sum: ${results.sum} · Average: ${results.average}`,
    });
  }
}

function selectTool(tool) {
  state.activeTool = tool;
  state.mobileMenu = false;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function addEmployee(event) {
  event.preventDefault();
  const days = Number(state.payrollDays);
  const rate = Number(state.payrollRate);
  const deduction = Number(state.payrollDeduction);

  if (!state.payrollName.trim() || days <= 0 || rate < 0 || deduction < 0) {
    state.payrollError = "Complete every field using valid, non-negative values.";
    render();
    return;
  }

  const employee = {
    id: state.nextEmployeeId++,
    name: state.payrollName.trim(),
    days,
    rate,
    deduction,
  };
  state.employees.push(employee);
  const gross = days * rate;
  addHistory({
    assignment: "payroll",
    calculation: employee.name,
    input: `${days} days × ${money(rate)} − ${money(deduction)}`,
    result: `Gross: ${money(gross)} · Net: ${money(gross - deduction)}`,
  });
  state.payrollName = "";
  state.payrollDays = "";
  state.payrollRate = "";
  state.payrollDeduction = "";
  state.payrollError = "";
  render();
}

app.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (!field || !(field in state)) return;
  state[field] = event.target.value;
  if (field === "conversionInput") {
    state.conversionSubmitted = false;
    const result = app.querySelector('[data-result="conversion"]');
    result.classList.remove("has-result");
    result.innerHTML = `<p class="result-label">Converted value</p><div class="empty-result">${icon("calculator", 26)}<p>Press Convert to update the result.</p></div>`;
  } else if (field === "taxIncome") {
    state.taxSubmitted = false;
    app.querySelector('[data-result="tax"]').innerHTML = `<p class="result-label">Estimated income tax</p><div class="big-result money">—</div><p class="bracket-label">Press Calculate tax to see the estimate</p>`;
  } else if (field === "naturalValue") {
    state.naturalSubmitted = false;
    const grid = app.querySelector(".loop-grid");
    grid.querySelectorAll(".loop-answer").forEach((answer) => {
      answer.textContent = "—";
    });
    grid.querySelectorAll(".loop-formula strong").forEach((formula) => {
      formula.textContent = "Press Solve to see results";
    });
  }
  if (field.startsWith("payroll") && state.payrollError) {
    state.payrollError = "";
    app.querySelector("[data-payroll-error]")?.remove();
  }
});

app.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  switch (form.dataset.form) {
    case "conversion":
      state.conversionSubmitted = true;
      saveCalculationForField("conversionInput");
      render();
      break;
    case "tax":
      state.taxSubmitted = true;
      saveCalculationForField("taxIncome");
      render();
      break;
    case "loops":
      state.naturalSubmitted = true;
      saveCalculationForField("naturalValue");
      render();
      break;
    case "payroll":
      addEmployee(event);
      break;
  }
});

appShell.addEventListener("click", (event) => {
  const toolButton = event.target.closest("[data-tool]");
  if (toolButton) {
    selectTool(toolButton.dataset.tool);
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;

  switch (button.dataset.action) {
    case "open-menu":
      state.mobileMenu = true;
      render();
      break;
    case "close-menu":
      state.mobileMenu = false;
      render();
      break;
    case "conversion-type":
      state.conversionType = button.dataset.type;
      state.conversionInput = "";
      state.conversionSubmitted = false;
      render();
      break;
    case "delete-employee": {
      const line = Number(button.dataset.line);
      state.employees.splice(line - 1, 1);
      state.payrollError = "";
      render();
      break;
    }
    case "delete-payroll-line": {
      const line = Number(state.deleteLine);
      if (line < 1 || line > state.employees.length) {
        state.payrollError = "Enter an existing line number to delete.";
      } else {
        state.employees.splice(line - 1, 1);
        state.deleteLine = "";
        state.payrollError = "";
      }
      render();
      break;
    }
    case "delete-history":
      state.history = state.history.filter((record) => record.id !== button.dataset.id);
      saveHistory();
      render();
      break;
    case "clear-history":
      state.history = [];
      saveHistory();
      render();
      break;
  }
});

render();
