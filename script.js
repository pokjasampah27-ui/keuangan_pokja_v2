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
