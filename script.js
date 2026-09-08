/* ================================================================
   KEUANGAN POKJA PENGELOLAAN SAMPAH ADIWIYATA
   SCRIPT.JS
   ================================================================
   
   FRONTEND :
   GitHub Pages

   BACKEND :
   Google Apps Script Web App

   DATABASE :
   Google Spreadsheet

   TIMEZONE :
   Asia/Jakarta

   ================================================================ */


/* ================================================================
   KONFIGURASI
   ================================================================ */

const CONFIG = {

    /*
     * GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT
     *
     * Contoh:
     * https://script.google.com/macros/s/XXXXXXXXXXXX/exec
     */
    API_URL:
        'https://script.google.com/macros/s/AKfycby8HssHrbPp7Njhy9TpP9kC3fOSx1MTNmontcdN3H_v57txKJNc5llC1nrvXr0WPqtt/exec',

    TIMEZONE:
        'Asia/Jakarta',

    REFRESH_INTERVAL:
        30000,

    SOURCES: [
        'Penjualan Sampah Botol/Plastik',
        'Penjualan Pupuk Cair/Kompos',
        'Bantuan Pemerintah',
        'Bantuan Sekolah',
        'Sponsor'
    ]

};


/* ================================================================
   STATE APLIKASI
   ================================================================ */

const APP = {

    dashboard: null,

    income: [],

    expenses: [],

    employees: [],

    payroll: [],

    history: [],

    currentPayrollMonth: '',

    loading: false,

    initialized: false,

    refreshTimer: null

};


/* ================================================================
   DOM HELPER
   ================================================================ */

function $(selector) {

    return document.querySelector(selector);

}


function $$(selector) {

    return Array.from(
        document.querySelectorAll(selector)
    );

}


/* ================================================================
   INITIALIZATION
   ================================================================ */

document.addEventListener(
    'DOMContentLoaded',
    function () {

        initializeApp();

    }
);


/* ================================================================
   INITIALIZE APP
   ================================================================ */

async function initializeApp() {

    try {

        APP.initialized = false;

        setupStaticUI();

        populateSourceDropdown();

        setupForms();

        showLoading(true);

        await loadAllData();

        APP.initialized = true;

        updateClock();

        /*
         * Jam berjalan.
         */

        setInterval(
            updateClock,
            1000
        );

        /*
         * Refresh otomatis.
         */

        startAutoRefresh();

    } catch (error) {

        console.error(
            'Initialization error:',
            error
        );

        showToast(
            error.message ||
            'Gagal memuat aplikasi.',
            'error'
        );

    } finally {

        showLoading(false);

    }

}


/* ================================================================
   STATIC UI
   ================================================================ */

function setupStaticUI() {

    /*
     * Navigation.
     */

    $$('.nav-link').forEach(
        function (button) {

            button.addEventListener(
                'click',
                function () {

                    const target =
                        button.dataset.target;

                    if (target) {

                        showSection(target);

                    }

                }
            );

        }
    );


    /*
     * Tombol refresh.
     */

    const refreshButtons = $$(
        '[data-action="refresh"]'
    );

    refreshButtons.forEach(
        function (button) {

            button.addEventListener(
                'click',
                async function () {

                    await refreshAll();

                }
            );

        }
    );


    /*
     * Tombol logout / close tidak digunakan.
     */


    /*
     * Modal close.
     */

    $$('.modal-close').forEach(
        function (button) {

            button.addEventListener(
                'click',
                function () {

                    closeModal();

                }
            );

        }
    );


    /*
     * Klik area overlay untuk menutup modal.
     */

    $$('.modal').forEach(
        function (modal) {

            modal.addEventListener(
                'click',
                function (event) {

                    if (
                        event.target === modal
                    ) {

                        closeModal();

                    }

                }
            );

        }
    );


    /*
     * Escape untuk menutup modal.
     */

    document.addEventListener(
        'keydown',
        function (event) {

            if (
                event.key === 'Escape'
            ) {

                closeModal();

            }

        }
    );


    /*
     * Filter bulan.
     */

    $$('.month-filter').forEach(
        function (element) {

            element.addEventListener(
                'change',
                function () {

                    renderAll();

                }
            );

        }
    );

}


/* ================================================================
   FORM SETUP
   ================================================================ */

function setupForms() {

    const incomeForm =
        $('#incomeForm');

    if (incomeForm) {

        incomeForm.addEventListener(
            'submit',
            handleIncomeSubmit
        );

    }


    const expenseForm =
        $('#expenseForm');

    if (expenseForm) {

        expenseForm.addEventListener(
            'submit',
            handleExpenseSubmit
        );

    }


    const employeeForm =
        $('#employeeForm');

    if (employeeForm) {

        employeeForm.addEventListener(
            'submit',
            handleEmployeeSubmit
        );

    }


    /*
     * Jika terdapat input nominal,
     * format tampilan dapat dibantu.
     */

    $$(
        'input[data-money]'
    ).forEach(
        function (input) {

            input.addEventListener(
                'input',
                function () {

                    input.value =
                        input.value.replace(
                            /[^0-9.,]/g,
                            ''
                        );

                }
            );

        }
    );

}


/* ================================================================
   SOURCE DROPDOWN
   ================================================================ */

function populateSourceDropdown() {

    const selects =
        $$(
            '#incomeSource, select[name="source"], select[name="sumber"]'
        );

    selects.forEach(
        function (select) {

            /*
             * Jangan menambahkan ulang.
             */

            if (
                select.dataset.populated === 'true'
            ) {

                return;

            }

            const existing =
                Array.from(
                    select.options
                ).map(
                    option =>
                        option.value
                );

            CONFIG.SOURCES.forEach(
                function (source) {

                    if (
                        existing.includes(source)
                    ) {

                        return;

                    }

                    const option =
                        document.createElement(
                            'option'
                        );

                    option.value =
                        source;

                    option.textContent =
                        source;

                    select.appendChild(
                        option
                    );

                }
            );

            select.dataset.populated =
                'true';

        }
    );

}


/* ================================================================
   API REQUEST
   ================================================================ */

async function apiGet(
    action,
    params = {}
) {

    if (
        !CONFIG.API_URL ||
        CONFIG.API_URL.includes(
            'GANTI_DENGAN'
        )
    ) {

        throw new Error(
            'API_URL belum diisi dengan URL Web App Google Apps Script.'
        );

    }

    const url =
        new URL(
            CONFIG.API_URL
        );

    url.searchParams.set(
        'action',
        action
    );

    Object.keys(params).forEach(
        function (key) {

            if (
                params[key] !== undefined &&
                params[key] !== null &&
                params[key] !== ''
            ) {

                url.searchParams.set(
                    key,
                    params[key]
                );

            }

        }
    );

    const response =
        await fetch(
            url.toString(),
            {
                method: 'GET',
                cache: 'no-store',
                redirect: 'follow'
            }
        );

    if (!response.ok) {

        throw new Error(
            'HTTP Error ' +
            response.status
        );

    }

    const data =
        await response.json();

    if (
        data &&
        data.success === false
    ) {

        throw new Error(
            data.error ||
            'Terjadi kesalahan pada server.'
        );

    }

    return data;

}


/* ================================================================
   API POST
   ================================================================ */

async function apiPost(
    action,
    payload = {}
) {

    if (
        !CONFIG.API_URL ||
        CONFIG.API_URL.includes(
            'GANTI_DENGAN'
        )
    ) {

        throw new Error(
            'API_URL belum diisi dengan URL Web App Google Apps Script.'
        );

    }

    /*
     * Menggunakan URLSearchParams.
     *
     * Keuntungannya:
     * tidak memerlukan custom Content-Type
     * sehingga lebih aman untuk Web App Apps Script
     * dari GitHub Pages.
     */

    const body =
        new URLSearchParams();

    body.set(
        'action',
        action
    );

    Object.keys(payload).forEach(
        function (key) {

            if (
                payload[key] !== undefined &&
                payload[key] !== null
            ) {

                body.set(
                    key,
                    String(payload[key])
                );

            }

        }
    );

    const response =
        await fetch(
            CONFIG.API_URL,
            {
                method: 'POST',
                body: body,
                redirect: 'follow'
            }
        );

    if (!response.ok) {

        throw new Error(
            'HTTP Error ' +
            response.status
        );

    }

    const data =
        await response.json();

    if (
        data &&
        data.success === false
    ) {

        throw new Error(
            data.error ||
            'Terjadi kesalahan pada server.'
        );

    }

    return data;

}


/* ================================================================
   LOAD ALL DATA
   ================================================================ */

async function loadAllData() {

    showLoading(true);

    try {

        const results =
            await Promise.all([

                apiGet(
                    'getDashboard'
                ),

                apiGet(
                    'getIncome'
                ),

                apiGet(
                    'getExpenses'
                ),

                apiGet(
                    'getEmployees'
                ),

                apiGet(
                    'getPayroll'
                ),

                apiGet(
                    'getHistory'
                ),

                apiGet(
                    'getCash'
                )

            ]);

        APP.dashboard =
            results[0]?.data || {};

        APP.income =
            results[1]?.data || [];

        APP.expenses =
            results[2]?.data || [];

        APP.employees =
            results[3]?.data || [];

        APP.payroll =
            results[4]?.data || [];

        APP.history =
            results[5]?.data || [];

        /*
         * Pastikan dashboard memakai
         * data kas terbaru.
         */

        if (
            results[6] &&
            results[6].data
        ) {

            APP.dashboard =
                Object.assign(
                    {},
                    APP.dashboard,
                    results[6].data
                );

        }

        renderAll();

    } catch (error) {

        console.error(
            'Load data error:',
            error
        );

        showToast(
            error.message ||
            'Gagal mengambil data.',
            'error'
        );

        throw error;

    } finally {

        showLoading(false);

    }

}


/* ================================================================
   REFRESH ALL
   ================================================================ */

async function refreshAll() {

    if (APP.loading) {
        return;
    }

    try {

        await loadAllData();

        showToast(
            'Data berhasil diperbarui.',
            'success'
        );

    } catch (error) {

        console.error(error);

    }

}


/* ================================================================
   AUTO REFRESH
   ================================================================ */

function startAutoRefresh() {

    if (
        APP.refreshTimer
    ) {

        clearInterval(
            APP.refreshTimer
        );

    }

    APP.refreshTimer =
        setInterval(
            async function () {

                if (
                    document.hidden
                ) {

                    return;

                }

                try {

                    await loadAllData();

                } catch (error) {

                    console.warn(
                        'Auto refresh gagal:',
                        error
                    );

                }

            },
            CONFIG.REFRESH_INTERVAL
        );

}


/* ================================================================
   RENDER ALL
   ================================================================ */

function renderAll() {

    renderDashboard();

    renderIncome();

    renderExpenses();

    renderEmployees();

    renderPayroll();

    renderCash();

    renderHistory();

    updateMonthFilters();

}


/* ================================================================
   DASHBOARD
   ================================================================ */

function renderDashboard() {

    const data =
        APP.dashboard || {};


    /*
     * Total pemasukan.
     */

    setText(
        [
            '#totalIncome',
            '#dashboardIncome',
            '[data-stat="income"]'
        ],
        formatRupiah(
            data.totalPemasukan
        )
    );


    /*
     * 30% Kas Pokja.
     */

    setText(
        [
            '#totalCashAllocation',
            '#dashboardCash',
            '[data-stat="cash-allocation"]'
        ],
        formatRupiah(
            data.totalAlokasiKas
        )
    );


    /*
     * Pengeluaran.
     */

    setText(
        [
            '#totalExpense',
            '#dashboardExpense',
            '[data-stat="expense"]'
        ],
        formatRupiah(
            data.totalPengeluaran
        )
    );


    /*
     * Saldo kas.
     */

    setText(
        [
            '#cashBalance',
            '#dashboardBalance',
            '[data-stat="balance"]'
        ],
        formatRupiah(
            data.saldoKas
        )
    );


    /*
     * Dana penggajian.
     */

    setText(
        [
            '#payrollFund',
            '#dashboardPayroll',
            '[data-stat="payroll"]'
        ],
        formatRupiah(
            data.totalDanaPenggajian
        )
    );


    /*
     * Jumlah pegawai.
     */

    setText(
        [
            '#employeeCount',
            '[data-stat="employees"]'
        ],
        numberFormat(
            data.totalPegawai
        )
    );


    /*
     * Total poin.
     */

    setText(
        [
            '#totalPoints',
            '[data-stat="points"]'
        ],
        numberFormat(
            data.totalPoin
        )
    );


    /*
     * Tanggal hari ini.
     */

    setText(
        [
            '#todayDate',
            '#currentDate',
            '[data-current-date]'
        ],
        formatDateOnly(
            new Date()
        )
    );


    updateCashStatus(
        Number(
            data.saldoKas || 0
        )
    );

}


/* ================================================================
   CASH STATUS
   ================================================================ */

function updateCashStatus(
    balance
) {

    const elements =
        $$(
            '[data-cash-status]'
        );

    elements.forEach(
        function (element) {

            element.classList.remove(
                'cash-positive',
                'cash-zero',
                'cash-negative'
            );

            if (
                balance > 0
            ) {

                element.classList.add(
                    'cash-positive'
                );

                element.textContent =
                    'Kas tersedia';

            } else if (
                balance === 0
            ) {

                element.classList.add(
                    'cash-zero'
                );

                element.textContent =
                    'Kas kosong';

            } else {

                element.classList.add(
                    'cash-negative'
                );

                element.textContent =
                    'Perlu perhatian';

            }

        }
    );

}


/* ================================================================
   RENDER INCOME
   ================================================================ */

function renderIncome() {

    const tbody =
        firstElement([
            '#incomeTableBody',
            '#pemasukanTableBody',
            '#incomeTable tbody'
        ]);

    if (!tbody) {
        return;
    }

    const data =
        getFilteredIncome();

    if (!data.length) {

        tbody.innerHTML =
            emptyTableRow(
                7,
                'Belum ada data pemasukan.'
            );

        return;

    }

    tbody.innerHTML =
        data.map(
            function (item, index) {

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(item.tanggal || '-')}</td>
                        <td>${formatRupiah(item.nominal)}</td>
                        <td>${escapeHtml(item.sumber || '-')}</td>
                        <td>${formatRupiah(item.kasPokja)}</td>
                        <td>${formatRupiah(item.penggajian)}</td>
                        <td>${escapeHtml(item.bulan || '-')}</td>
                    </tr>
                `;

            }
        ).join('');

}


/* ================================================================
   RENDER EXPENSES
   ================================================================ */

function renderExpenses() {

    const tbody =
        firstElement([
            '#expenseTableBody',
            '#pengeluaranTableBody',
            '#expenseTable tbody'
        ]);

    if (!tbody) {
        return;
    }

    const data =
        getFilteredExpenses();

    if (!data.length) {

        tbody.innerHTML =
            emptyTableRow(
                5,
                'Belum ada data pengeluaran.'
            );

        return;

    }

    tbody.innerHTML =
        data.map(
            function (item, index) {

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(item.tanggal || '-')}</td>
                        <td>${formatRupiah(item.nominal)}</td>
                        <td class="description-cell">
                            ${escapeHtml(item.deskripsi || '-')}
                        </td>
                        <td>${escapeHtml(item.bulan || '-')}</td>
                    </tr>
                `;

            }
        ).join('');

}


/* ================================================================
   RENDER EMPLOYEES
   ================================================================ */

function renderEmployees() {

    const tbody =
        firstElement([
            '#employeeTableBody',
            '#pegawaiTableBody',
            '#employeeTable tbody'
        ]);

    if (!tbody) {
        return;
    }

    if (!APP.employees.length) {

        tbody.innerHTML =
            emptyTableRow(
                6,
                'Belum ada data pegawai.'
            );

        return;

    }

    tbody.innerHTML =
        APP.employees.map(
            function (employee, index) {

                return `
                    <tr>
                        <td>${escapeHtml(
                            employee.no ||
                            index + 1
                        )}</td>

                        <td>
                            ${escapeHtml(
                                employee.jabatan ||
                                '-'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                employee.nama ||
                                'Belum diisi'
                            )}
                        </td>

                        <td>
                            ${numberFormat(
                                employee.poin
                            )}
                        </td>

                        <td>
                            <button
                                type="button"
                                class="btn-small"
                                data-edit-employee="${employee.row}">
                                Edit
                            </button>
                        </td>
                    </tr>
                `;

            }
        ).join('');


    /*
     * Tombol edit.
     */

    $$(
        '[data-edit-employee]'
    ).forEach(
        function (button) {

            button.addEventListener(
                'click',
                function () {

                    const row =
                        Number(
                            button.dataset.editEmployee
                        );

                    openEmployeeEditor(
                        row
                    );

                }
            );

        }
    );


    /*
     * Total pegawai.
     */

    setText(
        [
            '#employeeTotal',
            '[data-employee-total]'
        ],
        numberFormat(
            APP.employees.length
        )
    );


    /*
     * Total poin.
     */

    const totalPoints =
        APP.employees.reduce(
            function (sum, employee) {

                return sum +
                    Number(
                        employee.poin || 0
                    );

            },
            0
        );

    setText(
        [
            '#employeePoints',
            '[data-employee-points]'
        ],
        numberFormat(
            totalPoints
        )
    );

}


/* ================================================================
   RENDER PAYROLL
   ================================================================ */

function renderPayroll() {

    const tbody =
        firstElement([
            '#payrollTableBody',
            '#penggajianTableBody',
            '#payrollTable tbody'
        ]);

    if (!tbody) {
        return;
    }

    const selectedMonth =
        getSelectedPayrollMonth();

    let rows = [];

    if (
        selectedMonth
    ) {

        const monthData =
            APP.payroll.find(
                function (item) {

                    return item.bulan ===
                        selectedMonth;

                }
            );

        if (monthData) {

            rows =
                monthData.pegawai.map(
                    function (employee) {

                        return {

                            bulan:
                                monthData.bulan,

                            totalPemasukan:
                                monthData.totalPemasukan,

                            dana70:
                                monthData.dana70,

                            totalPoin:
                                monthData.totalPoin,

                            nilai1Poin:
                                monthData.nilai1Poin,

                            jabatan:
                                employee.jabatan,

                            nama:
                                employee.nama,

                            poin:
                                employee.poin,

                            gaji:
                                employee.gaji,

                            status:
                                employee.status

                        };

                    }
                );

        }

    } else {

        /*
         * Jika belum memilih bulan,
         * tampilkan bulan terbaru.
         */

        if (
            APP.payroll.length
        ) {

            const latest =
                APP.payroll[0];

            rows =
                latest.pegawai.map(
                    function (employee) {

                        return {

                            bulan:
                                latest.bulan,

                            totalPemasukan:
                                latest.totalPemasukan,

                            dana70:
                                latest.dana70,

                            totalPoin:
                                latest.totalPoin,

                            nilai1Poin:
                                latest.nilai1Poin,

                            jabatan:
                                employee.jabatan,

                            nama:
                                employee.nama,

                            poin:
                                employee.poin,

                            gaji:
                                employee.gaji,

                            status:
                                employee.status

                        };

                    }
                );

            updatePayrollSummary(
                latest
            );

        }

    }


    if (!rows.length) {

        tbody.innerHTML =
            emptyTableRow(
                9,
                'Belum ada data penggajian.'
            );

        return;

    }


    tbody.innerHTML =
        rows.map(
            function (item, index) {

                return `
                    <tr>
                        <td>${index + 1}</td>

                        <td>
                            ${escapeHtml(
                                item.bulan || '-'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.jabatan || '-'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.nama ||
                                'Belum diisi'
                            )}
                        </td>

                        <td>
                            ${numberFormat(
                                item.poin
                            )}
                        </td>

                        <td>
                            ${formatRupiah(
                                item.nilai1Poin
                            )}
                        </td>

                        <td>
                            ${formatRupiah(
                                item.gaji
                            )}
                        </td>

                        <td>
                            <span class="status-badge">
                                ${escapeHtml(
                                    item.status ||
                                    '-'
                                )}
                            </span>
                        </td>
                    </tr>
                `;

            }
        ).join('');

}


/* ================================================================
   PAYROLL SUMMARY
   ================================================================ */

function updatePayrollSummary(
    month
) {

    if (!month) {
        return;
    }

    setText(
        [
            '#payrollMonth',
            '[data-payroll-month]'
        ],
        month.bulan || '-'
    );

    setText(
        [
            '#payrollIncome',
            '[data-payroll-income]'
        ],
        formatRupiah(
            month.totalPemasukan
        )
    );

    setText(
        [
            '#payroll70',
            '#payrollFundMonth',
            '[data-payroll-fund]'
        ],
        formatRupiah(
            month.dana70
        )
    );

    setText(
        [
            '#payrollTotalPoints',
            '[data-payroll-points]'
        ],
        numberFormat(
            month.totalPoin
        )
    );

    setText(
        [
            '#payrollPointValue',
            '[data-point-value]'
        ],
        formatRupiah(
            month.nilai1Poin
        )
    );

}


/* ================================================================
   RENDER CASH
   ================================================================ */

function renderCash() {

    const data =
        APP.dashboard || {};

    setText(
        [
            '#cashIncome',
            '[data-cash-income]'
        ],
        formatRupiah(
            data.totalPemasukan
        )
    );

    setText(
        [
            '#cashAllocation',
            '[data-cash-allocation]'
        ],
        formatRupiah(
            data.totalAlokasiKas
        )
    );

    setText(
        [
            '#cashExpense',
            '[data-cash-expense]'
        ],
        formatRupiah(
            data.totalPengeluaran
        )
    );

    setText(
        [
            '#cashBalance',
            '#cashRemaining',
            '[data-cash-balance]'
        ],
        formatRupiah(
            data.saldoKas
        )
    );

    setText(
        [
            '#cashPayroll',
            '[data-cash-payroll]'
        ],
        formatRupiah(
            data.totalDanaPenggajian
        )
    );

}


/* ================================================================
   RENDER HISTORY
   ================================================================ */

function renderHistory() {

    const tbody =
        firstElement([
            '#historyTableBody',
            '#riwayatTableBody',
            '#historyTable tbody'
        ]);

    if (!tbody) {
        return;
    }

    const data =
        getFilteredHistory();

    if (!data.length) {

        tbody.innerHTML =
            emptyTableRow(
                7,
                'Belum ada riwayat transaksi.'
            );

        return;

    }

    tbody.innerHTML =
        data.map(
            function (item, index) {

                const typeClass =
                    item.jenis === 'PEMASUKAN'
                        ? 'income'
                        : 'expense';

                return `
                    <tr>
                        <td>${index + 1}</td>

                        <td>
                            ${escapeHtml(
                                item.tanggal || '-'
                            )}
                        </td>

                        <td>
                            <span class="transaction-type ${typeClass}">
                                ${escapeHtml(
                                    item.jenis || '-'
                                )}
                            </span>
                        </td>

                        <td>
                            ${formatRupiah(
                                item.nominal
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.keterangan ||
                                '-'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.alokasi ||
                                '-'
                            )}
                        </td>

                        <td>
                            ${formatRupiah(
                                item.saldoKas
                            )}
                        </td>
                    </tr>
                `;

            }
        ).join('');

}


/* ================================================================
   FILTER DATA
   ================================================================ */

function getSelectedMonth() {

    const filter =
        firstElement([
            '#monthFilter',
            '.month-filter'
        ]);

    if (!filter) {
        return '';
    }

    return filter.value || '';

}


function getSelectedPayrollMonth() {

    const filter =
        firstElement([
            '#payrollMonthFilter',
            '#monthPayrollFilter',
            '[data-payroll-month-filter]'
        ]);

    if (!filter) {

        return APP.payroll.length
            ? APP.payroll[0].bulan
            : '';

    }

    return filter.value || '';

}


function getFilteredIncome() {

    const month =
        getSelectedMonth();

    if (!month) {
        return APP.income;
    }

    return APP.income.filter(
        function (item) {

            return item.bulan === month;

        }
    );

}


function getFilteredExpenses() {

    const month =
        getSelectedMonth();

    if (!month) {
        return APP.expenses;
    }

    return APP.expenses.filter(
        function (item) {

            return item.bulan === month;

        }
    );

}


function getFilteredHistory() {

    const month =
        getSelectedMonth();

    if (!month) {
        return APP.history;
    }

    return APP.history.filter(
        function (item) {

            return getMonthFromDateString(
                item.tanggal
            ) === month;

        }
    );

}


/* ================================================================
   UPDATE MONTH FILTERS
   ================================================================ */

function updateMonthFilters() {

    const months =
        new Set();

    APP.income.forEach(
        function (item) {

            if (item.bulan) {
                months.add(
                    item.bulan
                );
            }

        }
    );

    APP.expenses.forEach(
        function (item) {

            if (item.bulan) {
                months.add(
                    item.bulan
                );
            }

        }
    );

    APP.payroll.forEach(
        function (item) {

            if (item.bulan) {
                months.add(
                    item.bulan
                );
            }

        }
    );

    APP.history.forEach(
        function (item) {

            const month =
                getMonthFromDateString(
                    item.tanggal
                );

            if (month) {
                months.add(month);
            }

        }
    );

    const sortedMonths =
        Array.from(months)
            .sort()
            .reverse();


    $$('.month-filter').forEach(
        function (select) {

            const current =
                select.value;

            const isPayroll =
                select.matches(
                    '#payrollMonthFilter, #monthPayrollFilter, [data-payroll-month-filter]'
                );

            select.innerHTML = '';

            if (!isPayroll) {

                const allOption =
                    document.createElement(
                        'option'
                    );

                allOption.value =
                    '';

                allOption.textContent =
                    'Semua Bulan';

                select.appendChild(
                    allOption
                );

            }

            sortedMonths.forEach(
                function (month) {

                    const option =
                        document.createElement(
                            'option'
                        );

                    option.value =
                        month;

                    option.textContent =
                        formatMonthLabel(
                            month
                        );

                    select.appendChild(
                        option
                    );

                }
            );


            if (
                current &&
                sortedMonths.includes(
                    current
                )
            ) {

                select.value =
                    current;

            } else if (
                isPayroll &&
                sortedMonths.length
            ) {

                select.value =
                    sortedMonths[0];

            } else {

                select.value =
                    '';

            }

        }
    );

}


/* ================================================================
   SUBMIT PEMASUKAN
   ================================================================ */

async function handleIncomeSubmit(
    event
) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const formData =
        new FormData(form);

    const nominal =
        formData.get('nominal');

    const source =
        formData.get('source') ||
        formData.get('sumber') ||
        formData.get('sumberDana');

    const date =
        formData.get('date') ||
        formData.get('tanggal') ||
        '';


    if (
        parseMoney(nominal) <= 0
    ) {

        showToast(
            'Nominal pemasukan harus lebih dari 0.',
            'error'
        );

        return;

    }

    if (!source) {

        showToast(
            'Silakan pilih sumber dana.',
            'error'
        );

        return;

    }


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    setButtonLoading(
        submitButton,
        true,
        'Menyimpan...'
    );

    try {

        await apiPost(
            'addIncome',
            {
                date:
                    date,

                nominal:
                    parseMoney(nominal),

                source:
                    source
            }
        );

        form.reset();

        setDefaultDate(
            form
        );

        await loadAllData();

        showToast(
            'Pemasukan berhasil disimpan.',
            'success'
        );

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            'Gagal menyimpan pemasukan.',
            'error'
        );

    } finally {

        setButtonLoading(
            submitButton,
            false
        );

    }

}


/* ================================================================
   SUBMIT PENGELUARAN
   ================================================================ */

async function handleExpenseSubmit(
    event
) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const formData =
        new FormData(form);

    const nominal =
        formData.get('nominal');

    const description =
        formData.get('description') ||
        formData.get('deskripsi');

    const date =
        formData.get('date') ||
        formData.get('tanggal') ||
        '';


    if (
        parseMoney(nominal) <= 0
    ) {

        showToast(
            'Nominal pengeluaran harus lebih dari 0.',
            'error'
        );

        return;

    }

    if (
        !String(description || '').trim()
    ) {

        showToast(
            'Deskripsi pengeluaran wajib diisi.',
            'error'
        );

        return;

    }


    if (
        countWords(description) > 500
    ) {

        showToast(
            'Deskripsi maksimal 500 kata.',
            'error'
        );

        return;

    }


    const balance =
        Number(
            APP.dashboard?.saldoKas ||
            0
        );

    if (
        parseMoney(nominal) >
        balance
    ) {

        showToast(
            'Saldo Kas Pokja tidak mencukupi.',
            'error'
        );

        return;

    }


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    setButtonLoading(
        submitButton,
        true,
        'Menyimpan...'
    );

    try {

        await apiPost(
            'addExpense',
            {
                date:
                    date,

                nominal:
                    parseMoney(nominal),

                description:
                    String(
                        description
                    ).trim()
            }
        );

        form.reset();

        setDefaultDate(
            form
        );

        await loadAllData();

        showToast(
            'Pengeluaran berhasil disimpan.',
            'success'
        );

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            'Gagal menyimpan pengeluaran.',
            'error'
        );

    } finally {

        setButtonLoading(
            submitButton,
            false
        );

    }

}


/* ================================================================
   EMPLOYEE EDITOR
   ================================================================ */

function openEmployeeEditor(
    row
) {

    const employee =
        APP.employees.find(
            function (item) {

                return Number(item.row) ===
                    Number(row);

            }
        );

    if (!employee) {

        showToast(
            'Data pegawai tidak ditemukan.',
            'error'
        );

        return;

    }

    const name =
        prompt(
            'Masukkan nama pegawai:',
            employee.nama || ''
        );

    if (
        name === null
    ) {

        return;

    }

    const trimmed =
        name.trim();

    if (!trimmed) {

        showToast(
            'Nama pegawai tidak boleh kosong.',
            'error'
        );

        return;

    }

    saveEmployee(
        employee.row,
        trimmed
    );

}


/* ================================================================
   SAVE EMPLOYEE
   ================================================================ */

async function saveEmployee(
    row,
    name
) {

    try {

        showLoading(true);

        await apiPost(
            'updateEmployee',
            {
                row:
                    row,

                name:
                    name
            }
        );

        await loadAllData();

        showToast(
            'Nama pegawai berhasil diperbarui.',
            'success'
        );

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            'Gagal memperbarui pegawai.',
            'error'
        );

    } finally {

        showLoading(false);

    }

}


/* ================================================================
   EMPLOYEE FORM
   ================================================================ */

async function handleEmployeeSubmit(
    event
) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const formData =
        new FormData(form);

    const row =
        formData.get('row');

    const name =
        formData.get('name') ||
        formData.get('nama');

    if (!row) {

        showToast(
            'Baris pegawai tidak ditemukan.',
            'error'
        );

        return;

    }

    if (
        !String(name || '').trim()
    ) {

        showToast(
            'Nama pegawai wajib diisi.',
            'error'
        );

        return;

    }

    await saveEmployee(
        row,
        String(name).trim()
    );

    form.reset();

}


/* ================================================================
   SHOW SECTION
   ================================================================ */

function showSection(
    sectionId
) {

    if (!sectionId) {
        return;
    }

    const sections =
        $$(
            '[data-section]'
        );

    sections.forEach(
        function (section) {

            const active =
                section.dataset.section ===
                sectionId;

            section.classList.toggle(
                'active',
                active
            );

            section.hidden =
                !active;

        }
    );


    /*
     * Navigasi lama berbasis ID.
     */

    $$('.page-section').forEach(
        function (section) {

            if (
                section.id ===
                sectionId
            ) {

                section.classList.add(
                    'active'
                );

                section.hidden =
                    false;

            } else {

                section.classList.remove(
                    'active'
                );

            }

        }
    );


    $$('.nav-link').forEach(
        function (link) {

            link.classList.toggle(
                'active',
                link.dataset.target ===
                sectionId
            );

        }
    );

}


/* ================================================================
   MODAL
   ================================================================ */

function openModal(
    selector
) {

    const modal =
        $(selector);

    if (!modal) {
        return;
    }

    modal.classList.add(
        'open'
    );

    modal.hidden =
        false;

    document.body.classList.add(
        'modal-open'
    );

}


function closeModal() {

    $$('.modal').forEach(
        function (modal) {

            modal.classList.remove(
                'open'
            );

            modal.hidden =
                true;

        }
    );

    document.body.classList.remove(
        'modal-open'
    );

}


/* ================================================================
   LOADING
   ================================================================ */

function showLoading(
    state
) {

    APP.loading =
        Boolean(state);

    const loaders =
        $$(
            '#loadingOverlay, .loading-overlay, [data-loading]'
        );

    loaders.forEach(
        function (element) {

            element.hidden =
                !state;

            element.classList.toggle(
                'active',
                state
            );

        }
    );

}


function setButtonLoading(
    button,
    state,
    text
) {

    if (!button) {
        return;
    }

    if (state) {

        button.dataset.originalText =
            button.innerHTML;

        button.disabled =
            true;

        button.innerHTML =
            text ||
            'Memproses...';

    } else {

        button.disabled =
            false;

        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;

        }

    }

}


/* ================================================================
   TOAST
   ================================================================ */

function showToast(
    message,
    type = 'info'
) {

    let container =
        $('#toastContainer');

    if (!container) {

        container =
            document.createElement(
                'div'
            );

        container.id =
            'toastContainer';

        document.body.appendChild(
            container
        );

    }

    const toast =
        document.createElement(
            'div'
        );

    toast.className =
        'toast toast-' +
        type;

    toast.textContent =
        message;

    container.appendChild(
        toast
    );

    requestAnimationFrame(
        function () {

            toast.classList.add(
                'show'
            );

        }
    );

    setTimeout(
        function () {

            toast.classList.remove(
                'show'
            );

            setTimeout(
                function () {

                    toast.remove();

                },
                300
            );

        },
        3500
    );

}


/* ================================================================
   CLOCK
   ================================================================ */

function updateClock() {

    const now =
        new Date();

    const time =
        now.toLocaleTimeString(
            'id-ID',
            {
                timeZone:
                    CONFIG.TIMEZONE,

                hour:
                    '2-digit',

                minute:
                    '2-digit',

                second:
                    '2-digit'
            }
        );

    const date =
        now.toLocaleDateString(
            'id-ID',
            {
                timeZone:
                    CONFIG.TIMEZONE,

                weekday:
                    'long',

                day:
                    '2-digit',

                month:
                    'long',

                year:
                    'numeric'
            }
        );


    setText(
        [
            '#clock',
            '#currentTime',
            '[data-clock]'
        ],
        time
    );


    setText(
        [
            '#currentDate',
            '#todayDate',
            '[data-current-date]'
        ],
        date
    );

}


/* ================================================================
   DEFAULT DATE
   ================================================================ */

function setDefaultDate(
    form
) {

    if (!form) {
        return;
    }

    const dateInput =
        form.querySelector(
            'input[name="date"], input[name="tanggal"]'
        );

    if (!dateInput) {
        return;
    }

    /*
     * Untuk input type=date,
     * gunakan tanggal Asia/Jakarta.
     */

    const now =
        new Date();

    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone:
                    CONFIG.TIMEZONE,

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit'
            }
        ).formatToParts(now);

    const values = {};

    parts.forEach(
        function (part) {

            if (
                part.type !== 'literal'
            ) {

                values[part.type] =
                    part.value;

            }

        }
    );

    dateInput.value =
        values.year +
        '-' +
        values.month +
        '-' +
        values.day;

}


/* ================================================================
   FORMAT RUPIAH
   ================================================================ */

function formatRupiah(
    value
) {

    const number =
        Number(value) || 0;

    return new Intl.NumberFormat(
        'id-ID',
        {
            style:
                'currency',

            currency:
                'IDR',

            minimumFractionDigits:
                0,

            maximumFractionDigits:
                2
        }
    ).format(number);

}


/* ================================================================
   FORMAT NUMBER
   ================================================================ */

function numberFormat(
    value
) {

    return new Intl.NumberFormat(
        'id-ID',
        {
            maximumFractionDigits:
                2
        }
    ).format(
        Number(value) || 0
    );

}


/* ================================================================
   PARSE MONEY
   ================================================================ */

function parseMoney(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return 0;

    }

    if (
        typeof value === 'number'
    ) {

        return value;

    }

    let text =
        String(value)
            .trim()
            .replace(/\s/g, '');

    if (!text) {
        return 0;
    }


    /*
     * Indonesia:
     * 1.500.000
     * 1.500.000,50
     */

    if (
        text.includes('.') &&
        text.includes(',')
    ) {

        text =
            text
                .replace(/\./g, '')
                .replace(',', '.');

    } else if (
        text.includes('.')
    ) {

        /*
         * Titik dianggap pemisah ribuan.
         */

        text =
            text.replace(
                /\./g,
                ''
            );

    } else if (
        text.includes(',')
    ) {

        text =
            text.replace(
                ',',
                '.'
            );

    }


    text =
        text.replace(
            /[^0-9.-]/g,
            ''
        );

    const number =
        Number(text);

    return isNaN(number)
        ? 0
        : number;

}


/* ================================================================
   COUNT WORDS
   ================================================================ */

function countWords(
    text
) {

    const value =
        String(
            text || ''
        ).trim();

    if (!value) {
        return 0;
    }

    return value
        .split(/\s+/)
        .filter(
            function (word) {
                return word.length > 0;
            }
        )
        .length;

}


/* ================================================================
   DATE FORMAT
   ================================================================ */

function formatDateOnly(
    date
) {

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            timeZone:
                CONFIG.TIMEZONE,

            weekday:
                'long',

            day:
                '2-digit',

            month:
                'long',

            year:
                'numeric'
        }
    ).format(date);

}


/* ================================================================
   MONTH LABEL
   ================================================================ */

function formatMonthLabel(
    month
) {

    if (
        !month ||
        !month.includes('-')
    ) {

        return month || '-';

    }

    const parts =
        month.split('-');

    if (
        parts.length !== 2
    ) {

        return month;

    }

    const year =
        Number(parts[0]);

    const monthNumber =
        Number(parts[1]);

    if (
        !year ||
        !monthNumber
    ) {

        return month;

    }

    const date =
        new Date(
            year,
            monthNumber - 1,
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
    ).format(date);

}


/* ================================================================
   GET MONTH FROM DATE STRING
   ================================================================ */

function getMonthFromDateString(
    value
) {

    if (!value) {
        return '';
    }

    /*
     * Backend menghasilkan:
     * dd/MM/yyyy HH:mm:ss
     */

    const match =
        String(value).match(
            /^(\d{2})\/(\d{2})\/(\d{4})/
        );

    if (match) {

        return (
            match[3] +
            '-' +
            match[2]
        );

    }

    /*
     * Jika format lain.
     */

    const date =
        new Date(value);

    if (
        isNaN(
            date.getTime()
        )
    ) {

        return '';

    }

    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone:
                    CONFIG.TIMEZONE,

                year:
                    'numeric',

                month:
                    '2-digit'
            }
        ).formatToParts(date);

    let year = '';
    let month = '';

    parts.forEach(
        function (part) {

            if (
                part.type === 'year'
            ) {

                year =
                    part.value;

            }

            if (
                part.type === 'month'
            ) {

                month =
                    part.value;

            }

        }
    );

    if (
        year &&
        month
    ) {

        return (
            year +
            '-' +
            month
        );

    }

    return '';

}


/* ================================================================
   HTML ESCAPE
   ================================================================ */

function escapeHtml(
    value
) {

    return String(
        value === null ||
        value === undefined
            ? ''
            : value
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


/* ================================================================
   EMPTY TABLE ROW
   ================================================================ */

function emptyTableRow(
    colspan,
    message
) {

    return `
        <tr>
            <td
                colspan="${colspan}"
                class="empty-table">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;

}


/* ================================================================
   SET TEXT
   ================================================================ */

function setText(
    selectors,
    value
) {

    if (
        !Array.isArray(selectors)
    ) {

        selectors =
            [selectors];

    }

    for (
        let i = 0;
        i < selectors.length;
        i++
    ) {

        const elements =
            $$(selectors[i]);

        if (
            elements.length
        ) {

            elements.forEach(
                function (element) {

                    element.textContent =
                        value;

                }
            );

            return;

        }

    }

}


/* ================================================================
   FIRST ELEMENT
   ================================================================ */

function firstElement(
    selectors
) {

    for (
        let i = 0;
        i < selectors.length;
        i++
    ) {

        const element =
            $(selectors[i]);

        if (element) {
            return element;
        }

    }

    return null;

}


/* ================================================================
   EXPORT DATA
   ================================================================ */

function exportCurrentData(
    type
) {

    let data = [];
    let filename =
        'data-keuangan.csv';

    if (
        type === 'income'
    ) {

        data =
            APP.income.map(
                function (item) {

                    return [
                        item.tanggal,
                        item.nominal,
                        item.sumber,
                        item.kasPokja,
                        item.penggajian,
                        item.bulan
                    ];

                }
            );

        filename =
            'pemasukan.csv';

    } else if (
        type === 'expense'
    ) {

        data =
            APP.expenses.map(
                function (item) {

                    return [
                        item.tanggal,
                        item.nominal,
                        item.deskripsi,
                        item.bulan
                    ];

                }
            );

        filename =
            'pengeluaran.csv';

    } else if (
        type === 'history'
    ) {

        data =
            APP.history.map(
                function (item) {

                    return [
                        item.tanggal,
                        item.jenis,
                        item.nominal,
                        item.keterangan,
                        item.alokasi,
                        item.saldoKas
                    ];

                }
            );

        filename =
            'riwayat-keuangan.csv';

    } else {

        showToast(
            'Jenis data tidak dikenali.',
            'error'
        );

        return;

    }


    if (!data.length) {

        showToast(
            'Tidak ada data untuk diekspor.',
            'info'
        );

        return;

    }


    let csv =
        data.map(
            function (row) {

                return row.map(
                    function (cell) {

                        const value =
                            String(
                                cell === null ||
                                cell === undefined
                                    ? ''
                                    : cell
                            )
                            .replace(
                                /"/g,
                                '""'
                            );

                        return '"' +
                            value +
                            '"';

                    }
                ).join(',');

            }
        ).join('\n');


    const blob =
        new Blob(
            [
                '\uFEFF' +
                csv
            ],
            {
                type:
                    'text/csv;charset=utf-8;'
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            'a'
        );

    link.href =
        url;

    link.download =
        filename;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );

}


/* ================================================================
   GLOBAL HELPERS
   ================================================================ */

window.KeuanganPokja = {

    refresh:
        refreshAll,

    load:
        loadAllData,

    showSection:
        showSection,

    openModal:
        openModal,

    closeModal:
        closeModal,

    export:
        exportCurrentData,

    formatRupiah:
        formatRupiah

};


/* ================================================================
   END OF SCRIPT.JS
   ================================================================ */
