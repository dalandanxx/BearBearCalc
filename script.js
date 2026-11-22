"use strict";

const HISTORY_KEY = "addu-calculation-history";
const ABOUT_VIDEO_COUNT = 18;
const ABOUT_MEMORY_COUNT = 6;
let memoryVideoObserver;

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
  memorySlide: 0,
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

function renderAbout() {
  const interests = [
    ["Chess", "A little strategy, a little patience, and always one more move to consider.", "chess.svg", "Illustrated chessboard and knight"],
    ["Rubik's cubes", "I like the colors, the patterns, and the satisfying challenge of solving one.", "rubiks-cube.svg", "Illustrated colorful Rubik's cube"],
    ["The daydreamer", "Anime, movies, manga, manhwa, fantasy, romance, and action.", "daydreamer.svg", "Illustrated books and twinkling stars"],
    ["The performer", "Dancing has always been one of my favorite ways to express myself.", "public/about/videos/performer.mp4", "Dan dancing in a landscape video"],
    ["The animal lover", "Dogs, cats, capybaras, hamsters, guinea pigs—and animals in general.", "public/about/videos/animal-lover.mp4", "Dan sharing a moment with animals"],
    ["The curious one", "I love creating things, learning as I go, and finding another story or skill to explore.", "public/about/videos/curious-one.mp4", "Dan exploring something new"],
  ];

  const storyChapters = [
    {
      number: "01",
      title: "Tiny me, big dreams",
      text: "I grew up loving dance, school activities, and trying a little bit of everything. Being a first honor student from kindergarten became part of my childhood, but so did the fun, curious kid behind the certificates.",
      image: "photo-029.jpg",
      alt: "Dan as a young child",
      caption: "Little Dan, already curious about everything.",
      note: "The early chapters",
    },
    {
      number: "02",
      title: "Plot twist: computer science",
      text: "Robotics class introduced me to a path I hadn't expected. It led me toward STEM Pre-Computer Science and, eventually, the Computer Science student I am today. Moving to Davao brought a whole new level of learning outside the classroom, too.",
      image: "photo-073.jpg",
      alt: "Dan in a school portrait",
      caption: "A school-day snapshot from the path that led me to Computer Science.",
      note: "Growing into my own",
    },
    {
      number: "03",
      title: "Turns out, I like showing up",
      text: "From classroom president to student body leadership and Red Cross Youth, I kept finding ways to help out. The titles mattered less than learning to listen, work with people, and be someone a team could count on.",
      image: "photo-097.jpg",
      alt: "Dan during Red Cross Youth activities",
      caption: "A small snapshot from my Red Cross Youth chapter.",
      note: "People first, always",
    },
    {
      number: "04",
      title: "The friend group lore",
      text: "Some favorite memories are simple: laughing until the day flies by, getting outside together, and having people who show up. Even when life changes and friendships take different paths, those moments still mean a lot.",
      image: "photo-084.jpg",
      alt: "Dan smiling in a selfie with friends outdoors",
      caption: "Fresh air, good company, and a memory to keep.",
      note: "Good days, good people",
    },
    {
      number: "05",
      title: "Still in my becoming era",
      text: "I don't have to be at the top or have every step planned out. I'm still ambitious, but I'm learning to take care of myself, enjoy the process, and grow at my own pace.",
      image: "photo-004.jpg",
      alt: "A personal photo from Dan's camera roll",
      caption: "A reminder to meet myself where I am.",
      note: "Work in progress (in a good way)",
    },
  ];

  const memories = [
    { title: "Little Dan, big day", story: "A tiny throwback to the school days that started it all.", image: "photo-030.jpg", alt: "Dan at a childhood school milestone" },
    { title: "Growing up, one memory at a time", story: "The early years were full of school activities, new things to try, and lots of little wins.", image: "photo-033.jpg", alt: "Dan during her early school years" },
    { title: "A curious side quest", story: "There was always something new to learn, make, or figure out.", image: "photo-013.jpg", alt: "Dan smiling in a playful selfie" },
    { title: "Main character, dance edition", story: "Dancing has always been one of my favorite ways to express myself.", image: "photo-044.jpg", alt: "Dan striking a playful dance pose" },
    { title: "One for the camera roll", story: "A little snapshot from a life that keeps changing in the best ways.", image: "photo-070.jpg", alt: "A close-up selfie of Dan" },
    { title: "Good days, kept close", story: "Not every favorite moment needs a big occasion—sometimes the small ones stay with you.", image: "photo-092.jpg", alt: "A favorite personal memory" },
  ];

  const polaroids = [
    { image: "photo-012.jpg", alt: "A personal memory from Dan's camera roll", caption: "little things, big memories" },
    { image: "photo-018.jpg", alt: "A personal memory from Dan's camera roll", caption: "one for the scrapbook" },
    { image: "photo-055.jpg", alt: "A collage of Dan and her friends", caption: "a day worth keeping" },
    { image: "photo-061.jpg", alt: "A personal memory from Dan's camera roll", caption: "just happy to be here" },
  ];

  const filmstripVideo = (index, duplicate = false) => {
    const number = String(index + 1).padStart(2, "0");
    const poster = index === 6 ? ' poster="public/about/videos/posters/memory-07.jpg" preload="auto"' : ' preload="metadata"';
    return `
      <div class="filmstrip-frame">
        <video class="filmstrip-video" data-video-src="public/about/videos/memory-${number}.mp4" muted loop playsinline${poster} aria-label="Looping memory video ${number}"${duplicate ? ' tabindex="-1" aria-hidden="true"' : ""}></video>
        <span>${number}</span>
      </div>`;
  };

  const dreams = [
    ["A career in technology", "Finish college, build a meaningful career in technology, and eventually establish my own company abroad."],
    ["A life of my own", "Build my own home, own a car, and create financial stability and independence."],
    ["Giving back to family", "Give back to my family and provide them with the opportunities and comfort they deserve."],
    ["A world of experiences", "Travel around the world, seek new adventures, and make memories with the people I love."],
  ];

  const activeMemory = memories[((state.memorySlide % memories.length) + memories.length) % memories.length];

  return `
    <div class="about-page" id="profile">
      <nav class="about-nav" aria-label="About page navigation">
        <a href="#profile"><span>01</span> Profile</a>
        <a href="#gallery"><span>02</span> Gallery</a>
        <a href="#socials"><span>03</span> Socials</a>
      </nav>

      <section class="about-hero" aria-labelledby="about-title">
        <div class="about-photo-main scrapbook-card">
          <div class="tape tape-left"></div>
          <div class="portrait-placeholder has-image">
            <img src="public/about/photos/photo-002.jpg" alt="Dan smiling in a light cardigan" />
            <div class="portrait-sticker">
              <span>Dan / Dandan<small>your friendly neighborhood bear</small></span>
            </div>
          </div>
          <p class="polaroid-caption">Hi, I'm Dan! 🍊🐻‍❄️ <span>✦</span></p>
        </div>
        <div class="about-intro">
          <p class="eyebrow">A little introduction</p>
          <h1 id="about-title">The Bear Behind the Calculator</h1>
          <p class="about-tagline">A little life behind the pixels, projects, and occasional procrastination.</p>
          <div class="about-bio">
            <p>Hello! I'm <strong>Danessah D. Berganio</strong>, but you can call me Dan or Dandan. My family calls me Ne or Shang. And if you've wondered why I associate myself with dalandan, it's because of my nickname! Somewhere along the way, "Dan dan dan dalandan" became an unofficial theme song—and honestly, I've learned to embrace it.</p>
            <p>I'm a 19-year-old Computer Science student from Malaybalay City, Bukidnon, currently navigating college life in Davao City. I enjoy learning new things, exploring different interests, and taking on challenges—even when I don't know exactly what I'm getting myself into.</p>
            <p>I'm curious, with a lot going on in my head. I love exploring worlds through anime, movies, manga, and manhwa, and I also enjoy puzzles, chess, dancing, creating things, and spending time with the people and animals I love.</p>
            <p>Leadership has always been part of me: taking responsibility, organizing activities, and being someone others can rely on. But I've learned there's more to life than achievements, titles, and always being at the top. I'm learning to be independent, appreciate the people around me, embrace my imperfections, and enjoy the process instead of pressuring myself to have everything figured out.</p>
            <p>At the end of the day, I'm just Dan: a little ambitious, a little chaotic, occasionally a procrastinator, but always someone who wants to make the most out of life.</p>
            <p class="about-welcome"><strong>Welcome to my little corner of the internet. There's more to this bear than meets the eye!</strong> 🐻‍❄️</p>
          </div>
          <div class="profile-mini-grid">
            <div><span>Display name</span><strong>Dan on Ice</strong></div>
            <div><span>Also known as</span><strong>Dan / Dandan · Ne / Shang</strong></div>
            <div><span>From</span><strong>Malaybalay City, Bukidnon</strong></div>
            <div><span>Studying</span><strong>BS Computer Science</strong></div>
            <div><span>University</span><strong>Ateneo de Davao University</strong></div>
          </div>
        </div>
      </section>

      <section class="about-section" aria-labelledby="interests-title">
        <div class="section-heading">
          <div><p class="eyebrow">Current interests</p><h2 id="interests-title">Things I’m into</h2></div>
          <span class="scribble">stay curious ♡</span>
        </div>
        <div class="interest-grid">
          ${interests.map(([title, detail, illustration, alt], index) => `
            <article class="interest-card${illustration ? " has-art" : ""}">
              <span class="interest-number">0${index + 1}</span>
              ${illustration ? `<div class="interest-art">${illustration.endsWith(".mp4") ? `<video src="${illustration}" muted loop playsinline autoplay preload="metadata" aria-label="${escapeHtml(alt)}"></video>` : `<img src="${illustration.startsWith("public/") ? illustration : `public/about/illustrations/${illustration}`}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`}</div>` : ""}
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(detail)}</p>
            </article>`).join("")}
        </div>
        <div class="favorites-row">
          <span>My favorites</span>
          <strong>Ice Bear</strong><strong>Food & quality time</strong><strong>Capybaras</strong>
        </div>
        <div class="favorite-notes">
          <p><strong>On repeat:</strong> anime, movies, series, manga & manhwa</p>
          <p><strong>Favorite genres:</strong> romance, fantasy, action & superpowers</p>
          <p><strong>To unwind:</strong> reading, dancing, gaming & sleeping</p>
          <p><strong>Personality:</strong> ENFP-T—one test result, not a permanent definition. Empathetic, patient, curious, resilient, goal-oriented, versatile, creative, and a people person.</p>
        </div>
      </section>

      <section class="about-section story-section" aria-labelledby="story-title">
        <div class="section-heading">
          <div><p class="eyebrow">The lore so far</p><h2 id="story-title">Little chapters of my life</h2></div>
        </div>
        <div class="story-timeline">
          ${storyChapters.map((chapter, index) => `
            <article class="story-card${index % 2 ? " story-card-reverse" : ""}">
              <div class="story-photo">
                <img src="public/about/photos/${chapter.image}" alt="${escapeHtml(chapter.alt)}" loading="lazy" decoding="async" />
                <span class="story-photo-number">${chapter.number}</span>
                <p>${escapeHtml(chapter.caption)}</p>
              </div>
              <div class="story-copy">
                <p class="story-kicker">Chapter ${chapter.number} <span>✦</span> ${escapeHtml(chapter.note)}</p>
                <h3>${escapeHtml(chapter.title)}</h3>
                <p>${escapeHtml(chapter.text)}</p>
              </div>
            </article>`).join("")}
        </div>
      </section>

      <section class="about-section" id="gallery" aria-labelledby="gallery-title">
        <div class="section-heading">
          <div><p class="eyebrow">The camera roll</p><h2 id="gallery-title">Little moments, kept close</h2></div>
        </div>
        <p class="memory-intro">A living scrapbook of photos and little video moments from my camera roll.</p>
        <div class="memory-feature">
          <div class="memory-slide-placeholder">
            <img src="public/about/photos/${activeMemory.image}" alt="${escapeHtml(activeMemory.alt)}" />
            <span class="memory-slide-number">${String(state.memorySlide + 1).padStart(2, "0")}</span>
          </div>
          <div class="memory-slide-info">
            <p class="eyebrow">A few favorite frames · ${String(state.memorySlide + 1).padStart(2, "0")} / ${memories.length}</p>
            <h3>${activeMemory.title}</h3>
            <p>${activeMemory.story}</p>
            <div class="memory-controls">
              <button type="button" data-action="memory-step" data-direction="-1" aria-label="Previous memory">←</button>
              <span class="memory-counter">${String(state.memorySlide + 1).padStart(2, "0")} / ${memories.length}</span>
              <button type="button" data-action="memory-step" data-direction="1" aria-label="Next memory">→</button>
            </div>
          </div>
        </div>
        <div class="memory-polaroids" aria-label="More moments from the camera roll">
          ${polaroids.map((photo, index) => `
            <figure class="memory-polaroid memory-polaroid-${index + 1}">
              <img src="public/about/photos/${photo.image}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async" />
              <figcaption>${escapeHtml(photo.caption)}</figcaption>
            </figure>`).join("")}
        </div>
        <div class="memory-video-heading">
          <div><p class="eyebrow">Camera roll, but make it cinema</p><h3>Little moments in motion</h3></div>
          <span>${ABOUT_VIDEO_COUNT} clips · on an endless loop</span>
        </div>
        <div class="memory-filmstrip" aria-label="A continuously moving strip of looping memory videos">
          <div class="memory-filmstrip-track">
            <div class="memory-film-reel">
              ${Array.from({ length: ABOUT_VIDEO_COUNT }, (_, index) => filmstripVideo(index)).join("")}
            </div>
            <div class="memory-film-reel" aria-hidden="true">
              ${Array.from({ length: ABOUT_VIDEO_COUNT }, (_, index) => filmstripVideo(index, true)).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="about-section" aria-labelledby="dreams-title">
        <div class="section-heading">
          <div><p class="eyebrow">A little look ahead</p><h2 id="dreams-title">Things I’m working toward</h2></div>
        </div>
        <div class="dream-scrapbook">
          <div class="dream-grid">
            ${dreams.map(([title, text], index) => `
              <article class="dream-card">
                <span>0${index + 1}</span>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(text)}</p>
              </article>`).join("")}
          </div>
          <figure class="dream-polaroid">
            <img src="public/about/photos/photo-020.jpg" alt="Dan enjoying a memorable day with friends" loading="lazy" decoding="async" />
            <figcaption>little by little, building a life I love</figcaption>
          </figure>
        </div>
      </section>

      <section class="about-socials" id="socials" aria-labelledby="socials-title">
        <div>
          <p class="eyebrow">Find me online</p>
          <h2 id="socials-title">Social media</h2>
        </div>
        <div class="social-links" aria-label="Social media links">
          <a class="social-placeholder" href="https://www.instagram.com/by.dalandan/?utm_source=ig_web_button_share_sheet" target="_blank" rel="noopener noreferrer" aria-label="Visit Dan's Instagram profile">
            <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.8" r=".7" class="social-fill"/></svg>
            <strong>Instagram</strong><span>@by.dalandan</span>
          </a>
          <a class="social-placeholder" href="https://www.facebook.com/danessah.berganio/" target="_blank" rel="noopener noreferrer" aria-label="Visit Dan's Facebook profile">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 21v-8h3l.5-3H14V8c0-.9.4-1.5 1.7-1.5H18V3.8c-.7-.1-1.6-.2-2.7-.2-2.7 0-4.5 1.6-4.5 4.6V10H8v3h2.8v8"/></svg>
            <strong>Facebook</strong><span>Danessah Berganio</span>
          </a>
        </div>
        <img class="about-bear" src="public/ice-bear-face.png" alt="Ice Bear mascot" />
      </section>
    </div>`;
}

function renderPage() {
  switch (state.activeTool) {
    case "about":
      return renderAbout();
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
  initializeMemoryFilmstrip();
}

function initializeMemoryFilmstrip() {
  memoryVideoObserver?.disconnect();
  const videos = app.querySelectorAll(".filmstrip-video");
  if (!videos.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loadVideo = (video, shouldPlay) => {
    if (!video.src) {
      video.src = video.dataset.videoSrc;
      video.load();
    }
    if (shouldPlay) {
      video.play().catch((error) => {
        console.warn(`Could not autoplay memory video ${video.getAttribute("aria-label")}.`, error);
      });
    } else {
      video.pause();
    }
  };

  if (!("IntersectionObserver" in window)) {
    videos.forEach((video) => loadVideo(video, !reducedMotion));
    return;
  }

  memoryVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        loadVideo(target, !reducedMotion);
      } else {
        target.pause();
      }
    });
  }, { rootMargin: "250px" });
  videos.forEach((video) => memoryVideoObserver.observe(video));
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
    case "memory-step": {
      const direction = Number(button.dataset.direction);
      state.memorySlide = (state.memorySlide + direction + ABOUT_MEMORY_COUNT) % ABOUT_MEMORY_COUNT;
      render();
      break;
    }
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
