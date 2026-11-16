import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type AssignmentId = "conversion" | "tax" | "loops" | "payroll";
type ToolId = AssignmentId | "history";

type HistoryRecord = {
  id: string;
  assignment: AssignmentId;
  calculation: string;
  input: string;
  result: string;
  createdAt: string;
};

type IconName =
  | "arrow"
  | "briefcase"
  | "calculator"
  | "chevron"
  | "conversion"
  | "history"
  | "info"
  | "loop"
  | "menu"
  | "plus"
  | "receipt"
  | "trash";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </>
    ),
    calculator: (
      <>
        <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
        <path d="M8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    conversion: (
      <>
        <path d="M4 7h14m0 0-3-3m3 3-3 3M20 17H6m0 0 3 3m-3-3 3-3" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    loop: (
      <>
        <path d="M17.7 6.3A8 8 0 1 0 20 12" />
        <path d="M17 2v5h5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2-3-2Z" />
        <path d="M9 9h6M9 13h6" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

const tools: { id: ToolId; name: string; short: string; icon: IconName; number: string }[] = [
  { id: "conversion", name: "Unit conversion", short: "Convert", icon: "conversion", number: "01" },
  { id: "tax", name: "Income tax", short: "Tax", icon: "receipt", number: "02" },
  { id: "loops", name: "Natural numbers", short: "Loops", icon: "loop", number: "03" },
  { id: "payroll", name: "Simple payroll", short: "Payroll", icon: "briefcase", number: "04" },
  { id: "history", name: "Calculation history", short: "History", icon: "history", number: "05" },
];

function Field({
  label,
  value,
  onChange,
  min,
  placeholder = "0",
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        inputMode="decimal"
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function PageHeading({
  kicker,
  title,
  description,
  assignment,
}: {
  kicker: string;
  title: string;
  description: string;
  assignment: string;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <span className="assignment-chip">{assignment}</span>
    </header>
  );
}

function FormulaNote({ children }: { children: ReactNode }) {
  return (
    <div className="formula-note">
      <span>
        <Icon name="info" size={16} />
      </span>
      <p>{children}</p>
    </div>
  );
}

const conversionOptions = [
  { id: "c-f", label: "Celsius to Fahrenheit", from: "°C", to: "°F" },
  { id: "f-c", label: "Fahrenheit to Celsius", from: "°F", to: "°C" },
  { id: "m-ft", label: "Meters to Feet", from: "m", to: "ft" },
  { id: "ft-m", label: "Feet to Meters", from: "ft", to: "m" },
] as const;

function Conversion({
  onRecord,
}: {
  onRecord: (record: Omit<HistoryRecord, "id" | "createdAt">) => void;
}) {
  const [type, setType] = useState<(typeof conversionOptions)[number]["id"]>("c-f");
  const [input, setInput] = useState("");
  const option = conversionOptions.find((item) => item.id === type)!;
  const numeric = Number(input);
  const hasValue = input !== "" && Number.isFinite(numeric);

  let result = 0;
  let formula = "";
  let substitution = "";

  if (type === "c-f") {
    result = numeric * (9 / 5) + 32;
    formula = "°F = (°C × 9/5) + 32";
    substitution = `(${numeric} × 9/5) + 32`;
  } else if (type === "f-c") {
    result = (numeric - 32) * (5 / 9);
    formula = "°C = (°F − 32) × 5/9";
    substitution = `(${numeric} − 32) × 5/9`;
  } else if (type === "m-ft") {
    result = numeric * 3.28084;
    formula = "ft = m × 3.28084";
    substitution = `${numeric} × 3.28084`;
  } else {
    result = numeric / 3.28084;
    formula = "m = ft ÷ 3.28084";
    substitution = `${numeric} ÷ 3.28084`;
  }

  const displayResult = Number.isInteger(result)
    ? result.toString()
    : result.toLocaleString("en-US", { maximumFractionDigits: 4 });

  return (
    <>
      <PageHeading
        assignment="Assignment 01"
        description="Convert temperature and length values with transparent, step-by-step solutions."
        kicker="Measurement tools"
        title="Unit conversion"
      />
      <div className="two-column">
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="step-number">1</span>
              <h2>Choose a conversion</h2>
            </div>
            <p>Select one of the four supported units.</p>
          </div>
          <div className="choice-grid">
            {conversionOptions.map((item) => (
              <button
                className={`choice ${type === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => {
                  setType(item.id);
                  setInput("");
                }}
                type="button"
              >
                <span>{item.from}</span>
                <Icon name="arrow" size={15} />
                <span>{item.to}</span>
                <small>{item.label}</small>
              </button>
            ))}
          </div>
          <div className="divider" />
          <div className="card-heading compact">
            <div>
              <span className="step-number">2</span>
              <h2>Enter your value</h2>
            </div>
          </div>
          <label className="measure-field">
            <input
              autoFocus
              inputMode="decimal"
              onChange={(event) => setInput(event.target.value)}
              placeholder="0"
              type="number"
              value={input}
            />
            <span>{option.from}</span>
          </label>
        </section>
        <section className={`result-card ${hasValue ? "has-result" : ""}`} aria-live="polite">
          <p className="result-label">Converted value</p>
          {hasValue ? (
            <>
              <div className="big-result">
                {displayResult}
                <span>{option.to}</span>
              </div>
              <div className="calculation-steps">
                <p>How it was calculated</p>
                <div>
                  <span>Formula</span>
                  <strong>{formula}</strong>
                </div>
                <div>
                  <span>Substitute</span>
                  <strong>{substitution}</strong>
                </div>
                <div>
                  <span>Answer</span>
                  <strong>
                    {displayResult} {option.to}
                  </strong>
                </div>
                <button
                  className="history-button"
                  onClick={() =>
                    onRecord({
                      assignment: "conversion",
                      calculation: option.label,
                      input: `${input} ${option.from}`,
                      result: `${displayResult} ${option.to}`,
                    })
                  }
                  type="button"
                >
                  <Icon name="history" size={14} />
                  Save to history
                </button>
              </div>
            </>
          ) : (
            <div className="empty-result">
              <Icon name="calculator" size={26} />
              <p>Your answer and calculation steps will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

const taxBrackets = [
  { range: "Up to ₱250,000", rate: "0%", over: 0, ceiling: 250_000, base: 0, percent: 0 },
  {
    range: "₱250,000–₱400,000",
    rate: "20% excess",
    over: 250_000,
    ceiling: 400_000,
    base: 0,
    percent: 0.2,
  },
  {
    range: "₱400,000–₱800,000",
    rate: "₱30,000 + 25%",
    over: 400_000,
    ceiling: 800_000,
    base: 30_000,
    percent: 0.25,
  },
  {
    range: "₱800,000–₱2,000,000",
    rate: "₱130,000 + 30%",
    over: 800_000,
    ceiling: 2_000_000,
    base: 130_000,
    percent: 0.3,
  },
  {
    range: "₱2M–₱8M",
    rate: "₱490,000 + 32%",
    over: 2_000_000,
    ceiling: 8_000_000,
    base: 490_000,
    percent: 0.32,
  },
  {
    range: "Over ₱8,000,000",
    rate: "₱2,410,000 + 35%",
    over: 8_000_000,
    ceiling: Infinity,
    base: 2_410_000,
    percent: 0.35,
  },
];

const money = (value: number) =>
  value.toLocaleString("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

function IncomeTax({
  onRecord,
}: {
  onRecord: (record: Omit<HistoryRecord, "id" | "createdAt">) => void;
}) {
  const [income, setIncome] = useState("");
  const amount = Math.max(0, Number(income) || 0);
  const bracket = taxBrackets.find((item) => amount <= item.ceiling) ?? taxBrackets[5];
  const excess = Math.max(0, amount - bracket.over);
  const percentageTax = excess * bracket.percent;
  const total = bracket.base + percentageTax;
  const hasValue = income !== "";

  return (
    <>
      <PageHeading
        assignment="Assignment 02"
        description="Estimate annual Philippine income tax using the supplied graduated tax table."
        kicker="Finance tools"
        title="Income tax calculator"
      />
      <div className="two-column tax-layout">
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="step-number">1</span>
              <h2>Taxable income</h2>
            </div>
            <p>Enter the annual net taxable income in Philippine pesos.</p>
          </div>
          <label className="money-field">
            <span>₱</span>
            <input
              inputMode="decimal"
              min="0"
              onChange={(event) => setIncome(event.target.value)}
              placeholder="0.00"
              type="number"
              value={income}
            />
          </label>
          <FormulaNote>Income tax = basic tax + rate on the excess</FormulaNote>
        </section>
        <section className="result-card tax-result" aria-live="polite">
          <p className="result-label">Estimated income tax</p>
          <div className="big-result money">{hasValue ? money(total) : "₱0.00"}</div>
          <p className="bracket-label">{hasValue ? bracket.range : "Enter an amount to begin"}</p>
          {hasValue && (
            <div className="calculation-steps">
              <p>Tax breakdown</p>
              <div>
                <span>Basic tax</span>
                <strong>{money(bracket.base)}</strong>
              </div>
              <div>
                <span>Taxable excess</span>
                <strong>{money(excess)}</strong>
              </div>
              <div>
                <span>{Math.round(bracket.percent * 100)}% of excess</span>
                <strong>{money(percentageTax)}</strong>
              </div>
              <div>
                <span>Total tax</span>
                <strong>{money(total)}</strong>
              </div>
              <button
                className="history-button"
                onClick={() =>
                  onRecord({
                    assignment: "tax",
                    calculation: `Income tax · ${bracket.range}`,
                    input: money(amount),
                    result: money(total),
                  })
                }
                type="button"
              >
                <Icon name="history" size={14} />
                Save to history
              </button>
            </div>
          )}
        </section>
      </div>
      <section className="card tax-table-card">
        <div className="card-heading table-title">
          <div>
            <span className="step-number">2</span>
            <h2>Graduated tax table</h2>
          </div>
          <p>The active bracket is highlighted automatically.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Net taxable income</th>
                <th>Basic tax + rate</th>
              </tr>
            </thead>
            <tbody>
              {taxBrackets.map((item) => (
                <tr className={hasValue && item === bracket ? "selected-row" : ""} key={item.range}>
                  <td>{item.range}</td>
                  <td>{item.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function NaturalNumbers({
  onRecord,
}: {
  onRecord: (record: Omit<HistoryRecord, "id" | "createdAt">) => void;
}) {
  const [value, setValue] = useState("");
  const input = Number(value);
  const valid = Number.isInteger(input) && input > 0 && input <= 170;

  const results = useMemo(() => {
    if (!valid) return null;

    // Required: factorial implemented with a while loop.
    let factorial = 1;
    let factor = 1;
    while (factor <= input) {
      factorial *= factor;
      factor++;
    }

    // Required: sum implemented with a do...while loop.
    let sum = 0;
    let addend = 1;
    do {
      sum += addend;
      addend++;
    } while (addend <= input);

    // Required: average implemented with a for loop.
    let averageSum = 0;
    for (let number = 1; number <= input; number++) {
      averageSum += number;
    }

    return { factorial, sum, average: averageSum / input };
  }, [input, valid]);

  const factorialSequence =
    input <= 8
      ? Array.from({ length: Math.max(input, 0) }, (_, index) => index + 1).join(" × ")
      : `1 × 2 × 3 × … × ${input}`;

  return (
    <>
      <PageHeading
        assignment="Assignment 03"
        description="Explore factorial, sum, and average using the required JavaScript loop structures."
        kicker="Looping exercise"
        title="First N natural numbers"
      />
      <section className="card natural-input">
        <div className="card-heading">
          <div>
            <span className="step-number">1</span>
            <h2>Enter a natural number</h2>
          </div>
          <p>Use a whole number from 1 to 170.</p>
        </div>
        <Field label="Value of N" min={1} onChange={setValue} step="1" value={value} />
        {results && (
          <button
            className="primary-button save-loop"
            onClick={() =>
              onRecord({
                assignment: "loops",
                calculation: "Factorial, sum and average",
                input: `N = ${input}`,
                result: `Factorial: ${results.factorial.toLocaleString("en-US")} · Sum: ${results.sum} · Average: ${results.average}`,
              })
            }
            type="button"
          >
            <Icon name="history" size={14} />
            Save results
          </button>
        )}
        {value !== "" && !valid && (
          <p className="error-text">Please enter a whole number from 1 to 170.</p>
        )}
      </section>
      <div className="loop-grid" aria-live="polite">
        <article className="loop-card">
          <div className="loop-card-top">
            <span>01</span>
            <code>while</code>
          </div>
          <h2>Nth factorial</h2>
          <p>Multiplies each natural number from 1 through N.</p>
          <div className="loop-answer">
            {results ? results.factorial.toLocaleString("en-US") : "—"}
          </div>
          <div className="loop-formula">
            <span>Steps</span>
            <strong>
              {results
                ? `${factorialSequence} = ${results.factorial.toLocaleString("en-US")}`
                : "Enter N to calculate"}
            </strong>
          </div>
        </article>
        <article className="loop-card">
          <div className="loop-card-top">
            <span>02</span>
            <code>do...while</code>
          </div>
          <h2>Sum of numbers</h2>
          <p>Adds all natural numbers from 1 through N.</p>
          <div className="loop-answer">{results ? results.sum.toLocaleString("en-US") : "—"}</div>
          <div className="loop-formula">
            <span>Formula</span>
            <strong>
              {results ? `${input} × (${input} + 1) ÷ 2 = ${results.sum}` : "Enter N to calculate"}
            </strong>
          </div>
        </article>
        <article className="loop-card">
          <div className="loop-card-top">
            <span>03</span>
            <code>for</code>
          </div>
          <h2>Average</h2>
          <p>Finds the mean of all natural numbers from 1 through N.</p>
          <div className="loop-answer">
            {results ? results.average.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
          </div>
          <div className="loop-formula">
            <span>Formula</span>
            <strong>
              {results ? `${results.sum} ÷ ${input} = ${results.average}` : "Enter N to calculate"}
            </strong>
          </div>
        </article>
      </div>
    </>
  );
}

type Employee = {
  id: number;
  name: string;
  days: number;
  rate: number;
  deduction: number;
};

function Payroll({
  onRecord,
}: {
  onRecord: (record: Omit<HistoryRecord, "id" | "createdAt">) => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [rate, setRate] = useState("");
  const [deduction, setDeduction] = useState("");
  const [deleteLine, setDeleteLine] = useState("");
  const [error, setError] = useState("");
  const [nextId, setNextId] = useState(1);

  const addEmployee = (event: FormEvent) => {
    event.preventDefault();
    const dayValue = Number(days);
    const rateValue = Number(rate);
    const deductionValue = Number(deduction);
    if (!name.trim() || dayValue <= 0 || rateValue < 0 || deductionValue < 0) {
      setError("Complete every field using valid, non-negative values.");
      return;
    }
    setEmployees((current) => [
      ...current,
      { id: nextId, name: name.trim(), days: dayValue, rate: rateValue, deduction: deductionValue },
    ]);
    const gross = dayValue * rateValue;
    onRecord({
      assignment: "payroll",
      calculation: name.trim(),
      input: `${dayValue} days × ${money(rateValue)} − ${money(deductionValue)}`,
      result: `Gross: ${money(gross)} · Net: ${money(gross - deductionValue)}`,
    });
    setNextId((current) => current + 1);
    setName("");
    setDays("");
    setRate("");
    setDeduction("");
    setError("");
  };

  const removeLine = (line: number) => {
    if (line < 1 || line > employees.length) {
      setError("Enter an existing line number to delete.");
      return;
    }
    setEmployees((current) => current.filter((_, index) => index !== line - 1));
    setDeleteLine("");
    setError("");
  };

  const totalNet = employees.reduce(
    (total, employee) => total + employee.days * employee.rate - employee.deduction,
    0,
  );

  return (
    <>
      <PageHeading
        assignment="Assignment 04"
        description="Add employees, calculate gross and net pay, and manage the payroll list."
        kicker="Payroll tools"
        title="Simple payroll"
      />
      <section className="card payroll-form-card">
        <div className="card-heading">
          <div>
            <span className="step-number">1</span>
            <h2>Add an employee</h2>
          </div>
          <p>Gross pay and net pay are calculated automatically.</p>
        </div>
        <form className="payroll-form" onSubmit={addEmployee}>
          <label className="field name-field">
            <span>Employee name</span>
            <input
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              type="text"
              value={name}
            />
          </label>
          <Field label="Days worked" min={0} onChange={setDays} value={days} />
          <Field label="Daily rate (₱)" min={0} onChange={setRate} value={rate} />
          <Field label="Deduction (₱)" min={0} onChange={setDeduction} value={deduction} />
          <button className="primary-button" type="submit">
            <Icon name="plus" size={17} />
            Add employee
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
        <FormulaNote>
          Gross pay = days worked × daily rate &nbsp;·&nbsp; Net pay = gross pay − deduction
        </FormulaNote>
      </section>
      <section className="card payroll-table-card">
        <div className="payroll-table-heading">
          <div className="card-heading compact">
            <div>
              <span className="step-number">2</span>
              <h2>Payroll list</h2>
            </div>
            <p>
              {employees.length} {employees.length === 1 ? "employee" : "employees"}
            </p>
          </div>
          <div className="delete-control">
            <label>
              <span>Delete line</span>
              <input
                min="1"
                onChange={(event) => setDeleteLine(event.target.value)}
                placeholder="No."
                type="number"
                value={deleteLine}
              />
            </label>
            <button
              aria-label="Delete line"
              onClick={() => removeLine(Number(deleteLine))}
              type="button"
            >
              <Icon name="trash" size={17} />
            </button>
          </div>
        </div>
        <div className="table-wrap payroll-table">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Employee</th>
                <th>Days</th>
                <th>Daily rate</th>
                <th>Gross pay</th>
                <th>Deduction</th>
                <th>Net pay</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.length ? (
                employees.map((employee, index) => {
                  const gross = employee.days * employee.rate;
                  const net = gross - employee.deduction;
                  return (
                    <tr key={employee.id}>
                      <td>{String(index + 1).padStart(2, "0")}</td>
                      <td>
                        <strong>{employee.name}</strong>
                      </td>
                      <td>{employee.days}</td>
                      <td>{money(employee.rate)}</td>
                      <td>{money(gross)}</td>
                      <td>{money(employee.deduction)}</td>
                      <td>
                        <strong>{money(net)}</strong>
                      </td>
                      <td>
                        <button
                          aria-label={`Delete ${employee.name}`}
                          className="row-delete"
                          onClick={() => removeLine(index + 1)}
                          type="button"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="empty-table" colSpan={8}>
                    <Icon name="briefcase" size={23} />
                    <span>No employees yet. Add your first record above.</span>
                  </td>
                </tr>
              )}
            </tbody>
            {employees.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6}>Total net payroll</td>
                  <td>{money(totalNet)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </>
  );
}

const historySections: { id: AssignmentId; title: string; subtitle: string }[] = [
  {
    id: "conversion",
    title: "Assignment 01 — Unit Conversion",
    subtitle: "Temperature and length conversions",
  },
  { id: "tax", title: "Assignment 02 — Income Tax", subtitle: "Taxable income calculations" },
  {
    id: "loops",
    title: "Assignment 03 — Natural Numbers",
    subtitle: "Factorial, sum and average results",
  },
  { id: "payroll", title: "Assignment 04 — Simple Payroll", subtitle: "Employee pay calculations" },
];

function History({
  records,
  onClear,
  onDelete,
}: {
  records: HistoryRecord[];
  onClear: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <PageHeading
        assignment={`${records.length} saved`}
        description="A local record of calculations completed across all four programming assignments."
        kicker="Student records"
        title="Calculation history"
      />
      <div className="history-toolbar">
        <p>Records are saved in this browser and remain available when you return.</p>
        {records.length > 0 && (
          <button className="clear-history" onClick={onClear} type="button">
            <Icon name="trash" size={14} />
            Clear all history
          </button>
        )}
      </div>
      <div className="history-sections">
        {historySections.map((section) => {
          const sectionRecords = records.filter((record) => record.assignment === section.id);
          return (
            <section className="history-section" key={section.id}>
              <div className="history-section-heading">
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.subtitle}</p>
                </div>
                <span>
                  {sectionRecords.length} record{sectionRecords.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="table-wrap history-table">
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Calculation</th>
                      <th>Input / Details</th>
                      <th>Result</th>
                      <th>Date &amp; Time</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRecords.length > 0 ? (
                      sectionRecords.map((record, index) => (
                        <tr key={record.id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{record.calculation}</strong>
                          </td>
                          <td>{record.input}</td>
                          <td>{record.result}</td>
                          <td>
                            {new Date(record.createdAt).toLocaleString("en-PH", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td>
                            <button
                              aria-label={`Delete ${record.calculation} history record`}
                              className="row-delete"
                              onClick={() => onDelete(record.id)}
                              type="button"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="history-empty" colSpan={6}>
                          No saved calculations for this assignment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("conversion");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem("addu-calculation-history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("addu-calculation-history", JSON.stringify(history));
  }, [history]);

  const addHistory = (record: Omit<HistoryRecord, "id" | "createdAt">) => {
    setHistory((current) =>
      [
        {
          ...record,
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 200),
    );
  };

  const selectTool = (tool: ToolId) => {
    setActiveTool(tool);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-mark" src="/addu-seal.png" alt="Ateneo de Davao University seal" />
          <div>
            <strong>STUDENT CALCULATOR</strong>
            <span>ATENEO DE DAVAO UNIVERSITY</span>
          </div>
        </div>
        <p className="nav-label">Assignments</p>
        <nav>
          {tools.map((tool) => (
            <button
              className={activeTool === tool.id ? "active" : ""}
              key={tool.id}
              onClick={() => selectTool(tool.id)}
              type="button"
            >
              <span className="nav-icon">
                <Icon name={tool.icon} size={18} />
              </span>
              <span>{tool.name}</span>
              <small>{tool.number}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Icon name="info" size={17} />
          <div>
            <strong>CS 1130</strong>
            <span>Introduction to Computing</span>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          aria-label="Close menu"
          className="backdrop"
          onClick={() => setMobileMenu(false)}
          type="button"
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <button
            aria-label="Open menu"
            className="menu-button"
            onClick={() => setMobileMenu(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>CS 1130</span>
            <Icon name="chevron" size={14} />
            <strong>{tools.find((tool) => tool.id === activeTool)?.name}</strong>
          </div>
          <div className="status">
            <span />
            All calculations run locally
          </div>
        </header>
        <main>
          {activeTool === "conversion" && <Conversion onRecord={addHistory} />}
          {activeTool === "tax" && <IncomeTax onRecord={addHistory} />}
          {activeTool === "loops" && <NaturalNumbers onRecord={addHistory} />}
          {activeTool === "payroll" && <Payroll onRecord={addHistory} />}
          {activeTool === "history" && (
            <History
              records={history}
              onClear={() => setHistory([])}
              onDelete={(id) =>
                setHistory((current) => current.filter((record) => record.id !== id))
              }
            />
          )}
        </main>
        <footer>
          <span>CS 1130 · Web Page Project</span>
          <span>Ateneo de Davao University</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Assignments">
        {tools.map((tool) => (
          <button
            className={activeTool === tool.id ? "active" : ""}
            key={tool.id}
            onClick={() => selectTool(tool.id)}
            type="button"
          >
            <Icon name={tool.icon} size={19} />
            <span>{tool.short}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
