/* ================================================================
   KEUANGAN POKJA PENGELOLAAN SAMPAH ADIWIYATA
   SCRIPT.JS - FINAL
   Kompatibel dengan Code.gs tanpa perubahan backend
   ================================================================ */

const API_URL =
  "https://script.google.com/macros/s/AKfycby8HssHrbPp7Njhy9TpP9kC3fOSx1MTNmontcdN3H_v57txKJNc5llC1nrvXr0WPqtt/exec";

const APP = {
  dashboard: null,
  cash: null,
  employees: [],
  payroll: [],
  income: [],
  expenses: [],
  history: [],
  currentPage: "dashboard",
  refreshTimer: null
};


/* ================================================================
   FORMAT
   ================================================================ */

function formatRupiah(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(isFinite(number) ? number : 0);
}


function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID").format(
    isFinite(number) ? number : 0
  );
}


function formatDateReadable(value) {
  if (!value) return "-";

  const text = String(value);

  if (text.includes(" ")) {
    const parts = text.split(" ");
    const date = parts[0];

    const dateParts = date.split("/");

    if (dateParts.length === 3) {
      return dateParts.join("/");
    }
  }

  return text;
}


function getTodayLocal() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}


function getCurrentMonth() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0")
  ].join("-");
}


function monthLabel(month) {
  if (!month) return "-";

  const parts = String(month).split("-");

  if (parts.length !== 2) {
    return month;
  }

  const names = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember"
  ];

  const index = Number(parts[1]) - 1;

  return names[index]
    ? names[index] + " " + parts[0]
    : month;
}


function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}


function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ================================================================
   TOAST
   ================================================================ */

let toastTimer = null;

function showToast(message, type = "success", duration = 3500) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.className = "toast";

  toast.classList.add(
    type === "error"
      ? "toast-error"
      : type === "warning"
      ? "toast-warning"
      : "toast-success"
  );

  toast.textContent = message;

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}


/* ================================================================
   LOADING
   ================================================================ */

function setLoading(show, text = "Memproses data...") {
  const overlay =
    document.getElementById("loadingOverlay");

  const loadingText =
    document.getElementById("loadingText");

  if (!overlay) return;

  if (loadingText) {
    loadingText.textContent = text;
  }

  overlay.classList.toggle("show", show);
}


/* ================================================================
   API GET
   ================================================================ */

async function apiGet(action, params = {}) {
  let url =
    API_URL +
    "?action=" +
    encodeURIComponent(action) +
    "&_=" +
    Date.now();

  Object.keys(params).forEach(key => {
    const value = params[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url +=
        "&" +
        encodeURIComponent(key) +
        "=" +
        encodeURIComponent(value);
    }
  });

  let response;

  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow"
    });
  } catch (error) {
    throw new Error(
      "Tidak dapat terhubung ke Google Apps Script."
    );
  }

  if (!response.ok) {
    throw new Error(
      "Server tidak dapat diakses. HTTP " +
      response.status
    );
  }

  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw new Error(
      "Server mengembalikan data yang tidak valid."
    );
  }

  if (!result || result.success !== true) {
    throw new Error(
      result && result.error
        ? result.error
        : "Permintaan gagal diproses."
    );
  }

  return result;
}


/* ================================================================
   API POST
   ================================================================ */

async function apiPost(payload) {
  let response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error(
      "Tidak dapat terhubung ke Google Apps Script."
    );
  }

  if (!response.ok) {
    throw new Error(
      "Server tidak dapat diakses. HTTP " +
      response.status
    );
  }

  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw new Error(
      "Server mengembalikan data yang tidak valid."
    );
  }

  if (!result || result.success !== true) {
    throw new Error(
      result && result.error
        ? result.error
        : "Transaksi gagal diproses."
    );
  }

  return result;
}


/* ================================================================
   STATUS KONEKSI
   ================================================================ */

function setConnectionStatus(
  connected,
  message
) {
  const element =
    document.getElementById(
      "connectionStatus"
    );

  if (!element) return;

  element.className =
    "connection-status " +
    (connected
      ? "connected"
      : "disconnected");

  element.innerHTML =
    '<span class="connection-dot"></span>' +
    escapeHtml(
      message ||
      (connected
        ? "Terhubung"
        : "Tidak terhubung")
    );
}


/* ================================================================
   NAVIGASI
   ================================================================ */

function showPage(pageName) {
  const pages =
    document.querySelectorAll(".page");

  pages.forEach(page => {
    page.classList.remove("active");
  });

  const target =
    document.getElementById(
      "page-" + pageName
    );

  if (!target) return;

  target.classList.add("active");

  document
    .querySelectorAll(".nav-button")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === pageName
      );
    });

  APP.currentPage = pageName;

  setText(
    "mobilePageTitle",
    target.dataset.title || ""
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  closeMobileMenu();

  if (pageName === "dashboard") {
    loadDashboard();
  }

  if (pageName === "income") {
    initializeIncomeForm();
    loadIncome();
  }

  if (pageName === "expense") {
    initializeExpenseForm();
    loadExpenses();
  }

  if (pageName === "salary") {
    loadPayroll();
  }

  if (pageName === "employees") {
    loadEmployees();
  }

  if (pageName === "history") {
    loadHistory();
  }
}


/* ================================================================
   DASHBOARD
   ================================================================ */

async function loadDashboard() {
  try {
    setConnectionStatus(
      true,
      "Memuat data..."
    );

    const result =
      await apiGet("dashboard");

    APP.dashboard =
      result.data || {};

    renderDashboard(
      APP.dashboard
    );

    setConnectionStatus(
      true,
      "Terhubung"
    );

    return APP.dashboard;

  } catch (error) {
    console.error(error);

    setConnectionStatus(
      false,
      "Gagal terhubung"
    );

    showToast(
      error.message ||
      "Dashboard gagal dimuat.",
      "error",
      5000
    );

    return null;
  }
}


function renderDashboard(data) {
  if (!data) return;

  const totalIncome =
    Number(
      data.totalPemasukan || 0
    );

  const totalCashAllocation =
    Number(
      data.totalAlokasiKas || 0
    );

  const totalExpense =
    Number(
      data.totalPengeluaran || 0
    );

  const cashBalance =
    Number(
      data.saldoKas || 0
    );

  const payrollFund =
    Number(
      data.totalDanaPenggajian || 0
    );

  const employeeCount =
    Number(
      data.totalPegawai || 0
    );

  const totalPoints =
    Number(
      data.totalPoin || 0
    );

  setText(
    "totalIncome",
    formatRupiah(totalIncome)
  );

  setText(
    "totalCashAllocation",
    formatRupiah(
      totalCashAllocation
    )
  );

  setText(
    "totalExpense",
    formatRupiah(totalExpense)
  );

  setText(
    "cashBalance",
    formatRupiah(cashBalance)
  );

  setText(
    "payrollFund",
    formatRupiah(payrollFund)
  );

  setText(
    "employeeCount",
    formatNumber(employeeCount)
  );

  setText(
    "totalPoints",
    formatNumber(totalPoints)
  );

  setText(
    "currentPeriod",
    getCurrentMonthLabel()
  );

  setText(
    "dashboardPeriod",
    getCurrentMonthLabel()
  );

  setText(
    "cashIncome",
    formatRupiah(totalIncome)
  );

  setText(
    "cashAllocation",
    formatRupiah(
      totalCashAllocation
    )
  );

  setText(
    "cashExpense",
    formatRupiah(totalExpense)
  );

  setText(
    "cashRemaining",
    formatRupiah(cashBalance)
  );

  setText(
    "cashPayroll",
    formatRupiah(payrollFund)
  );

  renderDashboardPayroll(
    data.payroll || []
  );
}


function getCurrentMonthLabel() {
  return monthLabel(
    getCurrentMonth()
  );
}


function renderDashboardPayroll(months) {
  const currentMonth =
    getCurrentMonth();

  const current =
    months.find(
      item =>
        String(item.bulan) ===
        currentMonth
    );

  if (!current) {
    setText(
      "currentMonthIncome",
      formatRupiah(0)
    );

    setText(
      "currentMonthPayroll",
      formatRupiah(0)
    );

    setText(
      "currentMonthPoint",
      formatRupiah(0)
    );

    setText(
      "currentMonthSalary",
      formatRupiah(0)
    );

    return;
  }

  const totalSalary =
    (current.pegawai || [])
      .reduce(
        (sum, employee) =>
          sum +
          Number(employee.gaji || 0),
        0
      );

  setText(
    "currentMonthIncome",
    formatRupiah(
      current.totalPemasukan
    )
  );

  setText(
    "currentMonthPayroll",
    formatRupiah(
      current.dana70
    )
  );

  setText(
    "currentMonthPoint",
    formatRupiah(
      current.nilai1Poin
    )
  );

  setText(
    "currentMonthSalary",
    formatRupiah(
      totalSalary
    )
  );
}


/* ================================================================
   KAS
   ================================================================ */

async function loadCash() {
  try {
    const result =
      await apiGet("getCash");

    APP.cash =
      result.data || {};

    renderCash(APP.cash);

    return APP.cash;

  } catch (error) {
    console.error(error);
    return null;
  }
}


function renderCash(data) {
  if (!data) return;

  setText(
    "cashPageIncome",
    formatRupiah(
      data.totalIncome
    )
  );

  setText(
    "cashPageAllocation",
    formatRupiah(
      data.totalCashAllocation
    )
  );

  setText(
    "cashPageExpense",
    formatRupiah(
      data.totalExpense
    )
  );

  setText(
    "cashPageBalance",
    formatRupiah(
      data.cashBalance
    )
  );

  setText(
    "cashPagePayroll",
    formatRupiah(
      data.totalPayrollFund
    )
  );
}


/* ================================================================
   PEMASUKAN
   ================================================================ */

function initializeIncomeForm() {
  const date =
    document.getElementById(
      "incomeDate"
    );

  if (
    date &&
    !date.value
  ) {
    date.value =
      getTodayLocal();
  }

  updateIncomePreview();
}


function updateIncomePreview() {
  const input =
    document.getElementById(
      "incomeNominal"
    );

  const kasPokja =
    document.getElementById(
      "previewKasPokja"
    );

  const payroll =
    document.getElementById(
      "previewKasPenggajian"
    );

  const nominal =
    Number(
      input
        ? input.value
        : 0
    );

  const cash =
    nominal * 0.30;

  const salary =
    nominal * 0.70;

  if (kasPokja) {
    kasPokja.textContent =
      formatRupiah(cash);
  }

  if (payroll) {
    payroll.textContent =
      formatRupiah(salary);
  }
}


async function submitIncome(event) {
  event.preventDefault();

  const form =
    document.getElementById(
      "incomeForm"
    );

  const button =
    document.getElementById(
      "incomeSubmitButton"
    );

  const buttonText =
    document.getElementById(
      "incomeSubmitText"
    );

  const date =
    document.getElementById(
      "incomeDate"
    );

  const source =
    document.getElementById(
      "incomeSource"
    );

  const nominal =
    document.getElementById(
      "incomeNominal"
    );

  if (!date || !date.value) {
    showToast(
      "Tanggal pemasukan wajib diisi.",
      "warning"
    );
    return;
  }

  if (!source || !source.value) {
    showToast(
      "Sumber dana wajib dipilih.",
      "warning"
    );
    return;
  }

  const amount =
    Number(
      nominal
        ? nominal.value
        : 0
    );

  if (
    !amount ||
    amount <= 0
  ) {
    showToast(
      "Nominal pemasukan harus lebih dari 0.",
      "warning"
    );
    return;
  }

  const confirmed =
    window.confirm(
      "Simpan pemasukan " +
      formatRupiah(amount) +
      " dari " +
      source.value +
      "?"
    );

  if (!confirmed) return;

  try {
    if (button) {
      button.disabled = true;
    }

    if (buttonText) {
      buttonText.textContent =
        "Menyimpan...";
    }

    setLoading(
      true,
      "Menyimpan pemasukan..."
    );

    const result =
      await apiPost({
        action: "addIncome",
        date: date.value,
        nominal: amount,
        source: source.value
      });

    showIncomeResult(
      result.data || {}
    );

    if (form) {
      form.reset();
    }

    initializeIncomeForm();

    await loadDashboard();
    await loadIncome();

    showToast(
      "Pemasukan berhasil disimpan."
    );

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Pemasukan gagal disimpan.",
      "error",
      5000
    );

  } finally {
    setLoading(false);

    if (button) {
      button.disabled = false;
    }

    if (buttonText) {
      buttonText.textContent =
        "Simpan Pemasukan";
    }
  }
}


function showIncomeResult(data) {
  const box =
    document.getElementById(
      "incomeResult"
    );

  if (!box) return;

  box.innerHTML = `
    <div class="result-icon">✓</div>

    <div class="result-content">
      <strong>Pemasukan berhasil disimpan</strong>

      <div class="result-grid">
        <div>
          <span>Nominal</span>
          <b>${formatRupiah(data.nominal)}</b>
        </div>

        <div>
          <span>Sumber</span>
          <b>${escapeHtml(data.sumber || "-")}</b>
        </div>

        <div>
          <span>Kas Pokja 30%</span>
          <b>${formatRupiah(data.kasPokja)}</b>
        </div>

        <div>
          <span>Penggajian 70%</span>
          <b>${formatRupiah(data.penggajian)}</b>
        </div>
      </div>
    </div>
  `;

  box.classList.add("show");
}


/* ================================================================
   LOAD PEMASUKAN
   ================================================================ */

async function loadIncome() {
  const body =
    document.getElementById(
      "incomeTableBody"
    );

  if (!body) return;

  body.innerHTML =
    `<tr>
      <td colspan="7" class="table-loading">
        Memuat data pemasukan...
      </td>
    </tr>`;

  try {
    const month =
      document.getElementById(
        "incomeMonth"
      );

    const result =
      await apiGet(
        "getIncome",
        {
          month:
            month
              ? month.value
              : ""
        }
      );

    APP.income =
      Array.isArray(result.data)
        ? result.data
        : [];

    renderIncomeTable(
      APP.income
    );

  } catch (error) {
    body.innerHTML =
      `<tr>
        <td colspan="7" class="table-empty">
          Gagal mengambil data pemasukan.
        </td>
      </tr>`;

    showToast(
      error.message,
      "error"
    );
  }
}


function renderIncomeTable(rows) {
  const body =
    document.getElementById(
      "incomeTableBody"
    );

  if (!body) return;

  if (!rows.length) {
    body.innerHTML =
      `<tr>
        <td colspan="7" class="table-empty">
          Belum ada data pemasukan.
        </td>
      </tr>`;
    return;
  }

  body.innerHTML =
    rows.map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.tanggal)}</td>
        <td class="money income-money">
          ${formatRupiah(item.nominal)}
        </td>
        <td>
          <span class="source-pill">
            ${escapeHtml(item.sumber)}
          </span>
        </td>
        <td class="money">
          ${formatRupiah(item.kasPokja)}
        </td>
        <td class="money">
          ${formatRupiah(item.penggajian)}
        </td>
        <td>${escapeHtml(item.bulan)}</td>
      </tr>
    `
    ).join("");
}


/* ================================================================
   PENGELUARAN
   ================================================================ */

function initializeExpenseForm() {
  const date =
    document.getElementById(
      "expenseDate"
    );

  if (
    date &&
    !date.value
  ) {
    date.value =
      getTodayLocal();
  }

  updateExpensePreview();
  updateExpenseWordCount();
}


function updateExpensePreview() {
  const input =
    document.getElementById(
      "expenseNominal"
    );

  const preview =
    document.getElementById(
      "previewExpense"
    );

  const amount =
    Number(
      input
        ? input.value
        : 0
    );

  if (preview) {
    preview.textContent =
      formatRupiah(amount);
  }
}


function updateExpenseWordCount() {
  const input =
    document.getElementById(
      "expenseDescription"
    );

  const counter =
    document.getElementById(
      "expenseWordCount"
    );

  if (!input || !counter) return;

  const text =
    input.value.trim();

  const count =
    text
      ? text.split(/\s+/).length
      : 0;

  counter.textContent =
    count + " / 500 kata";

  counter.classList.toggle(
    "limit-warning",
    count > 450
  );

  counter.classList.toggle(
    "limit-danger",
    count > 500
  );
}


async function submitExpense(event) {
  event.preventDefault();

  const form =
    document.getElementById(
      "expenseForm"
    );

  const button =
    document.getElementById(
      "expenseSubmitButton"
    );

  const buttonText =
    document.getElementById(
      "expenseSubmitText"
    );

  const date =
    document.getElementById(
      "expenseDate"
    );

  const nominal =
    document.getElementById(
      "expenseNominal"
    );

  const description =
    document.getElementById(
      "expenseDescription"
    );

  const amount =
    Number(
      nominal
        ? nominal.value
        : 0
    );

  const desc =
    description
      ? description.value.trim()
      : "";

  if (!date || !date.value) {
    showToast(
      "Tanggal pengeluaran wajib diisi.",
      "warning"
    );
    return;
  }

  if (!amount || amount <= 0) {
    showToast(
      "Nominal pengeluaran harus lebih dari 0.",
      "warning"
    );
    return;
  }

  if (!desc) {
    showToast(
      "Deskripsi pengeluaran wajib diisi.",
      "warning"
    );
    return;
  }

  const wordCount =
    desc.split(/\s+/).length;

  if (wordCount > 500) {
    showToast(
      "Deskripsi maksimal 500 kata.",
      "error"
    );
    return;
  }

  const confirmed =
    window.confirm(
      "Simpan pengeluaran " +
      formatRupiah(amount) +
      "?"
    );

  if (!confirmed) return;

  try {
    if (button) {
      button.disabled = true;
    }

    if (buttonText) {
      buttonText.textContent =
        "Menyimpan...";
    }

    setLoading(
      true,
      "Menyimpan pengeluaran..."
    );

    const result =
      await apiPost({
        action: "addExpense",
        date: date.value,
        nominal: amount,
        description: desc
      });

    showExpenseResult(
      result.data || {}
    );

    if (form) {
      form.reset();
    }

    initializeExpenseForm();

    await loadDashboard();
    await loadExpenses();

    showToast(
      "Pengeluaran berhasil disimpan."
    );

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Pengeluaran gagal disimpan.",
      "error",
      5000
    );

  } finally {
    setLoading(false);

    if (button) {
      button.disabled = false;
    }

    if (buttonText) {
      buttonText.textContent =
        "Simpan Pengeluaran";
    }
  }
}


function showExpenseResult(data) {
  const box =
    document.getElementById(
      "expenseResult"
    );

  if (!box) return;

  box.innerHTML = `
    <div class="result-icon">✓</div>

    <div class="result-content">
      <strong>Pengeluaran berhasil disimpan</strong>

      <div class="result-grid">
        <div>
          <span>Tanggal</span>
          <b>${escapeHtml(data.tanggal || "-")}</b>
        </div>

        <div>
          <span>Nominal</span>
          <b>${formatRupiah(data.nominal)}</b>
        </div>

        <div>
          <span>Saldo Sebelum</span>
          <b>${formatRupiah(data.saldoSebelumnya)}</b>
        </div>

        <div>
          <span>Saldo Sesudah</span>
          <b>${formatRupiah(data.saldoSesudah)}</b>
        </div>
      </div>
    </div>
  `;

  box.classList.add("show");
}


/* ================================================================
   LOAD PENGELUARAN
   ================================================================ */

async function loadExpenses() {
  const body =
    document.getElementById(
      "expenseTableBody"
    );

  if (!body) return;

  body.innerHTML =
    `<tr>
      <td colspan="5" class="table-loading">
        Memuat data pengeluaran...
      </td>
    </tr>`;

  try {
    const month =
      document.getElementById(
        "expenseMonth"
      );

    const result =
      await apiGet(
        "getExpenses",
        {
          month:
            month
              ? month.value
              : ""
        }
      );

    APP.expenses =
      Array.isArray(result.data)
        ? result.data
        : [];

    renderExpenseTable(
      APP.expenses
    );

  } catch (error) {
    body.innerHTML =
      `<tr>
        <td colspan="5" class="table-empty">
          Gagal mengambil data pengeluaran.
        </td>
      </tr>`;

    showToast(
      error.message,
      "error"
    );
  }
}


function renderExpenseTable(rows) {
  const body =
    document.getElementById(
      "expenseTableBody"
    );

  if (!body) return;

  if (!rows.length) {
    body.innerHTML =
      `<tr>
        <td colspan="5" class="table-empty">
          Belum ada data pengeluaran.
        </td>
      </tr>`;
    return;
  }

  body.innerHTML =
    rows.map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.tanggal)}</td>
        <td class="money expense-money">
          ${formatRupiah(item.nominal)}
        </td>
        <td class="description-cell">
          ${escapeHtml(item.deskripsi)}
        </td>
        <td>${escapeHtml(item.bulan)}</td>
      </tr>
    `
    ).join("");
}


/* ================================================================
   PEGAWAI
   ================================================================ */

async function loadEmployees() {
  const body =
    document.getElementById(
      "employeeTableBody"
    );

  try {
    const result =
      await apiGet(
        "getEmployees"
      );

    APP.employees =
      Array.isArray(result.data)
        ? result.data
        : [];

    renderEmployees(
      APP.employees
    );

    return APP.employees;

  } catch (error) {
    console.error(error);

    if (body) {
      body.innerHTML =
        `<tr>
          <td colspan="5" class="table-empty">
            Gagal mengambil data pegawai.
          </td>
        </tr>`;
    }

    showToast(
      error.message,
      "error"
    );

    return [];
  }
}


function renderEmployees(rows) {
  const body =
    document.getElementById(
      "employeeTableBody"
    );

  if (!body) return;

  setText(
    "employeeTotal",
    formatNumber(rows.length)
  );

  const totalPoints =
    rows.reduce(
      (sum, item) =>
        sum +
        Number(item.poin || 0),
      0
    );

  setText(
    "employeePoints",
    formatNumber(totalPoints)
  );

  if (!rows.length) {
    body.innerHTML =
      `<tr>
        <td colspan="5" class="table-empty">
          Belum ada data pegawai.
        </td>
      </tr>`;
    return;
  }

  body.innerHTML =
    rows.map(
      item => `
      <tr>
        <td>
          <span class="number-badge">
            ${item.no}
          </span>
        </td>

        <td>
          <span class="position-pill">
            ${escapeHtml(item.jabatan)}
          </span>
        </td>

        <td>
          <strong>
            ${escapeHtml(item.nama || "Belum diisi")}
          </strong>
        </td>

        <td>
          <span class="point-badge">
            ${formatNumber(item.poin)}
          </span>
        </td>

        <td>
          <button
            class="table-action"
            type="button"
            onclick="openEmployeeEditor(${item.row}, '${escapeHtml(item.nama || "")}')"
          >
            Edit Nama
          </button>
        </td>
      </tr>
    `
    ).join("");
}


function openEmployeeEditor(row, name) {
  const modal =
    document.getElementById(
      "employeeModal"
    );

  const rowInput =
    document.getElementById(
      "employeeRow"
    );

  const nameInput =
    document.getElementById(
      "employeeName"
    );

  if (!modal || !rowInput || !nameInput) {
    return;
  }

  rowInput.value = row;
  nameInput.value =
    name || "";

  modal.classList.add("show");

  setTimeout(() => {
    nameInput.focus();
  }, 100);
}


function closeEmployeeEditor() {
  const modal =
    document.getElementById(
      "employeeModal"
    );

  if (modal) {
    modal.classList.remove("show");
  }
}


async function saveEmployee(event) {
  event.preventDefault();

  const row =
    document.getElementById(
      "employeeRow"
    );

  const name =
    document.getElementById(
      "employeeName"
    );

  if (!row || !name) return;

  const value =
    name.value.trim();

  if (!value) {
    showToast(
      "Nama pegawai wajib diisi.",
      "warning"
    );
    return;
  }

  try {
    setLoading(
      true,
      "Menyimpan nama pegawai..."
    );

    await apiPost({
      action: "updateEmployee",
      row: Number(row.value),
      name: value
    });

    closeEmployeeEditor();

    await loadEmployees();
    await loadPayroll();
    await loadDashboard();

    showToast(
      "Nama pegawai berhasil diperbarui."
    );

  } catch (error) {
    showToast(
      error.message ||
      "Nama pegawai gagal diperbarui.",
      "error",
      5000
    );

  } finally {
    setLoading(false);
  }
}


/* ================================================================
   PENGGAJIAN
   ================================================================ */

async function loadPayroll() {
  const body =
    document.getElementById(
      "payrollTableBody"
    );

  try {
    const result =
      await apiGet(
        "getPayroll"
      );

    APP.payroll =
      Array.isArray(result.data)
        ? result.data
        : [];

    renderPayroll(
      APP.payroll
    );

  } catch (error) {
    console.error(error);

    if (body) {
      body.innerHTML =
        `<tr>
          <td colspan="7" class="table-empty">
            Gagal mengambil data penggajian.
          </td>
        </tr>`;
    }

    showToast(
      error.message,
      "error"
    );
  }
}


function renderPayroll(months) {
  const body =
    document.getElementById(
      "payrollTableBody"
    );

  if (!body) return;

  const selectedMonth =
    document.getElementById(
      "payrollMonth"
    );

  let month =
    selectedMonth &&
    selectedMonth.value
      ? selectedMonth.value
      : getCurrentMonth();

  let data =
    months.find(
      item =>
        String(item.bulan) ===
        String(month)
    );

  if (!data && months.length) {
    data = months[0];
    month = data.bulan;
  }

  if (!data) {
    setText(
      "payrollMonthLabel",
      monthLabel(month)
    );

    setText(
      "payrollIncome",
      formatRupiah(0)
    );

    setText(
      "payroll70",
      formatRupiah(0)
    );

    setText(
      "payrollTotalPoints",
      "0"
    );

    setText(
      "payrollPointValue",
      formatRupiah(0)
    );

    body.innerHTML =
      `<tr>
        <td colspan="7" class="table-empty">
          Belum ada data penggajian untuk periode ini.
        </td>
      </tr>`;

    return;
  }

  const employees =
    data.pegawai || [];

  const totalSalary =
    employees.reduce(
      (sum, item) =>
        sum +
        Number(item.gaji || 0),
      0
    );

  setText(
    "payrollMonthLabel",
    monthLabel(data.bulan)
  );

  setText(
    "payrollIncome",
    formatRupiah(
      data.totalPemasukan
    )
  );

  setText(
    "payroll70",
    formatRupiah(
      data.dana70
    )
  );

  setText(
    "payrollTotalPoints",
    formatNumber(
      data.totalPoin
    )
  );

  setText(
    "payrollPointValue",
    formatRupiah(
      data.nilai1Poin
    )
  );

  setText(
    "payrollTotalSalary",
    formatRupiah(
      totalSalary
    )
  );

  setText(
    "payrollEmployeeCount",
    formatNumber(
      employees.length
    )
  );

  if (!employees.length) {
    body.innerHTML =
      `<tr>
        <td colspan="7" class="table-empty">
          Belum ada data pegawai.
        </td>
      </tr>`;
    return;
  }

  body.innerHTML =
    employees.map(
      (employee, index) => `
      <tr>
        <td>${index + 1}</td>

        <td>
          <strong>
            ${escapeHtml(employee.nama || "Belum diisi")}
          </strong>
        </td>

        <td>
          ${escapeHtml(employee.jabatan)}
        </td>

        <td>
          <span class="point-badge">
            ${formatNumber(employee.poin)}
          </span>
        </td>

        <td class="money">
          ${formatRupiah(employee.gaji)}
        </td>

        <td>
          <span class="salary-status">
            ${escapeHtml(employee.status)}
          </span>
        </td>
      </tr>
    `
    ).join("");
}


/* ================================================================
   RIWAYAT
   ================================================================ */

async function loadHistory() {
  const body =
    document.getElementById(
      "historyTableBody"
    );

  if (!body) return;

  body.innerHTML =
    `<tr>
      <td colspan="6" class="table-loading">
        Memuat riwayat transaksi...
      </td>
    </tr>`;

  try {
    const result =
      await apiGet(
        "getHistory",
        {}
      );

    APP.history =
      Array.isArray(result.data)
        ? result.data
        : [];

    renderHistory(
      APP.history
    );

  } catch (error) {
    console.error(error);

    body.innerHTML =
      `<tr>
        <td colspan="6" class="table-empty">
          Gagal mengambil riwayat.
        </td>
      </tr>`;

    showToast(
      error.message,
      "error"
    );
  }
}


function renderHistory(rows) {
  const body =
    document.getElementById(
      "historyTableBody"
    );

  if (!body) return;

  const month =
    document.getElementById(
      "historyMonth"
    );

  const type =
    document.getElementById(
      "historyType"
    );

  const selectedMonth =
    month
      ? month.value
      : "";

  const selectedType =
    type
      ? type.value
      : "SEMUA";

  let filtered =
    rows.filter(item => {
      const itemMonth =
        String(
          item.tanggal || ""
        );

      let monthOkay = true;
      let typeOkay = true;

      if (selectedMonth) {
        monthOkay =
          itemMonth.substring(3, 5) ===
          selectedMonth;
      }

      if (
        selectedType &&
        selectedType !== "SEMUA"
      ) {
        typeOkay =
          String(item.jenis)
            .toUpperCase() ===
          selectedType;
      }

      return (
        monthOkay &&
        typeOkay
      );
    });

  let income = 0;
  let expense = 0;

  filtered.forEach(item => {
    if (
      String(item.jenis)
        .toUpperCase() ===
      "PEMASUKAN"
    ) {
      income +=
        Number(item.nominal || 0);
    } else {
      expense +=
        Number(item.nominal || 0);
    }
  });

  setText(
    "historyCount",
    formatNumber(filtered.length)
  );

  setText(
    "historyIncome",
    formatRupiah(income)
  );

  setText(
    "historyExpense",
    formatRupiah(expense)
  );

  if (!filtered.length) {
    body.innerHTML =
      `<tr>
        <td colspan="6" class="table-empty">
          Tidak ada transaksi pada filter yang dipilih.
        </td>
      </tr>`;
    return;
  }

  body.innerHTML =
    filtered.map(
      (item, index) => {
        const isIncome =
          String(item.jenis)
            .toUpperCase() ===
          "PEMASUKAN";

        return `
          <tr>
            <td>${index + 1}</td>

            <td>
              <span class="history-type ${
                isIncome
                  ? "history-income"
                  : "history-expense"
              }">
                ${
                  isIncome
                    ? "Pemasukan"
                    : "Pengeluaran"
                }
              </span>
            </td>

            <td>
              ${escapeHtml(item.tanggal)}
            </td>

            <td>
              ${escapeHtml(item.keterangan)}
            </td>

            <td>
              ${escapeHtml(item.alokasi)}
            </td>

            <td class="money ${
              isIncome
                ? "income-money"
                : "expense-money"
            }">
              ${
                isIncome
                  ? "+"
                  : "-"
              }
              ${formatRupiah(item.nominal)}
            </td>
          </tr>
        `;
      }
    ).join("");
}


/* ================================================================
   KALENDER FILTER
   ================================================================ */

function initializeFilters() {
  const current =
    getCurrentMonth();

  [
    "incomeMonth",
    "expenseMonth",
    "payrollMonth"
  ].forEach(id => {
    const element =
      document.getElementById(id);

    if (
      element &&
      !element.value
    ) {
      element.value =
        current;
    }
  });
}


/* ================================================================
   JAM
   ================================================================ */

function updateClock() {
  const now =
    new Date();

  const dateText =
    new Intl.DateTimeFormat(
      "id-ID",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    ).format(now);

  const timeText =
    new Intl.DateTimeFormat(
      "id-ID",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    ).format(now);

  setText(
    "currentDate",
    dateText
  );

  setText(
    "clock",
    timeText
  );
}


/* ================================================================
   MOBILE MENU
   ================================================================ */

function toggleMobileMenu() {
  const sidebar =
    document.getElementById(
      "sidebar"
    );

  const overlay =
    document.getElementById(
      "mobileOverlay"
    );

  if (!sidebar) return;

  sidebar.classList.toggle("open");

  if (overlay) {
    overlay.classList.toggle(
      "show",
      sidebar.classList.contains("open")
    );
  }
}


function closeMobileMenu() {
  const sidebar =
    document.getElementById(
      "sidebar"
    );

  const overlay =
    document.getElementById(
      "mobileOverlay"
    );

  if (sidebar) {
    sidebar.classList.remove("open");
  }

  if (overlay) {
    overlay.classList.remove("show");
  }
}


/* ================================================================
   AUTO REFRESH
   ================================================================ */

function startAutoRefresh() {
  clearInterval(
    APP.refreshTimer
  );

  APP.refreshTimer =
    setInterval(
      () => {
        if (
          APP.currentPage ===
          "dashboard"
        ) {
          loadDashboard();
        }
      },
      60000
    );
}


/* ================================================================
   EVENT BINDING
   ================================================================ */

function bindEvents() {
  document
    .querySelectorAll(".nav-button")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          showPage(
            button.dataset.page
          );
        }
      );
    });

  const incomeForm =
    document.getElementById(
      "incomeForm"
    );

  if (incomeForm) {
    incomeForm.addEventListener(
      "submit",
      submitIncome
    );
  }

  const expenseForm =
    document.getElementById(
      "expenseForm"
    );

  if (expenseForm) {
    expenseForm.addEventListener(
      "submit",
      submitExpense
    );
  }

  const incomeNominal =
    document.getElementById(
      "incomeNominal"
    );

  if (incomeNominal) {
    incomeNominal.addEventListener(
      "input",
      updateIncomePreview
    );
  }

  const expenseNominal =
    document.getElementById(
      "expenseNominal"
    );

  if (expenseNominal) {
    expenseNominal.addEventListener(
      "input",
      updateExpensePreview
    );
  }

  const expenseDescription =
    document.getElementById(
      "expenseDescription"
    );

  if (expenseDescription) {
    expenseDescription.addEventListener(
      "input",
      updateExpenseWordCount
    );
  }

  const employeeForm =
    document.getElementById(
      "employeeForm"
    );

  if (employeeForm) {
    employeeForm.addEventListener(
      "submit",
      saveEmployee
    );
  }

  const incomeMonth =
    document.getElementById(
      "incomeMonth"
    );

  if (incomeMonth) {
    incomeMonth.addEventListener(
      "change",
      loadIncome
    );
  }

  const expenseMonth =
    document.getElementById(
      "expenseMonth"
    );

  if (expenseMonth) {
    expenseMonth.addEventListener(
      "change",
      loadExpenses
    );
  }

  const payrollMonth =
    document.getElementById(
      "payrollMonth"
    );

  if (payrollMonth) {
    payrollMonth.addEventListener(
      "change",
      () => renderPayroll(APP.payroll)
    );
  }

  const historyType =
    document.getElementById(
      "historyType"
    );

  const historyMonth =
    document.getElementById(
      "historyMonth"
    );

  if (historyType) {
    historyType.addEventListener(
      "change",
      () => renderHistory(APP.history)
    );
  }

  if (historyMonth) {
    historyMonth.addEventListener(
      "change",
      () => renderHistory(APP.history)
    );
  }

  const mobileButton =
    document.getElementById(
      "mobileMenuButton"
    );

  if (mobileButton) {
    mobileButton.addEventListener(
      "click",
      toggleMobileMenu
    );
  }

  const overlay =
    document.getElementById(
      "mobileOverlay"
    );

  if (overlay) {
    overlay.addEventListener(
      "click",
      closeMobileMenu
    );
  }

  const closeModal =
    document.getElementById(
      "employeeModalClose"
    );

  if (closeModal) {
    closeModal.addEventListener(
      "click",
      closeEmployeeEditor
    );
  }
}


/* ================================================================
   INITIALIZATION
   ================================================================ */

async function initializeApp() {
  initializeFilters();
  initializeIncomeForm();
  initializeExpenseForm();
  bindEvents();
  updateClock();

  setInterval(
    updateClock,
    1000
  );

  try {
    await loadDashboard();

    await Promise.all([
      loadEmployees(),
      loadCash()
    ]);

    setConnectionStatus(
      true,
      "Terhubung"
    );

  } catch (error) {
    console.error(error);

    setConnectionStatus(
      false,
      "Tidak terhubung"
    );
  }

  startAutoRefresh();
}


/* ================================================================
   GLOBAL
   ================================================================ */

window.showPage =
  showPage;

window.loadDashboard =
  loadDashboard;

window.loadIncome =
  loadIncome;

window.loadExpenses =
  loadExpenses;

window.loadPayroll =
  loadPayroll;

window.loadEmployees =
  loadEmployees;

window.loadHistory =
  loadHistory;

window.updateIncomePreview =
  updateIncomePreview;

window.updateExpensePreview =
  updateExpensePreview;

window.openEmployeeEditor =
  openEmployeeEditor;

window.closeEmployeeEditor =
  closeEmployeeEditor;

window.toggleMobileMenu =
  toggleMobileMenu;

window.closeMobileMenu =
  closeMobileMenu;

window.showToast =
  showToast;


document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
