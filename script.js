/* ================================================================
   KEUANGAN POKJA PENGELOLAAN SAMPAH ADIWIYATA
   SCRIPT.JS — FRONTEND
   ================================================================
   
   FRONTEND :
     GitHub Pages

   BACKEND :
     Google Apps Script Web App

   DATABASE :
     Google Spreadsheet

   TIMEZONE :
     Asia/Jakarta

   ---------------------------------------------------------------
   FITUR
   ---------------------------------------------------------------
   ✓ Dashboard keuangan
   ✓ Data pegawai
   ✓ Penggajian 12 bulan
   ✓ Filter bulan
   ✓ Pencarian pegawai
   ✓ Status gaji
   ✓ Bayar gaji per orang
   ✓ Konfirmasi sebelum membayar
   ✓ Mencegah pembayaran ganda
   ✓ Tanggal pembayaran otomatis
   ✓ Keterangan pembayaran
   ✓ Rekap gaji dibayar / belum dibayar
   ✓ Loading state
   ✓ Error handling
   ✓ Toast notification
   ✓ Modal konfirmasi
   ✓ Responsive
   ✓ Tidak mengubah formula spreadsheet
   ================================================================ */


/* ================================================================
   KONFIGURASI UTAMA
   ================================================================ */

const CONFIG = Object.freeze({

  /*
   * GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA.
   *
   * Contoh:
   *
   * https://script.google.com/macros/s/AKfycbxxxxxxxx/exec
   */
  API_URL:
    'https://script.google.com/macros/s/AKfycby8HssHrbPp7Njhy9TpP9kC3fOSx1MTNmontcdN3H_v57txKJNc5llC1nrvXr0WPqtt/exec',

  TIMEZONE:
    'Asia/Jakarta',

  CURRENCY:
    'IDR',

  LOCALE:
    'id-ID',

  DEFAULT_MONTH:
    '',

  REQUEST_TIMEOUT:
    30000,

  AUTO_REFRESH_AFTER_PAYMENT:
    true,

  AUTO_REFRESH_INTERVAL:
    0,

  SHEETS: {
    PAYROLL:
      'PENGGAJIAN',

    EMPLOYEES:
      'PEGAWAI',

    CASH:
      'KAS POKJA'
  },

  PAYMENT: {

    PAID_STATUS:
      'SUDAH DIBAYAR',

    UNPAID_STATUS:
      'BELUM DIBAYAR'

  }

});


/* ================================================================
   STATE APLIKASI
   ================================================================ */

const state = {

  /*
   * Data utama.
   */
  payroll:
    [],

  employees:
    [],

  summary:
    null,

  paymentStatus:
    null,

  /*
   * Filter.
   */
  selectedMonth:
    CONFIG.DEFAULT_MONTH,

  searchKeyword:
    '',

  paymentFilter:
    'ALL',

  /*
   * UI.
   */
  loading:
    false,

  loadingMessage:
    '',

  selectedEmployee:
    null,

  selectedRow:
    null,

  /*
   * Status koneksi.
   */
  connected:
    false,

  lastUpdated:
    null,

  /*
   * Pengaman agar pembayaran
   * tidak dikirim dua kali.
   */
  paymentProcessing:
    false

};


/* ================================================================
   DOM HELPER
   ================================================================ */

function $(selector) {

  return document.querySelector(selector);

}


function $all(selector) {

  return Array.from(
    document.querySelectorAll(selector)
  );

}


/**
 * Mendukung beberapa kemungkinan ID
 * agar index.html lebih fleksibel.
 */
function findElement(...selectors) {

  for (const selector of selectors) {

    const element =
      document.querySelector(selector);

    if (element) {
      return element;
    }

  }

  return null;

}


/* ================================================================
   INITIALIZATION
   ================================================================ */

document.addEventListener(
  'DOMContentLoaded',
  initApp
);


async function initApp() {

  try {

    setupGlobalEvents();

    setupNavigation();

    setupFilters();

    setupSearch();

    setupModal();

    setupDelegatedEvents();

    setCurrentDate();

    setLoading(
      true,
      'Menghubungkan ke sistem keuangan...'
    );

    await loadInitialData();

    renderAll();

    setLoading(
      false
    );

  } catch (error) {

    console.error(
      '[INIT ERROR]',
      error
    );

    setLoading(
      false
    );

    showToast(
      error.message ||
      'Gagal memuat aplikasi.',
      'error'
    );

    renderConnectionError(
      error
    );

  }

}


/* ================================================================
   EVENT GLOBAL
   ================================================================ */

function setupGlobalEvents() {

  /*
   * Escape = tutup modal.
   */
  document.addEventListener(
    'keydown',
    function(event) {

      if (
        event.key === 'Escape'
      ) {

        closePaymentModal();

      }

    }
  );


  /*
   * Event online/offline.
   */
  window.addEventListener(
    'online',
    function() {

      updateConnectionIndicator(
        true
      );

      showToast(
        'Koneksi internet kembali.',
        'success'
      );

    }
  );


  window.addEventListener(
    'offline',
    function() {

      updateConnectionIndicator(
        false
      );

      showToast(
        'Koneksi internet terputus.',
        'warning'
      );

    }
  );

}


/* ================================================================
   NAVIGATION
   ================================================================ */

function setupNavigation() {

  const navButtons =
    $all(
      '[data-section], [data-page]'
    );


  navButtons.forEach(
    button => {

      button.addEventListener(
        'click',
        function() {

          const target =
            this.dataset.section ||
            this.dataset.page;

          if (!target) {
            return;
          }

          showSection(
            target
          );

        }
      );

    }
  );

}


function showSection(sectionName) {

  const sections =
    $all(
      '[data-content-section], .app-section, .page-section'
    );


  sections.forEach(
    section => {

      const name =
        section.dataset.contentSection ||
        section.dataset.section ||
        section.id;

      const active =
        name === sectionName ||
        name === `section-${sectionName}`;


      section.classList.toggle(
        'active',
        active
      );

      section.classList.toggle(
        'is-active',
        active
      );

    }
  );


  const navButtons =
    $all(
      '[data-section], [data-page]'
    );


  navButtons.forEach(
    button => {

      const target =
        button.dataset.section ||
        button.dataset.page;

      button.classList.toggle(
        'active',
        target === sectionName
      );

      button.classList.toggle(
        'is-active',
        target === sectionName
      );

    }
  );


  /*
   * Jika membuka penggajian,
   * pastikan datanya sudah ditampilkan.
   */
  if (
    sectionName === 'penggajian' ||
    sectionName === 'payroll'
  ) {

    renderPayroll();

  }

}


/* ================================================================
   FILTER
   ================================================================ */

function setupFilters() {

  const monthSelect =
    findElement(
      '#monthFilter',
      '#filterBulan',
      '#bulanFilter',
      '[data-month-filter]'
    );


  if (monthSelect) {

    monthSelect.addEventListener(
      'change',
      function() {

        state.selectedMonth =
          this.value;

        renderAll();

      }
    );

  }


  const paymentFilter =
    findElement(
      '#paymentFilter',
      '#filterPembayaran',
      '[data-payment-filter]'
    );


  if (paymentFilter) {

    paymentFilter.addEventListener(
      'change',
      function() {

        state.paymentFilter =
          this.value;

        renderPayroll();

      }
    );

  }

}


/* ================================================================
   SEARCH
   ================================================================ */

function setupSearch() {

  const searchInput =
    findElement(
      '#searchEmployee',
      '#searchPegawai',
      '#employeeSearch',
      '[data-employee-search]'
    );


  if (!searchInput) {
    return;
  }


  let timeout;


  searchInput.addEventListener(
    'input',
    function() {

      clearTimeout(
        timeout
      );


      timeout =
        setTimeout(
          () => {

            state.searchKeyword =
              normalizeText(
                this.value
              );

            renderPayroll();

          },
          150
        );

    }
  );

}


/* ================================================================
   MODAL
   ================================================================ */

function setupModal() {

  const closeButtons =
    $all(
      '[data-close-modal], .modal-close, .btn-close-modal'
    );


  closeButtons.forEach(
    button => {

      button.addEventListener(
        'click',
        closePaymentModal
      );

    }
  );


  const modal =
    findElement(
      '#paymentModal',
      '#modalBayar',
      '[data-payment-modal]'
    );


  if (modal) {

    modal.addEventListener(
      'click',
      function(event) {

        /*
         * Klik area backdrop.
         */
        if (
          event.target === modal ||
          event.target.classList.contains(
            'modal-backdrop'
          )
        ) {

          closePaymentModal();

        }

      }
    );

  }


  const confirmButton =
    findElement(
      '#confirmPayment',
      '#btnConfirmPayment',
      '#konfirmasiBayar',
      '[data-confirm-payment]'
    );


  if (confirmButton) {

    confirmButton.addEventListener(
      'click',
      processPaymentFromModal
    );

  }

}


function openPaymentModal(rowNumber) {

  const employee =
    state.payroll.find(
      item =>
        Number(item.row) ===
        Number(rowNumber)
    );


  if (!employee) {

    showToast(
      'Data pegawai tidak ditemukan.',
      'error'
    );

    return;

  }


  if (
    employee.sudahDibayar ||
    isPaidStatus(
      employee.statusPembayaran
    )
  ) {

    showToast(
      `${employee.nama} sudah dibayar untuk ${employee.bulan}.`,
      'warning'
    );

    return;

  }


  if (
    !employee.nama
  ) {

    showToast(
      'Nama pegawai belum tersedia.',
      'error'
    );

    return;

  }


  if (
    !Number(employee.gaji) ||
    Number(employee.gaji) <= 0
  ) {

    showToast(
      'Nominal gaji pegawai belum tersedia.',
      'error'
    );

    return;

  }


  state.selectedEmployee =
    employee;

  state.selectedRow =
    Number(employee.row);


  updatePaymentModal(
    employee
  );


  const modal =
    findElement(
      '#paymentModal',
      '#modalBayar',
      '[data-payment-modal]'
    );


  if (!modal) {

    /*
     * Fallback jika index belum mempunyai
     * modal khusus.
     */
    const confirmed =
      window.confirm(
        `Bayar gaji ${employee.nama} sebesar ${formatRupiah(employee.gaji)} untuk ${employee.bulan}?`
      );


    if (confirmed) {

      processPayment(
        employee.row
      );

    }

    return;

  }


  modal.classList.add(
    'show'
  );

  modal.classList.add(
    'active'
  );

  modal.classList.add(
    'is-open'
  );

  modal.removeAttribute(
    'hidden'
  );

  document.body.classList.add(
    'modal-open'
  );

}


function updatePaymentModal(
  employee
) {

  const nameElements =
    $all(
      '[data-payment-name], #paymentEmployeeName, #namaPegawaiBayar'
    );


  nameElements.forEach(
    element => {

      element.textContent =
        employee.nama;

    }
  );


  const positionElements =
    $all(
      '[data-payment-position], #paymentEmployeePosition, #jabatanPegawaiBayar'
    );


  positionElements.forEach(
    element => {

      element.textContent =
        employee.jabatan ||
        '-';

    }
  );


  const monthElements =
    $all(
      '[data-payment-month], #paymentMonth, #bulanBayar'
    );


  monthElements.forEach(
    element => {

      element.textContent =
        formatMonth(
          employee.bulan
        );

    }
  );


  const salaryElements =
    $all(
      '[data-payment-salary], #paymentSalary, #nominalBayar'
    );


  salaryElements.forEach(
    element => {

      element.textContent =
        formatRupiah(
          employee.gaji
        );

    }
  );


  const pointElements =
    $all(
      '[data-payment-point], #paymentPoint, #poinBayar'
    );


  pointElements.forEach(
    element => {

      element.textContent =
        formatNumber(
          employee.poin
        );

    }
  );


  const noteInput =
    findElement(
      '#paymentNote',
      '#keteranganPembayaran',
      '#paymentDescription',
      '[data-payment-note]'
    );


  if (noteInput) {

    noteInput.value =
      `Pembayaran gaji ${employee.bulan}`;

  }

}


function closePaymentModal() {

  const modal =
    findElement(
      '#paymentModal',
      '#modalBayar',
      '[data-payment-modal]'
    );


  if (modal) {

    modal.classList.remove(
      'show'
    );

    modal.classList.remove(
      'active'
    );

    modal.classList.remove(
      'is-open'
    );

    modal.setAttribute(
      'hidden',
      ''
    );

  }


  document.body.classList.remove(
    'modal-open'
  );


  state.selectedEmployee =
    null;

  state.selectedRow =
    null;

}


/* ================================================================
   EVENT DELEGATION
   ================================================================ */

function setupDelegatedEvents() {

  document.addEventListener(
    'click',
    function(event) {

      const paymentButton =
        event.target.closest(
          '[data-action="pay-salary"], [data-action="bayar-gaji"], [data-pay-row]'
        );


      if (paymentButton) {

        event.preventDefault();

        const row =
          paymentButton.dataset.row ||
          paymentButton.dataset.payRow ||
          paymentButton.closest('[data-row]')?.dataset.row;


        if (row) {

          openPaymentModal(
            Number(row)
          );

        }

        return;

      }


      const cancelButton =
        event.target.closest(
          '[data-action="cancel-payment"], [data-action="batalkan-pembayaran"]'
        );


      if (cancelButton) {

        event.preventDefault();

        const row =
          cancelButton.dataset.row;


        if (row) {

          cancelPayment(
            Number(row)
          );

        }

      }

    }
  );

}


/* ================================================================
   LOAD DATA
   ================================================================ */

async function loadInitialData() {

  const [
    employees,
    payroll,
    summary
  ] =
    await Promise.all([
      apiGet(
        'getEmployees'
      ),
      apiGet(
        'getPayroll'
      ),
      apiGet(
        'getSummary'
      )
    ]);


  state.employees =
    Array.isArray(
      employees
    )
      ? employees
      : [];


  state.payroll =
    Array.isArray(
      payroll
    )
      ? payroll
      : [];


  state.summary =
    summary ||
    null;


  state.connected =
    true;


  state.lastUpdated =
    new Date();


  /*
   * Isi filter bulan dari data.
   */
  populateMonthFilter();


  /*
   * Jika belum ada bulan yang dipilih,
   * pilih bulan terbaru yang tersedia.
   */
  if (
    !state.selectedMonth &&
    state.payroll.length
  ) {

    const months =
      getAvailableMonths();

    if (months.length) {

      state.selectedMonth =
        months[0];

    }

  }


  /*
   * Update payment summary.
   */
  updatePaymentSummary();

}


/* ================================================================
   API GET
   ================================================================ */

async function apiGet(
  action,
  params = {}
) {

  validateApiUrl();


  const url =
    new URL(
      CONFIG.API_URL
    );


  url.searchParams.set(
    'action',
    action
  );


  Object.entries(
    params
  ).forEach(
    ([key, value]) => {

      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {

        url.searchParams.set(
          key,
          value
        );

      }

    }
  );


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      CONFIG.REQUEST_TIMEOUT
    );


  try {

    const response =
      await fetch(
        url.toString(),
        {
          method:
            'GET',

          mode:
            'cors',

          cache:
            'no-store',

          signal:
            controller.signal
        }
      );


    if (!response.ok) {

      throw new Error(
        `Server mengembalikan HTTP ${response.status}.`
      );

    }


    const json =
      await response.json();


    return parseApiResponse(
      json
    );

  } catch (error) {

    if (
      error.name ===
      'AbortError'
    ) {

      throw new Error(
        'Permintaan ke server terlalu lama. Periksa koneksi internet atau URL Apps Script.'
      );

    }


    throw error;

  } finally {

    clearTimeout(
      timeout
    );

  }

}


/* ================================================================
   API POST
   ================================================================ */

async function apiPost(
  action,
  data = {}
) {

  validateApiUrl();


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      CONFIG.REQUEST_TIMEOUT
    );


  try {

    const response =
      await fetch(
        CONFIG.API_URL,
        {
          method:
            'POST',

          mode:
            'cors',

          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },

          body:
            JSON.stringify({
              action:
                action,

              ...data
            }),

          signal:
            controller.signal
        }
      );


    if (!response.ok) {

      throw new Error(
        `Server mengembalikan HTTP ${response.status}.`
      );

    }


    const json =
      await response.json();


    return parseApiResponse(
      json
    );

  } catch (error) {

    if (
      error.name ===
      'AbortError'
    ) {

      throw new Error(
        'Permintaan pembayaran terlalu lama. Silakan periksa koneksi.'
      );

    }


    throw error;

  } finally {

    clearTimeout(
      timeout
    );

  }

}


/* ================================================================
   API RESPONSE
   ================================================================ */

function parseApiResponse(
  response
) {

  if (
    !response ||
    typeof response !== 'object'
  ) {

    throw new Error(
      'Respons server tidak valid.'
    );

  }


  if (
    response.success === false
  ) {

    const error =
      new Error(
        response.message ||
        'Server gagal memproses permintaan.'
      );


    error.apiResponse =
      response;


    throw error;

  }


  /*
   * Code.gs menggunakan:
   *
   * {
   *   success: true,
   *   message: "...",
   *   data: ...
   * }
   */
  return response.data;

}


/* ================================================================
   BAYAR GAJI
   ================================================================ */

async function processPaymentFromModal() {

  if (
    state.paymentProcessing
  ) {
    return;
  }


  if (
    !state.selectedRow
  ) {

    showToast(
      'Data pembayaran tidak ditemukan.',
      'error'
    );

    return;

  }


  const noteInput =
    findElement(
      '#paymentNote',
      '#keteranganPembayaran',
      '#paymentDescription',
      '[data-payment-note]'
    );


  const keterangan =
    noteInput
      ? noteInput.value.trim()
      : '';


  await processPayment(
    state.selectedRow,
    keterangan
  );

}


async function processPayment(
  rowNumber,
  keterangan = ''
) {

  if (
    state.paymentProcessing
  ) {
    return;
  }


  const employee =
    state.payroll.find(
      item =>
        Number(item.row) ===
        Number(rowNumber)
    );


  if (!employee) {

    showToast(
      'Data pegawai tidak ditemukan.',
      'error'
    );

    return;

  }


  /*
   * Pengaman frontend.
   *
   * Backend tetap menjadi sumber validasi utama.
   */
  if (
    employee.sudahDibayar ||
    isPaidStatus(
      employee.statusPembayaran
    )
  ) {

    showToast(
      `${employee.nama} sudah dibayar.`,
      'warning'
    );

    closePaymentModal();

    return;

  }


  if (
    !employee.nama
  ) {

    showToast(
      'Nama pegawai belum tersedia.',
      'error'
    );

    return;

  }


  if (
    Number(employee.gaji) <= 0
  ) {

    showToast(
      'Nominal gaji tidak valid.',
      'error'
    );

    return;

  }


  state.paymentProcessing =
    true;


  setPaymentButtonLoading(
    true
  );


  try {

    showLoadingOverlay(
      'Memproses pembayaran gaji...'
    );


    const result =
      await apiPost(
        'paySalary',
        {
          row:
            Number(rowNumber),

          keterangan:
            keterangan ||
            `Pembayaran gaji ${employee.bulan}`
        }
      );


    /*
     * apiPost akan throw jika success=false.
     */
    if (
      !result
    ) {

      throw new Error(
        'Server tidak memberikan data pembayaran.'
      );

    }


    /*
     * Update data lokal terlebih dahulu
     * agar UI langsung responsif.
     */
    updateLocalPayment(
      rowNumber,
      result
    );


    closePaymentModal();


    hideLoadingOverlay();


    showPaymentSuccess(
      result
    );


    /*
     * Sinkronisasi ulang dengan spreadsheet.
     */
    if (
      CONFIG.AUTO_REFRESH_AFTER_PAYMENT
    ) {

      await refreshData(
        false
      );

    }


  } catch (error) {

    console.error(
      '[PAYMENT ERROR]',
      error
    );


    hideLoadingOverlay();


    /*
     * Jika backend mengatakan sudah dibayar,
     * tampilkan pesan khusus.
     */
    if (
      error.apiResponse &&
      error.apiResponse.alreadyPaid
    ) {

      showToast(
        error.apiResponse.message ||
        'Gaji sudah dibayar sebelumnya.',
        'warning'
      );

    } else {

      showToast(
        error.message ||
        'Pembayaran gagal diproses.',
        'error'
      );

    }

  } finally {

    state.paymentProcessing =
      false;

    setPaymentButtonLoading(
      false
    );

  }

}


/* ================================================================
   UPDATE DATA LOKAL SETELAH PEMBAYARAN
   ================================================================ */

function updateLocalPayment(
  rowNumber,
  result
) {

  const employee =
    state.payroll.find(
      item =>
        Number(item.row) ===
        Number(rowNumber)
    );


  if (!employee) {
    return;
  }


  employee.statusPembayaran =
    result.statusPembayaran ||
    CONFIG.PAYMENT.PAID_STATUS;


  employee.sudahDibayar =
    true;


  employee.tanggalBayar =
    result.tanggalBayar ||
    formatDateTime(
      new Date()
    );


  employee.keteranganPembayaran =
    result.keteranganPembayaran ||
    '';


  renderAll();

}


/* ================================================================
   PEMBATALAN PEMBAYARAN
   ================================================================ */

async function cancelPayment(
  rowNumber
) {

  const employee =
    state.payroll.find(
      item =>
        Number(item.row) ===
        Number(rowNumber)
    );


  if (!employee) {

    showToast(
      'Data pegawai tidak ditemukan.',
      'error'
    );

    return;

  }


  if (
    !employee.sudahDibayar
  ) {

    showToast(
      'Pegawai tersebut belum berstatus dibayar.',
      'warning'
    );

    return;

  }


  const confirmed =
    window.confirm(
      `Batalkan status pembayaran ${employee.nama} untuk ${employee.bulan}?`
    );


  if (!confirmed) {
    return;
  }


  try {

    showLoadingOverlay(
      'Membatalkan pembayaran...'
    );


    await apiPost(
      'cancelPayment',
      {
        row:
          Number(rowNumber)
      }
    );


    updateLocalPaymentCancelled(
      rowNumber
    );


    hideLoadingOverlay();


    showToast(
      `Pembayaran ${employee.nama} berhasil dibatalkan.`,
      'success'
    );


    await refreshData(
      false
    );


  } catch (error) {

    hideLoadingOverlay();


    showToast(
      error.message ||
      'Gagal membatalkan pembayaran.',
      'error'
    );

  }

}


function updateLocalPaymentCancelled(
  rowNumber
) {

  const employee =
    state.payroll.find(
      item =>
        Number(item.row) ===
        Number(rowNumber)
    );


  if (!employee) {
    return;
  }


  employee.statusPembayaran =
    CONFIG.PAYMENT.UNPAID_STATUS;

  employee.sudahDibayar =
    false;

  employee.tanggalBayar =
    '';

  employee.keteranganPembayaran =
    '';


  renderAll();

}


/* ================================================================
   REFRESH
   ================================================================ */

async function refreshData(
  showMessage = true
) {

  try {

    if (showMessage) {

      showLoadingOverlay(
        'Memperbarui data...'
      );

    }


    const [
      payroll,
      summary
    ] =
      await Promise.all([
        apiGet(
          'getPayroll',
          state.selectedMonth
            ? {
                bulan:
                  state.selectedMonth
              }
            : {}
        ),
        apiGet(
          'getSummary'
        )
      ]);


    /*
     * Penting:
     *
     * getPayroll dengan bulan tertentu hanya
     * mengembalikan bulan tersebut.
     *
     * Karena state.payroll dipakai untuk
     * keseluruhan filter, kita gunakan data
     * tersebut sebagai dataset aktif.
     */
    state.payroll =
      Array.isArray(
        payroll
      )
        ? payroll
        : [];


    state.summary =
      summary ||
      null;


    state.lastUpdated =
      new Date();


    updatePaymentSummary();

    renderAll();


    if (showMessage) {

      hideLoadingOverlay();

      showToast(
        'Data berhasil diperbarui.',
        'success'
      );

    }


  } catch (error) {

    hideLoadingOverlay();

    showToast(
      error.message ||
      'Gagal memperbarui data.',
      'error'
    );

    throw error;

  }

}


/* ================================================================
   RENDER ALL
   ================================================================ */

function renderAll() {

  populateMonthFilter();

  renderDashboard();

  renderEmployees();

  renderPayroll();

  updateConnectionIndicator(
    state.connected
  );

  updateLastUpdated();

}


/* ================================================================
   DASHBOARD
   ================================================================ */

function renderDashboard() {

  const summary =
    state.summary;


  if (!summary) {
    return;
  }


  setText(
    [
      '#totalPemasukan',
      '#dashboardTotalPemasukan',
      '[data-summary="total-pemasukan"]'
    ],
    formatRupiah(
      summary.totalPemasukan
    )
  );


  setText(
    [
      '#alokasiKas',
      '#totalKas',
      '[data-summary="alokasi-kas"]'
    ],
    formatRupiah(
      summary.alokasiKas30
    )
  );


  setText(
    [
      '#totalPengeluaran',
      '[data-summary="pengeluaran"]'
    ],
    formatRupiah(
      summary.totalPengeluaran
    )
  );


  setText(
    [
      '#sisaKas',
      '#saldoKas',
      '[data-summary="sisa-kas"]'
    ],
    formatRupiah(
      summary.sisaKas
    )
  );


  setText(
    [
      '#danaPenggajian',
      '#totalDanaPenggajian',
      '[data-summary="dana-penggajian"]'
    ],
    formatRupiah(
      summary.totalDanaPenggajian70
    )
  );


  updatePaymentSummary();

}


/* ================================================================
   DATA PEGAWAI
   ================================================================ */

function renderEmployees() {

  const container =
    findElement(
      '#employeeList',
      '#pegawaiList',
      '[data-employee-list]'
    );


  if (!container) {
    return;
  }


  if (
    !state.employees.length
  ) {

    container.innerHTML =
      emptyStateHTML(
        'Belum ada data pegawai.',
        'Silakan isi nama pegawai pada sheet PEGAWAI.'
      );

    return;

  }


  container.innerHTML =
    state.employees
      .map(
        employee =>
          employeeCardHTML(
            employee
          )
      )
      .join('');

}


function employeeCardHTML(
  employee
) {

  const initials =
    getInitials(
      employee.nama
    );


  return `
    <article
      class="employee-card"
      data-employee-row="${escapeHTML(employee.row)}"
    >

      <div class="employee-avatar">
        ${escapeHTML(initials)}
      </div>

      <div class="employee-info">

        <h3>
          ${escapeHTML(employee.nama || 'Belum diisi')}
        </h3>

        <p>
          ${escapeHTML(employee.jabatan || '-')}
        </p>

        <span>
          Bobot ${formatNumber(employee.bobot)} poin
        </span>

      </div>

    </article>
  `;

}


/* ================================================================
   PENGGAJIAN
   ================================================================ */

function renderPayroll() {

  const container =
    findElement(
      '#payrollList',
      '#penggajianList',
      '#salaryList',
      '[data-payroll-list]'
    );


  if (!container) {
    return;
  }


  const filtered =
    getFilteredPayroll();


  if (!filtered.length) {

    container.innerHTML =
      emptyStateHTML(
        'Data penggajian tidak ditemukan.',
        state.searchKeyword
          ? 'Coba gunakan kata kunci lain.'
          : 'Belum ada data pada periode ini.'
      );

    updatePayrollCount(
      0
    );

    return;

  }


  container.innerHTML =
    filtered
      .map(
        payrollCardHTML
      )
      .join('');


  updatePayrollCount(
    filtered.length
  );


  updatePaymentSummary(
    filtered
  );

}


/* ================================================================
   CARD GAJI
   ================================================================ */

function payrollCardHTML(
  item
) {

  const paid =
    item.sudahDibayar ||
    isPaidStatus(
      item.statusPembayaran
    );


  const canPay =
    !paid &&
    item.nama &&
    Number(item.gaji) > 0;


  const statusClass =
    paid
      ? 'paid'
      : 'unpaid';


  const statusLabel =
    paid
      ? 'SUDAH DIBAYAR'
      : 'BELUM DIBAYAR';


  const paymentDate =
    item.tanggalBayar
      ? formatDateTimeDisplay(
          item.tanggalBayar
        )
      : 'Belum ada pembayaran';


  return `
    <article
      class="payroll-card ${statusClass}"
      data-payroll-row="${escapeHTML(item.row)}"
    >

      <div class="payroll-card-top">

        <div class="payroll-avatar">
          ${escapeHTML(
            getInitials(item.nama)
          )}
        </div>

        <div class="payroll-person">

          <h3>
            ${escapeHTML(
              item.nama ||
              'Nama belum diisi'
            )}
          </h3>

          <p>
            ${escapeHTML(
              item.jabatan ||
              '-'
            )}
          </p>

        </div>

        <span
          class="payment-status ${statusClass}"
        >
          ${statusLabel}
        </span>

      </div>


      <div class="payroll-details">

        <div class="payroll-detail">

          <span>
            Periode
          </span>

          <strong>
            ${escapeHTML(
              formatMonth(item.bulan)
            )}
          </strong>

        </div>


        <div class="payroll-detail">

          <span>
            Poin
          </span>

          <strong>
            ${formatNumber(item.poin)}
          </strong>

        </div>


        <div class="payroll-detail salary">

          <span>
            Gaji
          </span>

          <strong>
            ${formatRupiah(item.gaji)}
          </strong>

        </div>

      </div>


      ${
        paid
          ? `
            <div class="payment-information">

              <div>
                <span>Tanggal dibayar</span>
                <strong>
                  ${escapeHTML(paymentDate)}
                </strong>
              </div>

              ${
                item.keteranganPembayaran
                  ? `
                    <div>
                      <span>Keterangan</span>
                      <strong>
                        ${escapeHTML(
                          item.keteranganPembayaran
                        )}
                      </strong>
                    </div>
                  `
                  : ''
              }

            </div>
          `
          : ''
      }


      <div class="payroll-actions">

        ${
          canPay
            ? `
              <button
                type="button"
                class="btn-pay-salary"
                data-action="pay-salary"
                data-row="${escapeHTML(item.row)}"
                aria-label="Bayar gaji ${escapeHTML(item.nama)}"
              >

                <span class="btn-pay-icon">
                  💰
                </span>

                <span>
                  BAYAR GAJI
                </span>

              </button>
            `
            : paid
              ? `
                <button
                  type="button"
                  class="btn-payment-done"
                  disabled
                >
                  ✓ SUDAH DIBAYAR
                </button>
              `
              : `
                <button
                  type="button"
                  class="btn-payment-disabled"
                  disabled
                >
                  DATA BELUM LENGKAP
                </button>
              `
        }

      </div>

    </article>
  `;

}


/* ================================================================
   FILTER DATA PENGGAJIAN
   ================================================================ */

function getFilteredPayroll() {

  let data =
    Array.isArray(
      state.payroll
    )
      ? [...state.payroll]
      : [];


  /*
   * Filter bulan.
   */
  if (
    state.selectedMonth
  ) {

    data =
      data.filter(
        item =>
          String(
            item.bulan
          ) ===
          String(
            state.selectedMonth
          )
      );

  }


  /*
   * Search nama/jabatan.
   */
  if (
    state.searchKeyword
  ) {

    const keyword =
      normalizeText(
        state.searchKeyword
      );


    data =
      data.filter(
        item => {

          const name =
            normalizeText(
              item.nama
            );

          const position =
            normalizeText(
              item.jabatan
            );


          return (
            name.includes(
              keyword
            ) ||
            position.includes(
              keyword
            )
          );

        }
      );

  }


  /*
   * Filter status pembayaran.
   */
  if (
    state.paymentFilter !==
    'ALL'
  ) {

    data =
      data.filter(
        item => {

          const paid =
            item.sudahDibayar ||
            isPaidStatus(
              item.statusPembayaran
            );


          if (
            state.paymentFilter ===
            'PAID'
          ) {

            return paid;

          }


          if (
            state.paymentFilter ===
            'UNPAID'
          ) {

            return !paid;

          }


          return true;

        }
      );

  }


  /*
   * Urutan:
   * BELUM DIBAYAR dulu,
   * kemudian nama.
   */
  data.sort(
    (a, b) => {

      const aPaid =
        a.sudahDibayar ||
        isPaidStatus(
          a.statusPembayaran
        );

      const bPaid =
        b.sudahDibayar ||
        isPaidStatus(
          b.statusPembayaran
        );


      if (
        aPaid !==
        bPaid
      ) {

        return aPaid
          ? 1
          : -1;

      }


      return String(
        a.nama || ''
      ).localeCompare(
        String(
          b.nama || ''
        ),
        'id'
      );

    }
  );


  return data;

}


/* ================================================================
   REKAP PEMBAYARAN
   ================================================================ */

function updatePaymentSummary(
  dataset = null
) {

  const data =
    dataset ||
    getCurrentMonthPayroll();


  const validEmployees =
    data.filter(
      item =>
        item.nama
    );


  const paid =
    validEmployees.filter(
      item =>
        item.sudahDibayar ||
        isPaidStatus(
          item.statusPembayaran
        )
    );


  const unpaid =
    validEmployees.filter(
      item =>
        !(
          item.sudahDibayar ||
          isPaidStatus(
            item.statusPembayaran
          )
        )
    );


  const total =
    validEmployees.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(item.gaji || 0),
      0
    );


  const paidAmount =
    paid.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(item.gaji || 0),
      0
    );


  const unpaidAmount =
    unpaid.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(item.gaji || 0),
      0
    );


  setText(
    [
      '#jumlahPegawai',
      '#totalPegawai',
      '[data-payment-summary="employee-count"]'
    ],
    formatNumber(
      validEmployees.length
    )
  );


  setText(
    [
      '#jumlahSudahDibayar',
      '#sudahDibayar',
      '[data-payment-summary="paid-count"]'
    ],
    formatNumber(
      paid.length
    )
  );


  setText(
    [
      '#jumlahBelumDibayar',
      '#belumDibayar',
      '[data-payment-summary="unpaid-count"]'
    ],
    formatNumber(
      unpaid.length
    )
  );


  setText(
    [
      '#totalGaji',
      '[data-payment-summary="total"]'
    ],
    formatRupiah(
      total
    )
  );


  setText(
    [
      '#totalGajiDibayar',
      '#nominalSudahDibayar',
      '[data-payment-summary="paid-amount"]'
    ],
    formatRupiah(
      paidAmount
    )
  );


  setText(
    [
      '#totalGajiBelumDibayar',
      '#nominalBelumDibayar',
      '[data-payment-summary="unpaid-amount"]'
    ],
    formatRupiah(
      unpaidAmount
    )
  );


  /*
   * Progress pembayaran.
   */
  const percentage =
    total > 0
      ? (
          paidAmount /
          total
        ) *
        100
      : 0;


  setText(
    [
      '#paymentPercentage',
      '[data-payment-summary="percentage"]'
    ],
    `${percentage.toFixed(1)}%`
  );


  const progress =
    findElement(
      '#paymentProgress',
      '[data-payment-progress]'
    );


  if (progress) {

    progress.style.width =
      `${Math.min(100, Math.max(0, percentage))}%`;

  }

}


/* ================================================================
   MONTH DATA
   ================================================================ */

function getCurrentMonthPayroll() {

  if (
    !state.selectedMonth
  ) {

    return state.payroll;

  }


  return state.payroll.filter(
    item =>
      String(item.bulan) ===
      String(state.selectedMonth)
  );

}


function getAvailableMonths() {

  const months =
    state.payroll
      .map(
        item =>
          String(
            item.bulan || ''
          )
      )
      .filter(
        Boolean
      );


  return [
    ...new Set(
      months
    )
  ].sort(
    (a, b) =>
      b.localeCompare(a)
  );

}


/* ================================================================
   MONTH FILTER
   ================================================================ */

function populateMonthFilter() {

  const select =
    findElement(
      '#monthFilter',
      '#filterBulan',
      '#bulanFilter',
      '[data-month-filter]'
    );


  if (!select) {
    return;
  }


  const months =
    getAvailableMonths();


  const current =
    state.selectedMonth;


  select.innerHTML =
    `
      <option value="">
        Semua Bulan
      </option>

      ${
        months
          .map(
            month =>
              `
                <option
                  value="${escapeHTML(month)}"
                  ${
                    String(month) ===
                    String(current)
                      ? 'selected'
                      : ''
                  }
                >
                  ${escapeHTML(
                    formatMonth(month)
                  )}
                </option>
              `
          )
          .join('')
      }
    `;

}


/* ================================================================
   LOADING
   ================================================================ */

function setLoading(
  active,
  message = ''
) {

  state.loading =
    active;

  state.loadingMessage =
    message;


  const loaders =
    $all(
      '.loading-overlay, [data-loading-overlay]'
    );


  loaders.forEach(
    loader => {

      loader.classList.toggle(
        'show',
        active
      );

      loader.classList.toggle(
        'active',
        active
      );

      if (
        message
      ) {

        const text =
          loader.querySelector(
            '[data-loading-text], .loading-text'
          );


        if (text) {

          text.textContent =
            message;

        }

      }

    }
  );

}


function showLoadingOverlay(
  message
) {

  setLoading(
    true,
    message
  );


  let overlay =
    findElement(
      '#loadingOverlay',
      '[data-loading-overlay]'
    );


  /*
   * Jika index belum menyediakan overlay,
   * buat otomatis.
   */
  if (!overlay) {

    overlay =
      document.createElement(
        'div'
      );


    overlay.id =
      'loadingOverlay';


    overlay.className =
      'loading-overlay';


    overlay.innerHTML =
      `
        <div class="loading-card">

          <div class="loading-spinner">
            💰
          </div>

          <div
            class="loading-text"
            data-loading-text
          >
            ${escapeHTML(message)}
          </div>

        </div>
      `;


    document.body.appendChild(
      overlay
    );

  }


  overlay.classList.add(
    'show'
  );

  overlay.classList.add(
    'active'
  );

  overlay.removeAttribute(
    'hidden'
  );


  const text =
    overlay.querySelector(
      '[data-loading-text], .loading-text'
    );


  if (text) {

    text.textContent =
      message;

  }

}


function hideLoadingOverlay() {

  setLoading(
    false
  );


  const overlay =
    findElement(
      '#loadingOverlay',
      '[data-loading-overlay]'
    );


  if (overlay) {

    overlay.classList.remove(
      'show'
    );

    overlay.classList.remove(
      'active'
    );

    overlay.setAttribute(
      'hidden',
      ''
    );

  }

}


/* ================================================================
   PAYMENT BUTTON LOADING
   ================================================================ */

function setPaymentButtonLoading(
  loading
) {

  const buttons =
    $all(
      '[data-confirm-payment], #confirmPayment, #btnConfirmPayment, #konfirmasiBayar'
    );


  buttons.forEach(
    button => {

      button.disabled =
        loading;


      if (loading) {

        if (
          !button.dataset.originalText
        ) {

          button.dataset.originalText =
            button.innerHTML;

        }


        button.innerHTML =
          `
            <span class="button-spinner">
              ⏳
            </span>
            Memproses...
          `;

      } else if (
        button.dataset.originalText
      ) {

        button.innerHTML =
          button.dataset.originalText;

      }

    }
  );

}


/* ================================================================
   SUCCESS PAYMENT
   ================================================================ */

function showPaymentSuccess(
  result
) {

  const name =
    result.nama ||
    state.selectedEmployee?.nama ||
    'Pegawai';


  const amount =
    result.gaji ||
    state.selectedEmployee?.gaji ||
    0;


  const date =
    result.tanggalBayar ||
    formatDateTime(
      new Date()
    );


  showToast(
    `Gaji ${name} sebesar ${formatRupiah(amount)} berhasil dibayar.`,
    'success',
    5000
  );


  /*
   * Isi elemen sukses jika tersedia.
   */
  setText(
    [
      '#successPaymentName',
      '[data-success-payment-name]'
    ],
    name
  );


  setText(
    [
      '#successPaymentAmount',
      '[data-success-payment-amount]'
    ],
    formatRupiah(
      amount
    )
  );


  setText(
    [
      '#successPaymentDate',
      '[data-success-payment-date]'
    ],
    date
  );

}


/* ================================================================
   TOAST
   ================================================================ */

function showToast(
  message,
  type = 'info',
  duration = 3500
) {

  let container =
    findElement(
      '#toastContainer',
      '.toast-container',
      '[data-toast-container]'
    );


  if (!container) {

    container =
      document.createElement(
        'div'
      );


    container.id =
      'toastContainer';


    container.className =
      'toast-container';


    document.body.appendChild(
      container
    );

  }


  const toast =
    document.createElement(
      'div'
    );


  toast.className =
    `toast toast-${type}`;


  const icon =
    type === 'success'
      ? '✓'
      : type === 'error'
        ? '!'
        : type === 'warning'
          ? '⚠'
          : 'ℹ';


  toast.innerHTML =
    `
      <span class="toast-icon">
        ${icon}
      </span>

      <span class="toast-message">
        ${escapeHTML(message)}
      </span>

      <button
        type="button"
        class="toast-close"
        aria-label="Tutup"
      >
        ×
      </button>
    `;


  container.appendChild(
    toast
  );


  const close =
    toast.querySelector(
      '.toast-close'
    );


  close.addEventListener(
    'click',
    () => {

      removeToast(
        toast
      );

    }
  );


  requestAnimationFrame(
    () => {

      toast.classList.add(
        'show'
      );

    }
  );


  setTimeout(
    () => {

      removeToast(
        toast
      );

    },
    duration
  );

}


function removeToast(
  toast
) {

  if (!toast) {
    return;
  }


  toast.classList.remove(
    'show'
  );


  setTimeout(
    () => {

      toast.remove();

    },
    250
  );

}


/* ================================================================
   CONNECTION INDICATOR
   ================================================================ */

function updateConnectionIndicator(
  connected
) {

  const indicators =
    $all(
      '[data-connection-status], #connectionStatus, .connection-status'
    );


  indicators.forEach(
    indicator => {

      indicator.classList.toggle(
        'online',
        connected
      );

      indicator.classList.toggle(
        'offline',
        !connected
      );


      const text =
        indicator.querySelector(
          '[data-connection-text], .connection-text'
        );


      if (text) {

        text.textContent =
          connected
            ? 'Terhubung'
            : 'Offline';

      }

    }
  );

}


/* ================================================================
   LAST UPDATED
   ================================================================ */

function updateLastUpdated() {

  if (
    !state.lastUpdated
  ) {
    return;
  }


  setText(
    [
      '#lastUpdated',
      '[data-last-updated]'
    ],
    `Diperbarui ${formatDateTimeDisplay(state.lastUpdated)}`
  );

}


/* ================================================================
   CURRENT DATE
   ================================================================ */

function setCurrentDate() {

  const now =
    new Date();


  setText(
    [
      '#currentDate',
      '#tanggalHariIni',
      '[data-current-date]'
    ],
    formatLongDate(
      now
    )
  );


  setText(
    [
      '#currentTime',
      '#jamSekarang',
      '[data-current-time]'
    ],
    formatTime(
      now
    )
  );

}


/* ================================================================
   CONNECTION ERROR
   ================================================================ */

function renderConnectionError(
  error
) {

  const containers =
    $all(
      '[data-connection-error], #connectionError'
    );


  containers.forEach(
    container => {

      container.removeAttribute(
        'hidden'
      );

      container.classList.add(
        'show'
      );


      const message =
        container.querySelector(
          '[data-error-message], .error-message'
        );


      if (message) {

        message.textContent =
          error.message ||
          'Tidak dapat terhubung ke backend.';

      }

    }
  );

}


/* ================================================================
   PAYROLL COUNT
   ================================================================ */

function updatePayrollCount(
  count
) {

  setText(
    [
      '#payrollCount',
      '#jumlahDataGaji',
      '[data-payroll-count]'
    ],
    formatNumber(
      count
    )
  );

}


/* ================================================================
   HELPERS
   ================================================================ */

function validateApiUrl() {

  if (
    !CONFIG.API_URL ||
    CONFIG.API_URL.includes(
      'GANTI_DENGAN'
    )
  ) {

    throw new Error(
      'URL Google Apps Script belum diisi pada CONFIG.API_URL di script.js.'
    );

  }

}


function setText(
  selectors,
  value
) {

  selectors.forEach(
    selector => {

      const elements =
        document.querySelectorAll(
          selector
        );


      elements.forEach(
        element => {

          element.textContent =
            value ?? '';

        }
      );

    }
  );

}


function normalizeText(
  value
) {

  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase();

}


function escapeHTML(
  value
) {

  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );

}


function formatNumber(
  value
) {

  const number =
    Number(
      value || 0
    );


  return new Intl.NumberFormat(
    CONFIG.LOCALE
  ).format(
    number
  );

}


function formatRupiah(
  value
) {

  const number =
    Number(
      value || 0
    );


  return new Intl.NumberFormat(
    CONFIG.LOCALE,
    {
      style:
        'currency',

      currency:
        CONFIG.CURRENCY,

      maximumFractionDigits:
        0
    }
  ).format(
    number
  );

}


function formatMonth(
  value
) {

  if (
    !value
  ) {
    return '-';
  }


  const text =
    String(
      value
    );


  const match =
    text.match(
      /^(\d{4})-(\d{1,2})$/
    );


  if (!match) {
    return text;
  }


  const year =
    Number(
      match[1]
    );


  const month =
    Number(
      match[2]
    );


  const date =
    new Date(
      year,
      month - 1,
      1
    );


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      month:
        'long',

      year:
        'numeric'
    }
  ).format(
    date
  );

}


function formatLongDate(
  value
) {

  const date =
    value instanceof Date
      ? value
      : new Date(value);


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return '-';

  }


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      weekday:
        'long',

      day:
        'numeric',

      month:
        'long',

      year:
        'numeric'
    }
  ).format(
    date
  );

}


function formatTime(
  value
) {

  const date =
    value instanceof Date
      ? value
      : new Date(value);


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return '-';

  }


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      hour:
        '2-digit',

      minute:
        '2-digit',

      second:
        '2-digit',

      hour12:
        false,

      timeZone:
        CONFIG.TIMEZONE
    }
  ).format(
    date
  );

}


function formatDateTime(
  value
) {

  const date =
    value instanceof Date
      ? value
      : new Date(value);


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return '-';

  }


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',

      second:
        '2-digit',

      hour12:
        false,

      timeZone:
        CONFIG.TIMEZONE
    }
  ).format(
    date
  );

}


function formatDateTimeDisplay(
  value
) {

  if (
    !value
  ) {
    return '-';
  }


  /*
   * Jika backend mengirim string
   * "dd/MM/yyyy HH:mm:ss", jangan
   * biarkan browser salah menginterpretasikan
   * format Indonesia tersebut.
   */
  const text =
    String(
      value
    );


  if (
    /^\d{2}\/\d{2}\/\d{4}/.test(
      text
    )
  ) {

    return text;

  }


  return formatDateTime(
    value
  );

}


function getInitials(
  name
) {

  const text =
    String(
      name || ''
    ).trim();


  if (!text) {
    return '?';
  }


  const words =
    text
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );


  if (
    words.length === 1
  ) {

    return words[0]
      .slice(
        0,
        2
      )
      .toUpperCase();

  }


  return (
    words[0][0] +
    words[words.length - 1][0]
  ).toUpperCase();

}


function isPaidStatus(
  status
) {

  return normalizeText(
    status
  ) ===
  normalizeText(
    CONFIG.PAYMENT.PAID_STATUS
  );

}


function emptyStateHTML(
  title,
  description
) {

  return `
    <div class="empty-state">

      <div class="empty-icon">
        🗂️
      </div>

      <h3>
        ${escapeHTML(title)}
      </h3>

      <p>
        ${escapeHTML(description)}
      </p>

    </div>
  `;

}


/* ================================================================
   EXPORT / DEBUG
   ================================================================ */

window.KeuanganApp = {

  state,

  CONFIG,

  refresh:
    () =>
      refreshData(true),

  reload:
    () =>
      loadInitialData()
        .then(
          renderAll
        ),

  openPayment:
    row =>
      openPaymentModal(
        Number(row)
      ),

  paySalary:
    row =>
      processPayment(
        Number(row)
      ),

  cancelPayment:
    row =>
      cancelPayment(
        Number(row)
      ),

  getPayroll:
    () =>
      state.payroll,

  getEmployees:
    () =>
      state.employees,

  getSummary:
    () =>
      state.summary

};


/* ================================================================
   CLOCK
   ================================================================ */

setInterval(
  setCurrentDate,
  1000
);
