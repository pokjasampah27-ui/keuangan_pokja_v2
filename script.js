/* =========================================================
   KEUANGAN POKJA ADIWIYATA
   SCRIPT.JS
   ========================================================= */


/* =========================================================
   KONFIGURASI API
   ========================================================= */

const API_URL =
  'https://script.google.com/macros/s/AKfycbwtL-WJQ83NPSXC87Xj2Fd_2hZr8Hx03fA_txTKp_92HVWbJh3U_inakgZHh3g87uA75A/exec';


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

  const number =
    Number(value || 0);

  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }
  ).format(number);

}


/* =========================================================
   FORMAT ANGKA
   ========================================================= */

function formatNumber(value) {

  const number =
    Number(value || 0);

  return new Intl.NumberFormat(
    'id-ID'
  ).format(number);

}


/* =========================================================
   REQUEST GET API
   ========================================================= */

async function apiGet(action) {

  const url =
    API_URL +
    '?action=' +
    encodeURIComponent(action) +
    '&_=' +
    Date.now();


  const response =
    await fetch(url, {
      method: 'GET',
      cache: 'no-store'
    });


  if (!response.ok) {

    throw new Error(
      'Server API tidak dapat diakses. HTTP ' +
      response.status
    );

  }


  const result =
    await response.json();


  if (!result.success) {

    throw new Error(
      result.message ||
      'API mengembalikan status gagal.'
    );

  }


  return result;

}


/* =========================================================
   UPDATE STATUS KONEKSI
   ========================================================= */

function setConnectionStatus(
  connected,
  message
) {

  const element =
    document.getElementById(
      'connectionStatus'
    );


  if (!element) {
    return;
  }


  APP_STATE.connected =
    connected;


  element.textContent =
    message ||
    (
      connected
        ? 'Terhubung'
        : 'Tidak terhubung'
    );


  element.classList.remove(
    'connected',
    'error'
  );


  if (connected) {

    element.classList.add(
      'connected'
    );

  } else {

    element.classList.add(
      'error'
    );

  }

}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;


function showToast(
  message,
  duration = 3000
) {

  const toast =
    document.getElementById(
      'toast'
    );


  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    'show'
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      function() {

        toast.classList.remove(
          'show'
        );

      },
      duration
    );

}


/* =========================================================
   NAVIGASI HALAMAN
   ========================================================= */

function showPage(pageName) {

  const pages =
    document.querySelectorAll(
      '.page'
    );


  pages.forEach(
    function(page) {

      page.classList.remove(
        'active'
      );

    }
  );


  const target =
    document.getElementById(
      'page-' + pageName
    );


  if (!target) {
    return;
  }


  target.classList.add(
    'active'
  );


  const buttons =
    document.querySelectorAll(
      '.nav-button'
    );


  buttons.forEach(
    function(button) {

      button.classList.remove(
        'active'
      );


      if (
        button.dataset.page ===
        pageName
      ) {

        button.classList.add(
          'active'
        );

      }

    }
  );


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });


  /*
   * Dashboard selalu mengambil
   * data terbaru ketika dibuka.
   */

    if (
    pageName === 'dashboard'
  ) {

    loadDashboard();

  }


  /*
   * Riwayat selalu mengambil
   * transaksi terbaru ketika
   * halaman dibuka.
   */

  if (
    pageName === 'history'
  ) {

    loadTransactionHistory();

  }
   
if (
  pageName === 'salary'
) {

  loadSalaryList();

}

/* =========================================================
   PING API
   ========================================================= */

async function testConnection() {

  try {

    await apiGet(
      'ping'
    );


    setConnectionStatus(
      true,
      'Terhubung'
    );


    const apiStatus =
      document.getElementById(
        'apiStatus'
      );


    if (apiStatus) {

      apiStatus.textContent =
        'ONLINE';

      apiStatus.className =
        'status-success';

    }


    return true;


  } catch (error) {

    console.error(
      'API PING ERROR:',
      error
    );


    setConnectionStatus(
      false,
      'Offline'
    );


    const apiStatus =
      document.getElementById(
        'apiStatus'
      );


    if (apiStatus) {

      apiStatus.textContent =
        'ERROR';

      apiStatus.className =
        'status-error';

    }


    return false;

  }

}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

async function loadSettings() {

  try {

    const result =
      await apiGet(
        'settings'
      );


    APP_STATE.settings =
      result.data;


    return result.data;


  } catch (error) {

    console.error(
      'SETTINGS ERROR:',
      error
    );

    return null;

  }

}


/* =========================================================
   LOAD EMPLOYEES
   ========================================================= */

async function loadEmployees() {

  try {

    const result =
      await apiGet(
        'employees'
      );


    APP_STATE.employees =
      Array.isArray(
        result.data
      )
        ? result.data
        : [];


    return APP_STATE.employees;


  } catch (error) {

    console.error(
      'EMPLOYEES ERROR:',
      error
    );

    APP_STATE.employees =
      [];

    return [];

  }

}


/* =========================================================
   LOAD DATABASE STATUS
   ========================================================= */

async function loadDatabaseStatus() {

  const element =
    document.getElementById(
      'databaseStatus'
    );


  try {

    const result =
      await apiGet(
        'databaseStatus'
      );


    if (!element) {
      return result.data;
    }


    /*
     * Backend dapat mengembalikan
     * beberapa bentuk status.
     * Kita cek secara fleksibel.
     */

    const data =
      result.data || {};


    let aman = true;


    if (
      data.success === false ||
      data.status === 'ERROR' ||
      data.status === 'ERRORS'
    ) {

      aman = false;

    }


    element.textContent =
      aman
        ? 'AMAN'
        : 'PERIKSA';


    element.className =
      aman
        ? 'status-success'
        : 'status-error';


    return data;


  } catch (error) {

    console.error(
      'DATABASE STATUS ERROR:',
      error
    );


    if (element) {

      element.textContent =
        'ERROR';

      element.className =
        'status-error';

    }


    return null;

  }

}


/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {

  try {

    const result =
      await apiGet(
        'dashboard'
      );


    APP_STATE.dashboard =
      result.data;


    renderDashboard(
      result.data
    );


    setConnectionStatus(
      true,
      'Terhubung'
    );


  } catch (error) {

    console.error(
      'DASHBOARD ERROR:',
      error
    );


    setConnectionStatus(
      false,
      'Gagal terhubung'
    );


    showToast(
      'Dashboard gagal mengambil data dari server.'
    );

  }

}


/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

function renderDashboard(data) {

  if (!data) {
    return;
  }


  /*
   * Karena struktur response backend
   * dapat berkembang, nilai diambil
   * dengan beberapa kemungkinan nama.
   */

  const totalIncome =
    firstNumber(
      data.totalPemasukan,
      data.totalIncome,
      data.pemasukan,
      data.total
    );


  const totalExpense =
    firstNumber(
      data.totalPengeluaran,
      data.totalExpense,
      data.pengeluaran
    );


  const kasPokja =
    firstNumber(
      data.kasPokja,
      data.saldoKasPokja,
      data.totalKasPokja
    );


  const kasPenggajian =
    firstNumber(
      data.kasPenggajian,
      data.totalKasPenggajian,
      data.saldoKasPenggajian
    );


  const totalPoints =
    firstNumber(
      data.totalPoin,
      data.totalPoints
    );


  const pointValue =
    firstNumber(
      data.nilaiPerPoin,
      data.pointValue
    );


  const employeeCount =
    firstNumber(
      data.jumlahPegawai,
      data.employeeCount
    );


  const totalSalary =
    firstNumber(
      data.totalGaji,
      data.totalSalary
    );


  setText(
    'totalIncome',
    formatRupiah(
      totalIncome
    )
  );


  setText(
    'totalExpense',
    formatRupiah(
      totalExpense
    )
  );


  setText(
    'kasPokja',
    formatRupiah(
      kasPokja
    )
  );


  setText(
    'kasPenggajian',
    formatRupiah(
      kasPenggajian
    )
  );


  setText(
    'totalPoints',
    formatNumber(
      totalPoints
    )
  );


  setText(
    'pointValue',
    formatRupiah(
      pointValue
    )
  );


  setText(
    'employeeCount',
    formatNumber(
      employeeCount
    )
  );


  setText(
    'totalSalary',
    formatRupiah(
      totalSalary
    )
  );


  /*
   * Periode aktif.
   */

  const periode =
    data.periode ||
    data.period ||
    data.bulanTahun ||
    '-';


  setText(
    'currentPeriod',
    periode
  );

}


/* =========================================================
   AMBIL ANGKA PERTAMA YANG VALID
   ========================================================= */

function firstNumber() {

  const values =
    Array.from(
      arguments
    );


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      values[i] !== undefined &&
      values[i] !== null &&
      values[i] !== '' &&
      isFinite(
        Number(values[i])
      )
    ) {

      return Number(
        values[i]
      );

    }

  }


  return 0;

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value;

  }

}


/* =========================================================
   LOAD SEMUA DATA AWAL
   ========================================================= */

async function initializeApp() {

  setConnectionStatus(
    false,
    'Menghubungkan...'
  );


  /*
   * Jalankan PING terlebih dahulu.
   */

  const connected =
    await testConnection();


  if (!connected) {

    return;

  }


  /*
   * Ambil dashboard.
   */

  await loadDashboard();


  /*
   * Ambil status database.
   */

  await loadDatabaseStatus();


  /*
   * Settings dan pegawai
   * dipersiapkan untuk modul
   * berikutnya.
   */

  await Promise.all([
    loadSettings(),
    loadEmployees()
  ]);

}


/* =========================================================
   AUTO REFRESH DASHBOARD
   ========================================================= */

let dashboardRefreshTimer = null;


function startAutoRefresh() {

  clearInterval(
    dashboardRefreshTimer
  );


  /*
   * Refresh setiap 60 detik.
   */

  dashboardRefreshTimer =
    setInterval(
      async function() {

        /*
         * Hanya refresh ketika
         * dashboard sedang aktif.
         */

        const dashboard =
          document.getElementById(
            'page-dashboard'
          );


        if (
          dashboard &&
          dashboard.classList.contains(
            'active'
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
   EVENT DOM READY
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  async function() {

    await initializeApp();

    startAutoRefresh();

  }
);

/* =========================================================
   MODUL PEMASUKAN
   ========================================================= */


/* =========================================================
   FORMAT TANGGAL HARI INI
   ========================================================= */

function setDefaultIncomeDate() {

  const input =
    document.getElementById(
      'incomeDate'
    );

  if (!input) {
    return;
  }


  /*
   * Menggunakan tanggal lokal
   * browser.
   *
   * Backend tetap menjadi
   * sumber validasi tanggal.
   */

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );


  input.value =
    `${year}-${month}-${day}`;

}


/* =========================================================
   PREVIEW ALOKASI
   ========================================================= */

function updateIncomePreview() {

  const input =
    document.getElementById(
      'incomeNominal'
    );


  const kasPokjaElement =
    document.getElementById(
      'previewKasPokja'
    );


  const kasPenggajianElement =
    document.getElementById(
      'previewKasPenggajian'
    );


  if (!input) {
    return;
  }


  const nominal =
    Number(
      input.value || 0
    );


  const kasPokja =
    nominal * 30 / 100;


  const kasPenggajian =
    nominal * 70 / 100;


  if (kasPokjaElement) {

    kasPokjaElement.textContent =
      formatRupiah(
        kasPokja
      );

  }


  if (kasPenggajianElement) {

    kasPenggajianElement.textContent =
      formatRupiah(
        kasPenggajian
      );

  }

}


/* =========================================================
   POST API
   ========================================================= */

async function apiPost(
  payload
) {

  const response =
    await fetch(
      API_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );


  if (!response.ok) {

    throw new Error(
      'Server API tidak dapat diakses. HTTP ' +
      response.status
    );

  }


  const result =
    await response.json();


  if (!result.success) {

    throw new Error(
      result.message ||
      'Transaksi gagal diproses.'
    );

  }


  return result;

}


/* =========================================================
   SUBMIT PEMASUKAN
   ========================================================= */

async function submitIncome(event) {

  event.preventDefault();


  const form =
    document.getElementById(
      'incomeForm'
    );


  const button =
    document.getElementById(
      'incomeSubmitButton'
    );


  const buttonText =
    document.getElementById(
      'incomeSubmitText'
    );


  const tanggal =
    document.getElementById(
      'incomeDate'
    ).value;


  const kategori =
    document.getElementById(
      'incomeCategory'
    ).value;


  const nominal =
    document.getElementById(
      'incomeNominal'
    ).value;


  const deskripsi =
    document.getElementById(
      'incomeDescription'
    ).value.trim();


  /*
   * Validasi ringan di frontend.
   * Validasi utama tetap di backend.
   */

  if (!tanggal) {

    showToast(
      'Tanggal pemasukan wajib diisi.'
    );

    return;

  }


  if (!kategori) {

    showToast(
      'Kategori pemasukan wajib dipilih.'
    );

    return;

  }


  if (
    !nominal ||
    Number(nominal) <= 0
  ) {

    showToast(
      'Nominal pemasukan harus lebih besar dari 0.'
    );

    return;

  }


  /*
   * Konfirmasi sebelum transaksi.
   */

  const nominalNumber =
    Number(nominal);


  const konfirmasi =
    window.confirm(
      'Simpan pemasukan sebesar ' +
      formatRupiah(
        nominalNumber
      ) +
      ' dengan kategori "' +
      kategori +
      '"?'
    );


  if (!konfirmasi) {
    return;
  }


  try {

    button.disabled =
      true;


    buttonText.textContent =
      '⏳ Menyimpan...';


    const result =
      await apiPost({

        action:
          'addIncome',

        tanggal:
          tanggal,

        nominal:
          nominalNumber,

        kategori:
          kategori,

        deskripsi:
          deskripsi,

        userAdmin:
          'Aplikasi'

      });


    /*
     * Tampilkan hasil transaksi.
     */

    showIncomeResult(
      result.data
    );


    /*
     * Reset form.
     */

    form.reset();


    setDefaultIncomeDate();


    updateIncomePreview();


    /*
     * Update dashboard
     * secara otomatis.
     */

    await loadDashboard();


    await loadDatabaseStatus();


    showToast(
      'Pemasukan berhasil disimpan.'
    );


  } catch (error) {

    console.error(
      'ADD INCOME ERROR:',
      error
    );


    showToast(
      error.message ||
      'Pemasukan gagal disimpan.',
      5000
    );


  } finally {

    button.disabled =
      false;


    buttonText.textContent =
      '💾 Simpan Pemasukan';

  }

}


/* =========================================================
   TAMPILKAN HASIL PEMASUKAN
   ========================================================= */

function showIncomeResult(
  data
) {

  const container =
    document.getElementById(
      'incomeResult'
    );


  if (!container) {
    return;
  }


  if (!data) {
    return;
  }


  container.innerHTML = `

    <div class="transaction-success-title">
      ✅ Pemasukan Berhasil Disimpan
    </div>

    <div class="transaction-id">
      ${escapeHtml(
        data.idTransaksi || '-'
      )}
    </div>

    <div class="transaction-detail-grid">

      <div class="transaction-detail">

        <span>
          Tanggal
        </span>

        <strong>
          ${escapeHtml(
            data.tanggal || '-'
          )}
        </strong>

      </div>


      <div class="transaction-detail">

        <span>
          Nominal
        </span>

        <strong>
          ${formatRupiah(
            data.nominal
          )}
        </strong>

      </div>


      <div class="transaction-detail">

        <span>
          Kategori
        </span>

        <strong>
          ${escapeHtml(
            data.kategori || '-'
          )}
        </strong>

      </div>


      <div class="transaction-detail">

        <span>
          Kas Pokja 30%
        </span>

        <strong>
          ${formatRupiah(
            data.alokasiKasPokja
          )}
        </strong>

      </div>


      <div class="transaction-detail">

        <span>
          Kas Penggajian 70%
        </span>

        <strong>
          ${formatRupiah(
            data.alokasiKasPenggajian
          )}
        </strong>

      </div>


      <div class="transaction-detail">

        <span>
          Status
        </span>

        <strong>
          TERSIMPAN
        </strong>

      </div>

    </div>
  `;


  container.classList.add(
    'show'
  );


  container.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
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


/* =========================================================
   INISIALISASI FORM PEMASUKAN
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  function() {

    setDefaultIncomeDate();

    updateIncomePreview();

  }
);
// =====================================================
// RIWAYAT TRANSAKSI
// =====================================================

async function loadTransactionHistory() {

  const typeElement =
    document.getElementById('historyType');

  const monthElement =
    document.getElementById('historyMonth');

  const yearElement =
    document.getElementById('historyYear');

  const type =
    typeElement
      ? typeElement.value
      : 'SEMUA';

  const month =
    monthElement
      ? monthElement.value
      : '';

  const year =
    yearElement
      ? yearElement.value
      : '';


  const statusElement =
    document.getElementById(
      'historyStatus'
    );

  const tableBody =
    document.getElementById(
      'historyTableBody'
    );


  if (statusElement) {
    statusElement.textContent =
      'Memuat transaksi...';
  }


  try {

    let url =
      API_URL +
      '?action=transactions' +
      '&tipe=' +
      encodeURIComponent(type);


    if (month) {

      url +=
        '&bulan=' +
        encodeURIComponent(month);

    }


    if (year) {

      url +=
        '&tahun=' +
        encodeURIComponent(year);

    }


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        'HTTP Error ' +
        response.status
      );

    }


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message ||
        'Gagal mengambil riwayat transaksi.'
      );

    }


    const data =
      result.data || {};


    renderTransactionHistory(
      data
    );


  } catch (error) {

    console.error(
      'loadTransactionHistory:',
      error
    );


    if (statusElement) {

      statusElement.textContent =
        'Gagal memuat transaksi.';

    }


    if (tableBody) {

      tableBody.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="empty-state"
          >
            ❌ Gagal mengambil data transaksi.
          </td>
        </tr>
      `;

    }

  }

}


// =====================================================
// RENDER RIWAYAT TRANSAKSI
// =====================================================

function renderTransactionHistory(data) {

  const transactions =
    Array.isArray(data.transaksi)
      ? data.transaksi
      : [];


  const countElement =
    document.getElementById(
      'historyTransactionCount'
    );

  const incomeElement =
    document.getElementById(
      'historyTotalIncome'
    );

  const expenseElement =
    document.getElementById(
      'historyTotalExpense'
    );

  const statusElement =
    document.getElementById(
      'historyStatus'
    );

  const tableBody =
    document.getElementById(
      'historyTableBody'
    );


  // -----------------------------------------------
  // RINGKASAN
  // -----------------------------------------------

  if (countElement) {

    countElement.textContent =
      Number(data.jumlah || 0);

  }


  if (incomeElement) {

    incomeElement.textContent =
      formatRupiah(
        Number(
          data.totalPemasukan || 0
        )
      );

  }


  if (expenseElement) {

    expenseElement.textContent =
      formatRupiah(
        Number(
          data.totalPengeluaran || 0
        )
      );

  }


  // -----------------------------------------------
  // TABEL
  // -----------------------------------------------

  if (!tableBody) {
    return;
  }


  if (transactions.length === 0) {

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty-state"
        >
          📭 Belum ada transaksi.
        </td>
      </tr>
    `;


    if (statusElement) {

      statusElement.textContent =
        'Tidak ada transaksi pada filter yang dipilih.';

    }

    return;

  }


  tableBody.innerHTML =
    transactions
      .map(function(item, index) {

        const isIncome =
          item.jenis === 'PEMASUKAN';


        const jenisLabel =
          isIncome
            ? '💰 Pemasukan'
            : '💸 Pengeluaran';


        return `

          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${escapeHtml(
                item.idTransaksi || '-'
              )}
            </td>

            <td>
              ${escapeHtml(
                item.tanggal || '-'
              )}
            </td>

            <td>
              <span class="${
                isIncome
                  ? 'transaction-income'
                  : 'transaction-expense'
              }">
                ${jenisLabel}
              </span>
            </td>

            <td>
              ${escapeHtml(
                item.kategori || '-'
              )}
            </td>

            <td>
              ${escapeHtml(
                item.deskripsi || '-'
              )}
            </td>

            <td>
              <strong>
                ${formatRupiah(
                  Number(
                    item.nominal || 0
                  )
                )}
              </strong>
            </td>

          </tr>

        `;

      })
      .join('');


  if (statusElement) {

    statusElement.textContent =
      transactions.length +
      ' transaksi ditemukan.';

  }

}
/* =========================================================
   MODUL PENGGAJIAN
   ========================================================= */

async function loadSalaryList() {

  const statusElement =
    document.getElementById('salaryStatus');

  const tableBody =
    document.getElementById('salaryTableBody');

  if (statusElement) {
    statusElement.textContent =
      'Memuat data penggajian...';
  }

  try {

    const result =
      await apiGet('salaryList');

    const data =
      result.data || {};

    renderSalaryList(data);

  } catch (error) {

    console.error(
      'SALARY LIST ERROR:',
      error
    );

    if (statusElement) {
      statusElement.textContent =
        'Gagal memuat data penggajian.';
    }

    if (tableBody) {

      tableBody.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="empty-state"
          >
            ❌ Gagal mengambil data penggajian.
          </td>
        </tr>
      `;

    }

  }

}


/* =========================================================
   RENDER DAFTAR GAJI
   ========================================================= */

function renderSalaryList(data) {

  const employees =
    Array.isArray(data.pegawai)
      ? data.pegawai
      : [];

  setText(
    'salaryKasPenggajian',
    formatRupiah(
      data.kasPenggajian || 0
    )
  );

  setText(
    'salaryTotalPoin',
    formatNumber(
      data.totalPoin || 0
    )
  );

  setText(
    'salaryPointValue',
    formatRupiah(
      data.nilaiPerPoin || 0
    )
  );

  setText(
    'salaryTotal',
    formatRupiah(
      data.totalGaji || 0
    )
  );

  setText(
    'salaryRemaining',
    formatRupiah(
      data.sisaKasSetelahSimulasi || 0
    )
  );

  setText(
    'salaryEmployeeCount',
    formatNumber(
      data.jumlahPegawai || employees.length
    )
  );


  const tableBody =
    document.getElementById(
      'salaryTableBody'
    );

  if (!tableBody) {
    return;
  }


  if (employees.length === 0) {

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty-state"
        >
          📭 Belum ada data pegawai.
        </td>
      </tr>
    `;

    return;

  }


  tableBody.innerHTML =
    employees.map(
      function(employee, index) {

        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${escapeHtml(
                employee.id || '-'
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  employee.nama || '-'
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                employee.jabatan || '-'
              )}
            </td>

            <td>
              ${formatNumber(
                employee.poin || 0
              )}
            </td>

            <td>
              ${formatRupiah(
                employee.gaji || 0
              )}
            </td>

            <td>
              <span class="salary-status">
                ${escapeHtml(
                  employee.status ||
                  'Belum Dibayar'
                )}
              </span>
            </td>

          </tr>
        `;

      }
    ).join('');

}


/* =========================================================
   SIMULASI / BAYAR SEMUA GAJI
   ========================================================= */

async function payAllSalaries() {

  const periodeElement =
    document.getElementById(
      'salaryPeriod'
    );

  const periode =
    periodeElement
      ? periodeElement.value
      : '';


  if (!periode) {

    showToast(
      'Periode pembayaran wajib dipilih.'
    );

    return;

  }


  const confirmed =
    window.confirm(
      'Apakah Anda yakin ingin membayar seluruh gaji untuk periode ' +
      periode +
      '?'
    );


  if (!confirmed) {
    return;
  }


  const button =
    document.getElementById(
      'payAllSalaryButton'
    );

  const buttonText =
    document.getElementById(
      'payAllSalaryText'
    );


  try {

    if (button) {
      button.disabled = true;
    }

    if (buttonText) {
      buttonText.textContent =
        '⏳ Memproses...';
    }


    const result =
      await apiPost({

        action:
          'payAllSalaries',

        periode:
          periode

      });


    renderPaymentResult(
      result
    );


    showToast(
      'Pembayaran gaji berhasil.'
    );


    /*
     * Setelah pembayaran,
     * dashboard dan daftar gaji
     * mengambil data terbaru.
     */

    await loadDashboard();

    await loadSalaryList();


  } catch (error) {

    console.error(
      'PAY ALL SALARIES ERROR:',
      error
    );

    showToast(
      error.message ||
      'Pembayaran gaji gagal.',
      5000
    );


  } finally {

    if (button) {
      button.disabled = false;
    }

    if (buttonText) {
      buttonText.textContent =
        '💰 Bayar Semua Gaji';
    }

  }

}


/* =========================================================
   HASIL PEMBAYARAN
   ========================================================= */

function renderPaymentResult(result) {

  const container =
    document.getElementById(
      'salaryPaymentResult'
    );

  if (!container || !result) {
    return;
  }


  const data =
    result || {};


  container.innerHTML = `

    <div class="transaction-success-title">
      ✅ Pembayaran Gaji Berhasil
    </div>

    <div class="transaction-detail-grid">

      <div class="transaction-detail">
        <span>Periode</span>
        <strong>
          ${escapeHtml(
            data.periode || '-'
          )}
        </strong>
      </div>

      <div class="transaction-detail">
        <span>Jumlah Pegawai</span>
        <strong>
          ${formatNumber(
            data.jumlahPegawai || 0
          )}
        </strong>
      </div>

      <div class="transaction-detail">
        <span>Total Poin</span>
        <strong>
          ${formatNumber(
            data.totalPoin || 0
          )}
        </strong>
      </div>

      <div class="transaction-detail">
        <span>Kas Penggajian</span>
        <strong>
          ${formatRupiah(
            data.kasPenggajian || 0
          )}
        </strong>
      </div>

      <div class="transaction-detail">
        <span>Total Gaji</span>
        <strong>
          ${formatRupiah(
            data.totalGaji || 0
          )}
        </strong>
      </div>

      <div class="transaction-detail">
        <span>Sisa Kas</span>
        <strong>
          ${formatRupiah(
            data.sisaKas || 0
          )}
        </strong>
      </div>

    </div>
  `;

  container.classList.add('show');

}
