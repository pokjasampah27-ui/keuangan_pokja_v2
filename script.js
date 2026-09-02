/* =========================================================
   KEUANGAN POKJA ADIWIYATA
   SCRIPT.JS - FIXED STABLE VERSION
   ========================================================= */


/* =========================================================
   KONFIGURASI API
   ========================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwtL-WJQ83NPSXC87Xj2Fd_2hZr8Hx03fA_txTKp_92HVWbJh3U_inakgZHh3g87uA75A/exec";


/* =========================================================
   STATE APLIKASI
   ========================================================= */

const APP_STATE = {
  dashboard: null,
  settings: null,
  employees: [],
  connected: false
};


/* =========================================================
   FORMAT RUPIAH
   ========================================================= */

function formatRupiah(value) {
  var number = Number(value || 0);

  if (!isFinite(number)) {
    number = 0;
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}


/* =========================================================
   FORMAT ANGKA
   ========================================================= */

function formatNumber(value) {
  var number = Number(value || 0);

  if (!isFinite(number)) {
    number = 0;
  }

  return new Intl.NumberFormat("id-ID").format(number);
}


/* =========================================================
   AMBIL ANGKA VALID PERTAMA
   ========================================================= */

function firstNumber() {
  var values = Array.prototype.slice.call(arguments);

  for (var i = 0; i < values.length; i++) {
    if (
      values[i] !== undefined &&
      values[i] !== null &&
      values[i] !== "" &&
      isFinite(Number(values[i]))
    ) {
      return Number(values[i]);
    }
  }

  return 0;
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(id, value) {
  var element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   API GET
   ========================================================= */

async function apiGet(action, extraParams) {
  var url = API_URL +
    "?action=" +
    encodeURIComponent(action) +
    "&_=" +
    Date.now();

  if (extraParams) {
    Object.keys(extraParams).forEach(function(key) {
      var value = extraParams[key];

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
  }

  var response;

  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow"
    });
  } catch (networkError) {
    throw new Error(
      "Tidak dapat terhubung ke server Google Apps Script."
    );
  }

  if (!response.ok) {
    throw new Error(
      "Server API tidak dapat diakses. HTTP " +
      response.status
    );
  }

  var result;

  try {
    result = await response.json();
  } catch (jsonError) {
    throw new Error(
      "Server mengembalikan data yang tidak valid."
    );
  }

  if (!result || result.success !== true) {
    throw new Error(
      (result && result.message) ||
      "API mengembalikan status gagal."
    );
  }

  return result;
}


/* =========================================================
   API POST
   ========================================================= */

async function apiPost(payload) {
  var response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
  } catch (networkError) {
    throw new Error(
      "Tidak dapat terhubung ke server Google Apps Script."
    );
  }

  if (!response.ok) {
    throw new Error(
      "Server API tidak dapat diakses. HTTP " +
      response.status
    );
  }

  var result;

  try {
    result = await response.json();
  } catch (jsonError) {
    throw new Error(
      "Server mengembalikan data yang tidak valid."
    );
  }

  if (!result || result.success !== true) {
    throw new Error(
      (result && result.message) ||
      "Transaksi gagal diproses."
    );
  }

  return result;
}


/* =========================================================
   STATUS KONEKSI
   ========================================================= */

function setConnectionStatus(connected, message) {
  var element =
    document.getElementById("connectionStatus");

  APP_STATE.connected = connected;

  if (!element) {
    return;
  }

  element.textContent =
    message ||
    (connected ? "Terhubung" : "Tidak terhubung");

  element.classList.remove(
    "connected",
    "error"
  );

  if (connected) {
    element.classList.add("connected");
  } else {
    element.classList.add("error");
  }
}


/* =========================================================
   TOAST
   ========================================================= */

var toastTimer = null;

function showToast(message, duration) {
  var toast =
    document.getElementById("toast");

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(function() {
    toast.classList.remove("show");
  }, duration || 3000);
}


/* =========================================================
   NAVIGASI HALAMAN
   ========================================================= */

function showPage(pageName) {
  console.log("Membuka halaman:", pageName);

  var pages =
    document.querySelectorAll(".page");

  pages.forEach(function(page) {
    page.classList.remove("active");
  });

  var target =
    document.getElementById(
      "page-" + pageName
    );

  if (!target) {
    console.error(
      "Halaman tidak ditemukan: page-" +
      pageName
    );

    showToast(
      "Halaman " +
      pageName +
      " tidak ditemukan."
    );

    return;
  }

  target.classList.add("active");

  var buttons =
    document.querySelectorAll(".nav-button");

  buttons.forEach(function(button) {
    button.classList.remove("active");

    if (
      button.dataset &&
      button.dataset.page === pageName
    ) {
      button.classList.add("active");
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  /* DASHBOARD */

  if (pageName === "dashboard") {
    loadDashboard();
    loadDatabaseStatus();
  }

  /* RIWAYAT */

  if (pageName === "history") {
    loadTransactionHistory();
  }

  /* PENGGAJIAN */

  if (pageName === "salary") {
    loadSalaryList();
  }

  /* PEMASUKAN */

  if (pageName === "income") {
    initializeIncomeForm();
  }

  /* PENGELUARAN */

  if (pageName === "expense") {
    initializeExpenseForm();
  }
}

/* =========================================================
   SUBMIT PENGELUARAN
   ========================================================= */

async function submitExpense(event) {
  if (event) {
    event.preventDefault();
  }

  var form = document.getElementById("expenseForm");
  var button = document.getElementById("expenseSubmitButton");
  var buttonText = document.getElementById("expenseSubmitText");

  var tanggalElement = document.getElementById("expenseDate");
  var kategoriElement = document.getElementById("expenseCategory");
  var nominalElement = document.getElementById("expenseNominal");
  var deskripsiElement = document.getElementById("expenseDescription");

  var tanggal = tanggalElement ? tanggalElement.value : "";
  var kategori = kategoriElement ? kategoriElement.value : "";
  var nominal = nominalElement ? nominalElement.value : "";
  var deskripsi = deskripsiElement
    ? deskripsiElement.value.trim()
    : "";

  if (!tanggal) {
    showToast("Tanggal pengeluaran wajib diisi.");
    return;
  }

  if (!kategori) {
    showToast("Kategori pengeluaran wajib dipilih.");
    return;
  }

  if (!nominal || Number(nominal) <= 0) {
    showToast(
      "Nominal pengeluaran harus lebih besar dari 0."
    );
    return;
  }

  var nominalNumber = Number(nominal);

  var confirmed = window.confirm(
    "Simpan pengeluaran sebesar " +
    formatRupiah(nominalNumber) +
    ' dengan kategori "' +
    kategori +
    '"?'
  );

  if (!confirmed) {
    return;
  }

  try {
    if (button) {
      button.disabled = true;
    }

    if (buttonText) {
      buttonText.textContent = "Menyimpan...";
    }

    var result = await apiPost({
      action: "addExpense",
      tanggal: tanggal,
      nominal: nominalNumber,
      kategori: kategori,
      deskripsi: deskripsi,
      userAdmin: "Aplikasi"
    });

    showExpenseResult(result.data || {});

    if (form) {
      form.reset();
    }

    if (tanggalElement) {
      tanggalElement.value = getTodayLocal();
    }

    await loadDashboard();
    await loadDatabaseStatus();

    showToast("Pengeluaran berhasil disimpan.");

  } catch (error) {
    console.error(
      "ADD EXPENSE ERROR:",
      error
    );

    showToast(
      error.message ||
      "Pengeluaran gagal disimpan.",
      5000
    );

  } finally {
    if (button) {
      button.disabled = false;
    }

    if (buttonText) {
      buttonText.textContent =
        "Simpan Pengeluaran";
    }
  }
}


/* =========================================================
   HASIL PENGELUARAN
   ========================================================= */

function showExpenseResult(data) {
  var container =
    document.getElementById("expenseResult");

  if (!container || !data) {
    return;
  }

  var html = "";

  html +=
    '<div class="transaction-success-title">' +
    "Pengeluaran Berhasil Disimpan" +
    "</div>";

  html +=
    '<div class="transaction-id">' +
    escapeHtml(
      data.idTransaksi || "-"
    ) +
    "</div>";

  html +=
    '<div class="transaction-detail-grid">';

  html +=
    '<div class="transaction-detail">' +
    "<span>Tanggal</span>" +
    "<strong>" +
    escapeHtml(
      data.tanggal || "-"
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Nominal</span>" +
    "<strong>" +
    formatRupiah(
      data.nominal || 0
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Kategori</span>" +
    "<strong>" +
    escapeHtml(
      data.kategori || "-"
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Deskripsi</span>" +
    "<strong>" +
    escapeHtml(
      data.deskripsi || "-"
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Status</span>" +
    "<strong>TERSIMPAN</strong>" +
    "</div>";

  html += "</div>";

  container.innerHTML = html;

  container.classList.add("show");

  container.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


/* =========================================================
   PREVIEW PENGELUARAN
   ========================================================= */

function updateExpensePreview() {
  var input =
    document.getElementById(
      "expenseNominal"
    );

  var preview =
    document.getElementById(
      "previewExpense"
    );

  if (!input || !preview) {
    return;
  }

  var nominal =
    Number(input.value || 0);

  if (!isFinite(nominal)) {
    nominal = 0;
  }

  preview.textContent =
    formatRupiah(nominal);
}


/* =========================================================
   INISIALISASI FORM PENGELUARAN
   ========================================================= */

function initializeExpenseForm() {

  var dateInput =
    document.getElementById(
      "expenseDate"
    );

  if (
    dateInput &&
    !dateInput.value
  ) {
    dateInput.value =
      getTodayLocal();
  }

  var nominalInput =
    document.getElementById(
      "expenseNominal"
    );

  if (
    nominalInput &&
    !nominalInput.dataset.previewBound
  ) {
    nominalInput.addEventListener(
      "input",
      updateExpensePreview
    );

    nominalInput.dataset.previewBound =
      "true";
  }

  updateExpensePreview();

  var form =
    document.getElementById(
      "expenseForm"
    );

  if (
    form &&
    !form.dataset.submitBound
  ) {
    form.addEventListener(
      "submit",
      submitExpense
    );

    form.dataset.submitBound =
      "true";
  }
}

/* =========================================================
   PING API
   ========================================================= */

async function testConnection() {
  var apiStatus =
    document.getElementById("apiStatus");

  try {
    await apiGet("ping");

    setConnectionStatus(
      true,
      "Terhubung"
    );

    if (apiStatus) {
      apiStatus.textContent = "ONLINE";
      apiStatus.className = "status-success";
    }

    return true;

  } catch (error) {
    console.error(
      "API PING ERROR:",
      error
    );

    setConnectionStatus(
      false,
      "Offline"
    );

    if (apiStatus) {
      apiStatus.textContent = "ERROR";
      apiStatus.className = "status-error";
    }

    return false;
  }
}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

async function loadSettings() {
  try {
    var result =
      await apiGet("settings");

    APP_STATE.settings =
      result.data || {};

    return APP_STATE.settings;

  } catch (error) {
    console.error(
      "SETTINGS ERROR:",
      error
    );

    APP_STATE.settings = {};

    return {};
  }
}


/* =========================================================
   LOAD EMPLOYEES
   ========================================================= */

async function loadEmployees() {
  try {
    var result =
      await apiGet("employees");

    APP_STATE.employees =
      Array.isArray(result.data)
        ? result.data
        : [];

    return APP_STATE.employees;

  } catch (error) {
    console.error(
      "EMPLOYEES ERROR:",
      error
    );

    APP_STATE.employees = [];

    return [];
  }
}


/* =========================================================
   LOAD DATABASE STATUS
   ========================================================= */

async function loadDatabaseStatus() {
  var element =
    document.getElementById(
      "databaseStatus"
    );

  try {
    var result =
      await apiGet("databaseStatus");

    var data =
      result.data || {};

    if (!element) {
      return data;
    }

    var aman = true;

    if (
      data.success === false ||
      data.status === "ERROR" ||
      data.status === "ERRORS"
    ) {
      aman = false;
    }

    element.textContent =
      aman ? "AMAN" : "PERIKSA";

    element.className =
      aman
        ? "status-success"
        : "status-error";

    return data;

  } catch (error) {
    console.error(
      "DATABASE STATUS ERROR:",
      error
    );

    if (element) {
      element.textContent = "ERROR";
      element.className = "status-error";
    }

    return null;
  }
}


/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {
  try {
    var result =
      await apiGet("dashboard");

    APP_STATE.dashboard =
      result.data || {};

    renderDashboard(
      APP_STATE.dashboard
    );

    setConnectionStatus(
      true,
      "Terhubung"
    );

    return APP_STATE.dashboard;

  } catch (error) {
    console.error(
      "DASHBOARD ERROR:",
      error
    );

    setConnectionStatus(
      false,
      "Gagal terhubung"
    );

    showToast(
      "Dashboard gagal mengambil data dari server.",
      5000
    );

    return null;
  }
}


/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

function renderDashboard(data) {
  if (!data) {
    return;
  }

  var totalIncome =
    firstNumber(
      data.totalPemasukan,
      data.totalIncome,
      data.pemasukan,
      data.total
    );

  var totalExpense =
    firstNumber(
      data.totalPengeluaran,
      data.totalExpense,
      data.pengeluaran
    );

  var kasPokja =
    firstNumber(
      data.kasPokja,
      data.saldoKasPokja,
      data.totalKasPokja
    );

  var kasPenggajian =
    firstNumber(
      data.kasPenggajian,
      data.totalKasPenggajian,
      data.saldoKasPenggajian
    );

  var totalPoints =
    firstNumber(
      data.totalPoin,
      data.totalPoints
    );

  var pointValue =
    firstNumber(
      data.nilaiPerPoin,
      data.pointValue
    );

  var employeeCount =
    firstNumber(
      data.jumlahPegawai,
      data.employeeCount
    );

  var totalSalary =
    firstNumber(
      data.totalGaji,
      data.totalSalary
    );

  setText(
    "totalIncome",
    formatRupiah(totalIncome)
  );

  setText(
    "totalExpense",
    formatRupiah(totalExpense)
  );

  setText(
    "kasPokja",
    formatRupiah(kasPokja)
  );

  setText(
    "kasPenggajian",
    formatRupiah(kasPenggajian)
  );

  setText(
    "totalPoints",
    formatNumber(totalPoints)
  );

  setText(
    "pointValue",
    formatRupiah(pointValue)
  );

  setText(
    "employeeCount",
    formatNumber(employeeCount)
  );

  setText(
    "totalSalary",
    formatRupiah(totalSalary)
  );

  var periode =
    data.periode ||
    data.period ||
    data.bulanTahun ||
    "-";

  setText(
    "currentPeriod",
    periode
  );
}


/* =========================================================
   TANGGAL HARI INI
   ========================================================= */

function getTodayLocal() {
  var now = new Date();

  var year =
    now.getFullYear();

  var month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  var day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return (
    year +
    "-" +
    month +
    "-" +
    day
  );
}


/* =========================================================
   FORM PEMASUKAN
   ========================================================= */

function setDefaultIncomeDate() {
  var input =
    document.getElementById(
      "incomeDate"
    );

  if (!input) {
    return;
  }

  if (!input.value) {
    input.value =
      getTodayLocal();
  }
}


/* =========================================================
   PREVIEW PEMASUKAN
   ========================================================= */

function updateIncomePreview() {
  var input =
    document.getElementById(
      "incomeNominal"
    );

  var kasPokjaElement =
    document.getElementById(
      "previewKasPokja"
    );

  var kasPenggajianElement =
    document.getElementById(
      "previewKasPenggajian"
    );

  if (!input) {
    return;
  }

  var nominal =
    Number(input.value || 0);

  if (!isFinite(nominal)) {
    nominal = 0;
  }

  var kasPokja =
    nominal * 30 / 100;

  var kasPenggajian =
    nominal * 70 / 100;

  if (kasPokjaElement) {
    kasPokjaElement.textContent =
      formatRupiah(kasPokja);
  }

  if (kasPenggajianElement) {
    kasPenggajianElement.textContent =
      formatRupiah(kasPenggajian);
  }
}


/* =========================================================
   SUBMIT PEMASUKAN
   ========================================================= */

async function submitIncome(event) {
  if (event) {
    event.preventDefault();
  }

  var form =
    document.getElementById(
      "incomeForm"
    );

  var button =
    document.getElementById(
      "incomeSubmitButton"
    );

  var buttonText =
    document.getElementById(
      "incomeSubmitText"
    );

  var tanggalElement =
    document.getElementById(
      "incomeDate"
    );

  var kategoriElement =
    document.getElementById(
      "incomeCategory"
    );

  var nominalElement =
    document.getElementById(
      "incomeNominal"
    );

  var deskripsiElement =
    document.getElementById(
      "incomeDescription"
    );

  var tanggal =
    tanggalElement
      ? tanggalElement.value
      : "";

  var kategori =
    kategoriElement
      ? kategoriElement.value
      : "";

  var nominal =
    nominalElement
      ? nominalElement.value
      : "";

  var deskripsi =
    deskripsiElement
      ? deskripsiElement.value.trim()
      : "";

  if (!tanggal) {
    showToast(
      "Tanggal pemasukan wajib diisi."
    );
    return;
  }

  if (!kategori) {
    showToast(
      "Kategori pemasukan wajib dipilih."
    );
    return;
  }

  if (
    !nominal ||
    Number(nominal) <= 0
  ) {
    showToast(
      "Nominal pemasukan harus lebih besar dari 0."
    );
    return;
  }

  var nominalNumber =
    Number(nominal);

  var konfirmasi =
    window.confirm(
      "Simpan pemasukan sebesar " +
      formatRupiah(nominalNumber) +
      " dengan kategori \"" +
      kategori +
      "\"?"
    );

  if (!konfirmasi) {
    return;
  }

  try {
    if (button) {
      button.disabled = true;
    }

    if (buttonText) {
      buttonText.textContent =
        "Menyimpan...";
    }

    var result =
      await apiPost({
        action: "addIncome",
        tanggal: tanggal,
        nominal: nominalNumber,
        kategori: kategori,
        deskripsi: deskripsi,
        userAdmin: "Aplikasi"
      });

    showIncomeResult(
      result.data || {}
    );

    if (form) {
      form.reset();
    }

    setDefaultIncomeDate();
    updateIncomePreview();

    await loadDashboard();
    await loadDatabaseStatus();

    showToast(
      "Pemasukan berhasil disimpan."
    );

  } catch (error) {
    console.error(
      "ADD INCOME ERROR:",
      error
    );

    showToast(
      error.message ||
      "Pemasukan gagal disimpan.",
      5000
    );

  } finally {
    if (button) {
      button.disabled = false;
    }

    if (buttonText) {
      buttonText.textContent =
        "Simpan Pemasukan";
    }
  }
}


/* =========================================================
   HASIL PEMASUKAN
   ========================================================= */

function showIncomeResult(data) {
  var container =
    document.getElementById(
      "incomeResult"
    );

  if (!container || !data) {
    return;
  }

  var html = "";

  html +=
    '<div class="transaction-success-title">' +
    "Pemasukan Berhasil Disimpan" +
    "</div>";

  html +=
    '<div class="transaction-id">' +
    escapeHtml(
      data.idTransaksi || "-"
    ) +
    "</div>";

  html +=
    '<div class="transaction-detail-grid">';

  html +=
    '<div class="transaction-detail">' +
    "<span>Tanggal</span>" +
    "<strong>" +
    escapeHtml(
      data.tanggal || "-"
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Nominal</span>" +
    "<strong>" +
    formatRupiah(
      data.nominal
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Kategori</span>" +
    "<strong>" +
    escapeHtml(
      data.kategori || "-"
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Kas Pokja 30%</span>" +
    "<strong>" +
    formatRupiah(
      data.alokasiKasPokja
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Kas Penggajian 70%</span>" +
    "<strong>" +
    formatRupiah(
      data.alokasiKasPenggajian
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Status</span>" +
    "<strong>TERSIMPAN</strong>" +
    "</div>";

  html += "</div>";

  container.innerHTML = html;

  container.classList.add("show");

  container.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


/* =========================================================
   INISIALISASI FORM PEMASUKAN
   ========================================================= */

function initializeIncomeForm() {
  setDefaultIncomeDate();
  updateIncomePreview();

  var nominalInput =
    document.getElementById(
      "incomeNominal"
    );

  if (
    nominalInput &&
    !nominalInput.dataset.previewBound
  ) {
    nominalInput.addEventListener(
      "input",
      updateIncomePreview
    );

    nominalInput.dataset.previewBound =
      "true";
  }

  var form =
    document.getElementById(
      "incomeForm"
    );

  if (
    form &&
    !form.dataset.submitBound
  ) {
    form.addEventListener(
      "submit",
      submitIncome
    );

    form.dataset.submitBound =
      "true";
  }
}


/* =========================================================
   PENGELUARAN
   ========================================================= */

function initializeExpenseForm() {
  var dateInput =
    document.getElementById(
      "expenseDate"
    );

  if (
    dateInput &&
    !dateInput.value
  ) {
    dateInput.value =
      getTodayLocal();
  }
}


/* =========================================================
   RIWAYAT TRANSAKSI
   ========================================================= */

async function loadTransactionHistory() {
  var typeElement =
    document.getElementById(
      "historyType"
    );

  var monthElement =
    document.getElementById(
      "historyMonth"
    );

  var yearElement =
    document.getElementById(
      "historyYear"
    );

  var statusElement =
    document.getElementById(
      "historyStatus"
    );

  var tableBody =
    document.getElementById(
      "historyTableBody"
    );

  var type =
    typeElement
      ? typeElement.value
      : "SEMUA";

  var month =
    monthElement
      ? monthElement.value
      : "";

  var year =
    yearElement
      ? yearElement.value
      : "";

  if (statusElement) {
    statusElement.textContent =
      "Memuat transaksi...";
  }

  try {
    var params = {
      tipe: type,
      bulan: month,
      tahun: year
    };

    var result =
      await apiGet(
        "transactions",
        params
      );

    renderTransactionHistory(
      result.data || {}
    );

  } catch (error) {
    console.error(
      "LOAD TRANSACTION HISTORY ERROR:",
      error
    );

    if (statusElement) {
      statusElement.textContent =
        "Gagal memuat transaksi.";
    }

    if (tableBody) {
      tableBody.innerHTML =
        "<tr>" +
        '<td colspan="7" class="empty-state">' +
        "Gagal mengambil data transaksi." +
        "</td>" +
        "</tr>";
    }
  }
}


/* =========================================================
   RENDER RIWAYAT
   ========================================================= */

function renderTransactionHistory(data) {
  var transactions =
    Array.isArray(data.transaksi)
      ? data.transaksi
      : [];

  var countElement =
    document.getElementById(
      "historyTransactionCount"
    );

  var incomeElement =
    document.getElementById(
      "historyTotalIncome"
    );

  var expenseElement =
    document.getElementById(
      "historyTotalExpense"
    );

  var statusElement =
    document.getElementById(
      "historyStatus"
    );

  var tableBody =
    document.getElementById(
      "historyTableBody"
    );

  if (countElement) {
    countElement.textContent =
      Number(data.jumlah || 0);
  }

  if (incomeElement) {
    incomeElement.textContent =
      formatRupiah(
        data.totalPemasukan || 0
      );
  }

  if (expenseElement) {
    expenseElement.textContent =
      formatRupiah(
        data.totalPengeluaran || 0
      );
  }

  if (!tableBody) {
    return;
  }

  if (transactions.length === 0) {
    tableBody.innerHTML =
      "<tr>" +
      '<td colspan="7" class="empty-state">' +
      "Belum ada transaksi." +
      "</td>" +
      "</tr>";

    if (statusElement) {
      statusElement.textContent =
        "Tidak ada transaksi pada filter yang dipilih.";
    }

    return;
  }

  var html = "";

  transactions.forEach(function(item, index) {
    var isIncome =
      String(item.jenis || "").toUpperCase() ===
      "PEMASUKAN";

    var jenisLabel =
      isIncome
        ? "Pemasukan"
        : "Pengeluaran";

    var jenisClass =
      isIncome
        ? "transaction-income"
        : "transaction-expense";

    html += "<tr>";

    html +=
      "<td>" +
      (index + 1) +
      "</td>";

    html +=
      "<td>" +
      escapeHtml(
        item.idTransaksi || "-"
      ) +
      "</td>";

    html +=
      "<td>" +
      escapeHtml(
        item.tanggal || "-"
      ) +
      "</td>";

    html +=
      '<td><span class="' +
      jenisClass +
      '">' +
      jenisLabel +
      "</span></td>";

    html +=
      "<td>" +
      escapeHtml(
        item.kategori || "-"
      ) +
      "</td>";

    html +=
      "<td>" +
      escapeHtml(
        item.deskripsi || "-"
      ) +
      "</td>";

    html +=
      "<td><strong>" +
      formatRupiah(
        item.nominal || 0
      ) +
      "</strong></td>";

    html += "</tr>";
  });

  tableBody.innerHTML = html;

  if (statusElement) {
    statusElement.textContent =
      transactions.length +
      " transaksi ditemukan.";
  }
}


/* =========================================================
   PENGGAJIAN
   ========================================================= */

async function loadSalaryList() {
  var statusElement =
    document.getElementById(
      "salaryStatus"
    );

  var tableBody =
    document.getElementById(
      "salaryTableBody"
    );

  if (statusElement) {
    statusElement.textContent =
      "Memuat data penggajian...";
  }

  try {
    var result =
      await apiGet(
        "salaryList"
      );

    renderSalaryList(
      result.data || {}
    );

  } catch (error) {
    console.error(
      "SALARY LIST ERROR:",
      error
    );

    if (statusElement) {
      statusElement.textContent =
        "Gagal memuat data penggajian.";
    }

    if (tableBody) {
      tableBody.innerHTML =
        "<tr>" +
        '<td colspan="7" class="empty-state">' +
        "Gagal mengambil data penggajian." +
        "</td>" +
        "</tr>";
    }
  }
}


/* =========================================================
   RENDER GAJI
   ========================================================= */

function renderSalaryList(data) {
  var employees =
    Array.isArray(data.pegawai)
      ? data.pegawai
      : [];

  setText(
    "salaryKasPenggajian",
    formatRupiah(
      data.kasPenggajian || 0
    )
  );

  setText(
    "salaryTotalPoin",
    formatNumber(
      data.totalPoin || 0
    )
  );

  setText(
    "salaryPointValue",
    formatRupiah(
      data.nilaiPerPoin || 0
    )
  );

  setText(
    "salaryTotal",
    formatRupiah(
      data.totalGaji || 0
    )
  );

  setText(
    "salaryRemaining",
    formatRupiah(
      data.sisaKasSetelahSimulasi || 0
    )
  );

  setText(
    "salaryEmployeeCount",
    formatNumber(
      data.jumlahPegawai ||
      employees.length
    )
  );

  var tableBody =
    document.getElementById(
      "salaryTableBody"
    );

  if (!tableBody) {
    return;
  }

  if (employees.length === 0) {
    tableBody.innerHTML =
      "<tr>" +
      '<td colspan="7" class="empty-state">' +
      "Belum ada data pegawai." +
      "</td>" +
      "</tr>";

    return;
  }

  var html = "";

  employees.forEach(function(employee, index) {
    html += "<tr>";

    html +=
      "<td>" +
      (index + 1) +
      "</td>";

    html +=
      "<td>" +
      escapeHtml(
        employee.id || "-"
      ) +
      "</td>";

    html +=
      "<td><strong>" +
      escapeHtml(
        employee.nama || "-"
      ) +
      "</strong></td>";

    html +=
      "<td>" +
      escapeHtml(
        employee.jabatan || "-"
      ) +
      "</td>";

    html +=
      "<td>" +
      formatNumber(
        employee.poin || 0
      ) +
      "</td>";

    html +=
      "<td>" +
      formatRupiah(
        employee.gaji || 0
      ) +
      "</td>";

    html +=
      '<td><span class="salary-status">' +
      escapeHtml(
        employee.status ||
        "Belum Dibayar"
      ) +
      "</span></td>";

    html += "</tr>";
  });

  tableBody.innerHTML = html;
}


/* =========================================================
   BAYAR SEMUA GAJI
   ========================================================= */

async function payAllSalaries() {
  var periodeElement =
    document.getElementById(
      "salaryPeriod"
    );

  var periode =
    periodeElement
      ? periodeElement.value
      : "";

  if (!periode) {
    showToast(
      "Periode pembayaran wajib dipilih."
    );
    return;
  }

  var confirmed =
    window.confirm(
      "Apakah Anda yakin ingin membayar seluruh gaji untuk periode " +
      periode +
      "?"
    );

  if (!confirmed) {
    return;
  }

  var button =
    document.getElementById(
      "payAllSalaryButton"
    );

  var buttonText =
    document.getElementById(
      "payAllSalaryText"
    );

  try {
    if (button) {
      button.disabled = true;
    }

    if (buttonText) {
      buttonText.textContent =
        "Memproses...";
    }

    var result =
      await apiPost({
        action: "payAllSalaries",
        periode: periode
      });

    renderPaymentResult(
      result.data || result
    );

    showToast(
      "Pembayaran gaji berhasil."
    );

    await loadDashboard();
    await loadSalaryList();
    await loadDatabaseStatus();

  } catch (error) {
    console.error(
      "PAY ALL SALARIES ERROR:",
      error
    );

    showToast(
      error.message ||
      "Pembayaran gaji gagal.",
      5000
    );

  } finally {
    if (button) {
      button.disabled = false;
    }

    if (buttonText) {
      buttonText.textContent =
        "Bayar Semua Gaji";
    }
  }
}


/* =========================================================
   HASIL PEMBAYARAN GAJI
   ========================================================= */

function renderPaymentResult(data) {
  var container =
    document.getElementById(
      "salaryPaymentResult"
    );

  if (!container || !data) {
    return;
  }

  var html = "";

  html +=
    '<div class="transaction-success-title">' +
    "Pembayaran Gaji Berhasil" +
    "</div>";

  html +=
    '<div class="transaction-detail-grid">';

  html +=
    '<div class="transaction-detail">' +
    "<span>Periode</span>" +
    "<strong>" +
    escapeHtml(
      data.periode || "-"
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Jumlah Pegawai</span>" +
    "<strong>" +
    formatNumber(
      data.jumlahPegawai || 0
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Total Poin</span>" +
    "<strong>" +
    formatNumber(
      data.totalPoin || 0
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Kas Penggajian</span>" +
    "<strong>" +
    formatRupiah(
      data.kasPenggajian || 0
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Total Gaji</span>" +
    "<strong>" +
    formatRupiah(
      data.totalGaji || 0
    ) +
    "</strong>" +
    "</div>";

  html +=
    '<div class="transaction-detail">' +
    "<span>Sisa Kas</span>" +
    "<strong>" +
    formatRupiah(
      data.sisaKas || 0
    ) +
    "</strong>" +
    "</div>";

  html += "</div>";

  container.innerHTML = html;

  container.classList.add("show");
}


/* =========================================================
   AUTO REFRESH
   ========================================================= */

var dashboardRefreshTimer = null;

function startAutoRefresh() {
  clearInterval(
    dashboardRefreshTimer
  );

  dashboardRefreshTimer =
    setInterval(
      async function() {
        var dashboard =
          document.getElementById(
            "page-dashboard"
          );

        if (
          dashboard &&
          dashboard.classList.contains(
            "active"
          )
        ) {
          await loadDashboard();
          await loadDatabaseStatus();
        }
      },
      60000
    );
}


/* =========================================================
   INISIALISASI APLIKASI
   ========================================================= */

async function initializeApp() {
  setConnectionStatus(
    false,
    "Menghubungkan..."
  );

  var connected =
    await testConnection();

  if (!connected) {
    return false;
  }

  await loadDashboard();
  await loadDatabaseStatus();

  await Promise.all([
    loadSettings(),
    loadEmployees()
  ]);

  setConnectionStatus(
    true,
    "Terhubung"
  );

  return true;
}


/* =========================================================
   EVENT NAVIGASI
   ========================================================= */

function initializeNavigation() {
  var buttons =
    document.querySelectorAll(
      ".nav-button"
    );

  buttons.forEach(function(button) {
    if (button.dataset.navBound) {
      return;
    }

    button.addEventListener(
      "click",
      function() {
        var page =
          button.dataset.page;

        if (page) {
          showPage(page);
        }
      }
    );

    button.dataset.navBound =
      "true";
  });
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

/*
 * Penting:
 * HTML Anda menggunakan onclick="showPage(...)"
 * sehingga fungsi harus berada di window.
 */

window.showPage =
  showPage;

window.submitIncome =
  submitIncome;

window.payAllSalaries =
  payAllSalaries;

window.loadDashboard =
  loadDashboard;

window.loadTransactionHistory =
  loadTransactionHistory;

window.loadSalaryList =
  loadSalaryList;

window.updateIncomePreview =
  updateIncomePreview;

window.showToast =
  showToast;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function() {

    console.log(
      "Keuangan Pokja Adiwiyata: JavaScript aktif."
    );

    initializeNavigation();

    initializeIncomeForm();

    initializeExpenseForm();

    await initializeApp();

    startAutoRefresh();

  }
);
