```javascript
/* ================================================================
   KEUANGAN POKJA PENGELOLAAN SAMPAH ADIWIYATA
   FRONTEND JAVASCRIPT
   GitHub Pages → Google Apps Script → Google Spreadsheet

   Backend yang digunakan:
   Code.gs

   Endpoint:
   GET  ?action=...
   POST { action: ... }

   ================================================================ */


/* ================================================================
   KONFIGURASI
   ================================================================ */

const APP_CONFIG = {

    /*
     * GANTI dengan URL Web App Google Apps Script Anda.
     *
     * Contoh:
     * https://script.google.com/macros/s/XXXXXXXXXXXX/exec
     */
    API_URL:
        'https://script.google.com/macros/s/AKfycby8HssHrbPp7Njhy9TpP9kC3fOSx1MTNmontcdN3H_v57txKJNc5llC1nrvXr0WPqtt/exec',

    APP_NAME:
        'Keuangan Pokja Pengelolaan Sampah Adiwiyata',

    DEFAULT_INCOME_SOURCES: [
        'Penjualan Botol',
        'Penjualan Pupuk',
        'Bantuan Sekolah',
        'Sumbangan',
        'Proposal'
    ],

    DEFAULT_MAX_DESCRIPTION_WORDS: 300,

    CURRENCY_LOCALE: 'id-ID',

    CURRENCY_PREFIX: 'Rp ',

    REFRESH_INTERVAL:
        5 * 60 * 1000
};


/* ================================================================
   STATE APLIKASI
   ================================================================ */

const state = {

    config: null,

    dashboard: null,

    income: [],

    expense: [],

    employees: [],

    payroll: [],

    history: [],

    currentPayrollMonth: '',

    loading: false,

    initialized: false
};


/* ================================================================
   HELPER DOM
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
 * Mengambil elemen berdasarkan beberapa kemungkinan ID.
 *
 * Berguna supaya index.html nanti tetap fleksibel.
 */
function getElementByIds(...ids) {

    for (const id of ids) {

        const element =
            document.getElementById(id);

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
    initializeApp
);


async function initializeApp() {

    if (state.initialized) {
        return;
    }

    state.initialized = true;

    setupStaticEvents();

    initializeDateInputs();

    initializeDescriptionCounter();

    setCurrentDateDefaults();

    updateConnectionStatus(
        'Menghubungkan ke server...',
        'loading'
    );

    try {

        await loadAppData();

        updateConnectionStatus(
            'Terhubung',
            'online'
        );

    } catch (error) {

        console.error(
            'Initialization error:',
            error
        );

        updateConnectionStatus(
            'Gagal terhubung',
            'offline'
        );

        showToast(
            getErrorMessage(error),
            'error'
        );
    }

    /*
     * Refresh periodik.
     */
    window.setInterval(
        async function() {

            if (
                document.hidden ||
                state.loading
            ) {
                return;
            }

            try {

                await refreshDashboardOnly();

            } catch (error) {

                console.warn(
                    'Auto refresh gagal:',
                    error
                );
            }

        },
        APP_CONFIG.REFRESH_INTERVAL
    );
}


/* ================================================================
   EVENT LISTENER
   ================================================================ */

function setupStaticEvents() {

    /*
     * Form pemasukan.
     */
    const incomeForm =
        getElementByIds(
            'incomeForm',
            'formPemasukan'
        );

    if (incomeForm) {

        incomeForm.addEventListener(
            'submit',
            handleIncomeSubmit
        );
    }


    /*
     * Form pengeluaran.
     */
    const expenseForm =
        getElementByIds(
            'expenseForm',
            'formPengeluaran'
        );

    if (expenseForm) {

        expenseForm.addEventListener(
            'submit',
            handleExpenseSubmit
        );
    }


    /*
     * Input deskripsi.
     */
    const descriptionInput =
        getElementByIds(
            'expenseDescription',
            'deskripsiPengeluaran',
            'description'
        );

    if (descriptionInput) {

        descriptionInput.addEventListener(
            'input',
            updateDescriptionCounter
        );
    }


    /*
     * Filter bulan penggajian.
     */
    const payrollMonth =
        getElementByIds(
            'payrollMonth',
            'bulanPenggajian',
            'salaryMonth'
        );

    if (payrollMonth) {

        payrollMonth.addEventListener(
            'change',
            handlePayrollMonthChange
        );
    }


    /*
     * Tombol refresh.
     */
    $all(
        '[data-action="refresh"], #refreshButton, #btnRefresh'
    ).forEach(function(button) {

        button.addEventListener(
            'click',
            function() {
                loadAppData(true);
            }
        );

    });


    /*
     * Delegated event untuk tombol bayar gaji.
     */
    document.addEventListener(
        'click',
        handleGlobalClick
    );


    /*
     * Navigasi menu.
     */
    $all(
        '[data-menu], [data-section-target]'
    ).forEach(function(element) {

        element.addEventListener(
            'click',
            handleNavigationClick
        );

    });
}


/* ================================================================
   GLOBAL CLICK
   ================================================================ */

function handleGlobalClick(event) {

    const payButton =
        event.target.closest(
            '[data-pay-salary], [data-action="pay-salary"], .btn-pay-salary'
        );

    if (payButton) {

        event.preventDefault();

        handlePaySalary(payButton);

        return;
    }


    const deleteButton =
        event.target.closest(
            '[data-delete]'
        );

    if (deleteButton) {

        /*
         * Backend saat ini tidak menyediakan delete.
         * Sengaja tidak dilakukan dari frontend.
         */

        event.preventDefault();

        showToast(
            'Penghapusan transaksi tidak diaktifkan untuk menjaga keamanan data.',
            'warning'
        );
    }
}


/* ================================================================
   NAVIGASI
   ================================================================ */

function handleNavigationClick(event) {

    const element =
        event.currentTarget;

    const target =
        element.dataset.menu ||
        element.dataset.sectionTarget;

    if (!target) {
        return;
    }

    const targetElement =
        document.getElementById(target);

    if (targetElement) {

        event.preventDefault();

        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}


/* ================================================================
   LOAD APP DATA
   ================================================================ */

async function loadAppData(showLoading = false) {

    if (showLoading) {
        setGlobalLoading(true);
    }

    try {

        const result =
            await apiGet(
                'getAppData'
            );

        if (!result.success) {

            throw new Error(
                result.message ||
                'Gagal mengambil data aplikasi.'
            );
        }

        state.config =
            result.config || {};

        state.dashboard =
            result.dashboard || {};

        state.income =
            Array.isArray(result.income?.data)
                ? result.income.data
                : [];

        state.expense =
            Array.isArray(result.expense?.data)
                ? result.expense.data
                : [];

        state.employees =
            Array.isArray(result.employees?.data)
                ? result.employees.data
                : [];

        state.payroll =
            Array.isArray(result.payroll?.data)
                ? result.payroll.data
                : [];

        state.history =
            Array.isArray(result.history?.data)
                ? result.history.data
                : [];

        state.currentPayrollMonth =
            result.payroll?.month ||
            state.config.currentMonth ||
            getCurrentMonth();

        renderEverything();

        return result;

    } finally {

        if (showLoading) {
            setGlobalLoading(false);
        }
    }
}


/* ================================================================
   REFRESH DASHBOARD
   ================================================================ */

async function refreshDashboardOnly() {

    const result =
        await apiGet(
            'getDashboard'
        );

    if (!result.success) {
        throw new Error(
            result.message ||
            'Dashboard gagal diperbarui.'
        );
    }

    state.dashboard =
        result;

    renderDashboard();

    /*
     * Update data payroll juga karena pembayaran
     * dapat berubah.
     */
    await loadPayroll(
        state.currentPayrollMonth
    );

    return result;
}


/* ================================================================
   API GET
   ================================================================ */

async function apiGet(action, params = {}) {

    const url =
        buildApiUrl(
            action,
            params
        );

    const response =
        await fetch(
            url,
            {
                method: 'GET',
                cache: 'no-store'
            }
        );

    if (!response.ok) {

        throw new Error(
            'Server mengembalikan HTTP ' +
            response.status
        );
    }

    return await response.json();
}


/* ================================================================
   API POST
   ================================================================ */

async function apiPost(payload) {

    const response =
        await fetch(
            APP_CONFIG.API_URL,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'text/plain;charset=utf-8'
                },

                body:
                    JSON.stringify(payload)
            }
        );

    if (!response.ok) {

        throw new Error(
            'Server mengembalikan HTTP ' +
            response.status
        );
    }

    return await response.json();
}


/* ================================================================
   BUILD API URL
   ================================================================ */

function buildApiUrl(
    action,
    params = {}
) {

    if (
        !APP_CONFIG.API_URL ||
        APP_CONFIG.API_URL.includes(
            'PASTE_URL'
        )
    ) {

        throw new Error(
            'URL Web App Google Apps Script belum diisi pada APP_CONFIG.API_URL.'
        );
    }

    const url =
        new URL(
            APP_CONFIG.API_URL
        );

    url.searchParams.set(
        'action',
        action
    );

    Object.entries(params)
        .forEach(function([key, value]) {

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
        });

    /*
     * Cache busting.
     */
    url.searchParams.set(
        '_',
        Date.now()
    );

    return url.toString();
}


/* ================================================================
   RENDER EVERYTHING
   ================================================================ */

function renderEverything() {

    renderDashboard();

    renderIncome();

    renderExpense();

    renderEmployees();

    renderPayroll();

    renderHistory();

    renderConfig();

    initializeDateInputs();

    setCurrentDateDefaults();

    updateDescriptionCounter();
}


/* ================================================================
   DASHBOARD
   ================================================================ */

function renderDashboard() {

    const dashboard =
        state.dashboard || {};

    /*
     * Total pemasukan.
     */
    setText(
        [
            'totalIncome',
            'totalPemasukan',
            'dashboardTotalIncome'
        ],
        formatRupiah(
            dashboard.totalIncome
        )
    );


    /*
     * 30% kas.
     */
    setText(
        [
            'kasAllocation',
            'alokasiKas',
            'totalKas30',
            'dashboardKasAllocation'
        ],
        formatRupiah(
            dashboard.kasAllocation
        )
    );


    /*
     * Pengeluaran.
     */
    setText(
        [
            'totalExpense',
            'totalPengeluaran',
            'dashboardTotalExpense'
        ],
        formatRupiah(
            dashboard.totalExpense
        )
    );


    /*
     * Sisa kas.
     */
    setText(
        [
            'remainingCash',
            'sisaKas',
            'sisaKasPokja',
            'dashboardRemainingCash'
        ],
        formatRupiah(
            dashboard.remainingCash
        )
    );


    /*
     * Dana gaji 70%.
     */
    setText(
        [
            'salaryFund',
            'danaPenggajian',
            'danaGaji',
            'dashboardSalaryFund'
        ],
        formatRupiah(
            dashboard.salaryFund
        )
    );


    /*
     * Gaji telah dibayarkan.
     */
    setText(
        [
            'totalSalaryPaid',
            'totalGajiDibayar',
            'gajiTelahDibayar'
        ],
        formatRupiah(
            dashboard.totalSalaryPaid
        )
    );


    /*
     * Sisa dana gaji.
     */
    setText(
        [
            'remainingSalaryFund',
            'sisaDanaGaji',
            'remainingPayrollFund'
        ],
        formatRupiah(
            dashboard.remainingSalaryFund
        )
    );


    /*
     * Total gaji belum dibayar.
     */
    setText(
        [
            'totalSalaryUnpaid',
            'totalGajiBelumDibayar'
        ],
        formatRupiah(
            dashboard.totalSalaryUnpaid
        )
    );


    /*
     * Jumlah pegawai.
     */
    setText(
        [
            'totalEmployees',
            'jumlahPegawai'
        ],
        numberFormat(
            dashboard.totalEmployees
        )
    );


    /*
     * Pegawai telah dibayar.
     */
    setText(
        [
            'paidEmployees',
            'pegawaiSudahDibayar'
        ],
        numberFormat(
            dashboard.paidEmployees
        )
    );


    /*
     * Pegawai belum dibayar.
     */
    setText(
        [
            'unpaidEmployees',
            'pegawaiBelumDibayar'
        ],
        numberFormat(
            dashboard.unpaidEmployees
        )
    );


    /*
     * Saldo kas status.
     */
    updateBalanceStatus(
        dashboard.remainingCash
    );
}


/* ================================================================
   PEMASUKAN
   ================================================================ */

function renderIncome() {

    const container =
        getElementByIds(
            'incomeTableBody',
            'pemasukanTableBody',
            'incomeList',
            'pemasukanList'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!state.income.length) {

        container.innerHTML =
            emptyTableRow(
                'Belum ada data pemasukan.',
                6
            );

        return;
    }

    /*
     * Data terbaru di atas.
     */
    const data =
        [...state.income]
            .sort(function(a, b) {

                return String(
                    b.date || ''
                ).localeCompare(
                    String(a.date || '')
                );
            });

    data.forEach(function(item) {

        const tr =
            document.createElement('tr');

        tr.innerHTML = `
            <td>${escapeHtml(
                formatDisplayDate(item.date)
            )}</td>

            <td class="money-cell">
                ${escapeHtml(
                    formatRupiah(item.amount)
                )}
            </td>

            <td>
                <span class="income-source">
                    ${escapeHtml(
                        item.source || '-'
                    )}
                </span>
            </td>

            <td class="money-cell">
                ${escapeHtml(
                    formatRupiah(
                        item.kasAllocation
                    )
                )}
            </td>

            <td class="money-cell">
                ${escapeHtml(
                    formatRupiah(
                        item.salaryAllocation
                    )
                )}
            </td>

            <td>
                ${escapeHtml(
                    item.month || '-'
                )}
            </td>
        `;

        container.appendChild(tr);
    });
}


/* ================================================================
   SUBMIT PEMASUKAN
   ================================================================ */

async function handleIncomeSubmit(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const dateInput =
        findFormElement(
            form,
            [
                'incomeDate',
                'tanggalPemasukan',
                'date'
            ]
        );

    const amountInput =
        findFormElement(
            form,
            [
                'incomeAmount',
                'nominalPemasukan',
                'amount'
            ]
        );

    const sourceInput =
        findFormElement(
            form,
            [
                'incomeSource',
                'sumberPemasukan',
                'keteranganPemasukan',
                'source'
            ]
        );

    if (
        !dateInput ||
        !amountInput ||
        !sourceInput
    ) {

        showToast(
            'Elemen formulir pemasukan belum lengkap.',
            'error'
        );

        return;
    }

    const date =
        dateInput.value;

    const amount =
        parseCurrencyInput(
            amountInput.value
        );

    const source =
        sourceInput.value.trim();

    if (!date) {

        showToast(
            'Tanggal pemasukan wajib diisi.',
            'warning'
        );

        dateInput.focus();

        return;
    }

    if (
        !amount ||
        amount <= 0
    ) {

        showToast(
            'Nominal pemasukan harus lebih besar dari 0.',
            'warning'
        );

        amountInput.focus();

        return;
    }

    if (
        !getIncomeSources()
            .includes(source)
    ) {

        showToast(
            'Pilih keterangan pemasukan yang tersedia.',
            'warning'
        );

        sourceInput.focus();

        return;
    }

    setFormBusy(
        form,
        true
    );

    try {

        const result =
            await apiPost({

                action:
                    'addIncome',

                date:
                    date,

                amount:
                    amount,

                source:
                    source
            });

        if (!result.success) {

            throw new Error(
                result.message ||
                'Pemasukan gagal disimpan.'
            );
        }

        showToast(
            result.message ||
            'Pemasukan berhasil disimpan.',
            'success'
        );

        form.reset();

        setCurrentDateDefaults();

        /*
         * Ambil data terbaru.
         */
        await loadAppData();

    } catch (error) {

        console.error(
            'addIncome:',
            error
        );

        showToast(
            getErrorMessage(error),
            'error'
        );

    } finally {

        setFormBusy(
            form,
            false
        );
    }
}


/* ================================================================
   PENGELUARAN
   ================================================================ */

function renderExpense() {

    const container =
        getElementByIds(
            'expenseTableBody',
            'pengeluaranTableBody',
            'expenseList',
            'pengeluaranList'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!state.expense.length) {

        container.innerHTML =
            emptyTableRow(
                'Belum ada data pengeluaran.',
                4
            );

        return;
    }

    const data =
        [...state.expense]
            .sort(function(a, b) {

                return String(
                    b.date || ''
                ).localeCompare(
                    String(a.date || '')
                );
            });

    data.forEach(function(item) {

        const tr =
            document.createElement('tr');

        tr.innerHTML = `
            <td>
                ${escapeHtml(
                    formatDisplayDate(item.date)
                )}
            </td>

            <td class="money-cell">
                ${escapeHtml(
                    formatRupiah(item.amount)
                )}
            </td>

            <td class="description-cell">
                ${escapeHtml(
                    item.description || '-'
                )}
            </td>

            <td>
                ${escapeHtml(
                    item.month || '-'
                )}
            </td>
        `;

        container.appendChild(tr);
    });
}


/* ================================================================
   SUBMIT PENGELUARAN
   ================================================================ */

async function handleExpenseSubmit(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const dateInput =
        findFormElement(
            form,
            [
                'expenseDate',
                'tanggalPengeluaran',
                'date'
            ]
        );

    const amountInput =
        findFormElement(
            form,
            [
                'expenseAmount',
                'nominalPengeluaran',
                'amount'
            ]
        );

    const descriptionInput =
        findFormElement(
            form,
            [
                'expenseDescription',
                'deskripsiPengeluaran',
                'description'
            ]
        );

    if (
        !dateInput ||
        !amountInput ||
        !descriptionInput
    ) {

        showToast(
            'Elemen formulir pengeluaran belum lengkap.',
            'error'
        );

        return;
    }

    const date =
        dateInput.value;

    const amount =
        parseCurrencyInput(
            amountInput.value
        );

    const description =
        descriptionInput.value.trim();

    if (!date) {

        showToast(
            'Tanggal pengeluaran wajib diisi.',
            'warning'
        );

        dateInput.focus();

        return;
    }

    if (
        !amount ||
        amount <= 0
    ) {

        showToast(
            'Nominal pengeluaran harus lebih besar dari 0.',
            'warning'
        );

        amountInput.focus();

        return;
    }

    const wordCount =
        countWords(
            description
        );

    const maxWords =
        getMaxDescriptionWords();

    if (!description) {

        showToast(
            'Deskripsi pengeluaran wajib diisi.',
            'warning'
        );

        descriptionInput.focus();

        return;
    }

    if (
        wordCount >
        maxWords
    ) {

        showToast(
            `Deskripsi maksimal ${maxWords} kata. Saat ini ${wordCount} kata.`,
            'warning'
        );

        descriptionInput.focus();

        return;
    }

    /*
     * Cek cepat di frontend.
     *
     * Backend tetap melakukan validasi final.
     */
    const remainingCash =
        Number(
            state.dashboard?.remainingCash || 0
        );

    if (
        amount >
        remainingCash
    ) {

        showToast(
            'Nominal melebihi sisa Kas Pokja.',
            'warning'
        );

        amountInput.focus();

        return;
    }

    setFormBusy(
        form,
        true
    );

    try {

        const result =
            await apiPost({

                action:
                    'addExpense',

                date:
                    date,

                amount:
                    amount,

                description:
                    description
            });

        if (!result.success) {

            throw new Error(
                result.message ||
                'Pengeluaran gagal disimpan.'
            );
        }

        showToast(
            result.message ||
            'Pengeluaran berhasil disimpan.',
            'success'
        );

        form.reset();

        setCurrentDateDefaults();

        updateDescriptionCounter();

        await loadAppData();

    } catch (error) {

        console.error(
            'addExpense:',
            error
        );

        showToast(
            getErrorMessage(error),
            'error'
        );

    } finally {

        setFormBusy(
            form,
            false
        );
    }
}


/* ================================================================
   PEGAWAI
   ================================================================ */

function renderEmployees() {

    const container =
        getElementByIds(
            'employeeTableBody',
            'pegawaiTableBody',
            'employeeList',
            'pegawaiList'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!state.employees.length) {

        container.innerHTML =
            emptyTableRow(
                'Data pegawai belum tersedia.',
                5
            );

        return;
    }

    state.employees.forEach(function(employee) {

        const tr =
            document.createElement('tr');

        tr.innerHTML = `
            <td>
                ${escapeHtml(
                    employee.no ?? '-'
                )}
            </td>

            <td>
                ${escapeHtml(
                    employee.position || '-'
                )}
            </td>

            <td>
                ${escapeHtml(
                    employee.name || 'Belum diisi'
                )}
            </td>

            <td class="points-cell">
                ${escapeHtml(
                    numberFormat(employee.points)
                )}
            </td>

            <td>
                ${
                    employee.filled
                        ? '<span class="status status-ready">Aktif</span>'
                        : '<span class="status status-empty">Belum diisi</span>'
                }
            </td>
        `;

        container.appendChild(tr);
    });


    setText(
        [
            'employeeTotalPoints',
            'totalPoinPegawai'
        ],
        numberFormat(
            state.employees.reduce(
                function(total, employee) {
                    return total +
                        Number(employee.points || 0);
                },
                0
            )
        )
    );
}


/* ================================================================
   PAYROLL
   ================================================================ */

async function handlePayrollMonthChange(event) {

    const month =
        event.target.value;

    if (!month) {
        return;
    }

    await loadPayroll(
        month
    );
}


async function loadPayroll(month) {

    try {

        const result =
            await apiGet(
                'getPayroll',
                {
                    month:
                        month
                }
            );

        if (!result.success) {

            throw new Error(
                result.message ||
                'Data penggajian gagal diambil.'
            );
        }

        state.currentPayrollMonth =
            result.month ||
            month;

        state.payroll =
            Array.isArray(result.data)
                ? result.data
                : [];

        renderPayroll();

        /*
         * Update ringkasan berdasarkan data payroll terbaru.
         */
        await refreshDashboardOnlySafe();

        return result;

    } catch (error) {

        console.error(
            'loadPayroll:',
            error
        );

        showToast(
            getErrorMessage(error),
            'error'
        );

        throw error;
    }
}


function renderPayroll() {

    const container =
        getElementByIds(
            'payrollTableBody',
            'penggajianTableBody',
            'salaryTableBody',
            'payrollList',
            'penggajianList'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';

    /*
     * Set bulan input.
     */
    const monthInput =
        getElementByIds(
            'payrollMonth',
            'bulanPenggajian',
            'salaryMonth'
        );

    if (
        monthInput &&
        state.currentPayrollMonth
    ) {

        monthInput.value =
            state.currentPayrollMonth;
    }


    if (!state.payroll.length) {

        container.innerHTML =
            emptyTableRow(
                'Data penggajian belum tersedia.',
                8
            );

        renderPayrollSummary();

        return;
    }


    state.payroll.forEach(function(item) {

        const tr =
            document.createElement('tr');

        const isPaid =
            Boolean(item.paid) ||
            String(
                item.status || ''
            ).toUpperCase() ===
            'SUDAH DIBAYAR';

        const hasName =
            Boolean(
                item.name &&
                item.name.trim()
            );

        const canPay =
            hasName &&
            Number(item.salary || 0) > 0 &&
            !isPaid &&
            item.row;


        tr.innerHTML = `

            <td>
                ${escapeHtml(
                    item.position || '-'
                )}
            </td>

            <td class="employee-name-cell">
                ${escapeHtml(
                    item.name ||
                    'Nama belum diisi'
                )}
            </td>

            <td class="points-cell">
                ${escapeHtml(
                    numberFormat(item.points)
                )}
            </td>

            <td class="money-cell">
                ${escapeHtml(
                    formatRupiah(item.salary)
                )}
            </td>

            <td>
                <span class="${getPayrollStatusClass(item)}">
                    ${escapeHtml(
                        getPayrollStatusText(item)
                    )}
                </span>
            </td>

            <td class="payment-date-cell">
                ${escapeHtml(
                    item.paymentDate || '-'
                )}
            </td>

            <td class="pay-action-cell">

                ${
                    canPay
                    ?
                    `
                    <button
                        type="button"
                        class="btn-pay-salary"
                        data-pay-salary="true"
                        data-row="${escapeHtml(item.row)}"
                        data-month="${escapeHtml(item.month || state.currentPayrollMonth)}"
                        data-name="${escapeHtml(item.name)}"
                        data-salary="${escapeHtml(item.salary)}"
                    >
                        💰 BAYAR GAJI
                    </button>
                    `
                    :
                    (
                        isPaid
                        ?
                        `
                        <span class="paid-badge">
                            ✓ SUDAH DIBAYAR
                        </span>
                        `
                        :
                        `
                        <span class="pay-disabled">
                            Belum tersedia
                        </span>
                        `
                    )
                }

            </td>
        `;

        container.appendChild(tr);
    });

    renderPayrollSummary();
}


/* ================================================================
   PAYROLL SUMMARY
   ================================================================ */

function renderPayrollSummary() {

    const data =
        state.payroll || [];

    const active =
        data.filter(function(item) {
            return Boolean(
                item.name &&
                item.name.trim()
            );
        });

    const paid =
        active.filter(function(item) {

            return (
                item.paid ||
                String(
                    item.status || ''
                ).toUpperCase() ===
                'SUDAH DIBAYAR'
            );

        });

    const unpaid =
        active.filter(function(item) {

            return !(
                item.paid ||
                String(
                    item.status || ''
                ).toUpperCase() ===
                'SUDAH DIBAYAR'
            );

        });


    const totalSalary =
        active.reduce(
            function(total, item) {
                return total +
                    Number(item.salary || 0);
            },
            0
        );


    const totalPaid =
        paid.reduce(
            function(total, item) {
                return total +
                    Number(item.salary || 0);
            },
            0
        );


    const totalUnpaid =
        unpaid.reduce(
            function(total, item) {
                return total +
                    Number(item.salary || 0);
            },
            0
        );


    setText(
        [
            'payrollTotal',
            'totalGajiBulanIni',
            'totalSalary'
        ],
        formatRupiah(
            totalSalary
        )
    );


    setText(
        [
            'payrollPaid',
            'gajiBulanSudahDibayar'
        ],
        formatRupiah(
            totalPaid
        )
    );


    setText(
        [
            'payrollUnpaid',
            'gajiBulanBelumDibayar'
        ],
        formatRupiah(
            totalUnpaid
        )
    );


    setText(
        [
            'payrollPaidCount',
            'jumlahPegawaiDibayar'
        ],
        numberFormat(
            paid.length
        )
    );


    setText(
        [
            'payrollUnpaidCount',
            'jumlahPegawaiBelumDibayar'
        ],
        numberFormat(
            unpaid.length
        )
    );


    /*
     * Nilai 1 poin.
     */
    const first =
        data[0];

    if (first) {

        setText(
            [
                'valuePerPoint',
                'nilaiSatuPoin'
            ],
            formatRupiah(
                first.valuePerPoint
            )
        );

        setText(
            [
                'salaryFundMonth',
                'danaGajiBulan'
            ],
            formatRupiah(
                first.salaryFund
            )
        );

        setText(
            [
                'payrollTotalPoints',
                'totalPoinPenggajian'
            ],
            numberFormat(
                first.totalPoints
            )
        );
    }
}


/* ================================================================
   BAYAR GAJI
   ================================================================ */

async function handlePaySalary(button) {

    const row =
        Number(
            button.dataset.row
        );

    const name =
        button.dataset.name ||
        'pegawai';

    const month =
        button.dataset.month ||
        state.currentPayrollMonth;

    const salary =
        Number(
            button.dataset.salary || 0
        );


    if (!row) {

        showToast(
            'Baris penggajian tidak ditemukan.',
            'error'
        );

        return;
    }


    /*
     * Cari data lokal.
     */
    const employee =
        state.payroll.find(
            function(item) {

                return Number(item.row) === row;

            }
        );


    if (
        employee &&
        employee.paid
    ) {

        showToast(
            'Gaji pegawai ini sudah dibayarkan.',
            'warning'
        );

        return;
    }


    const confirmed =
        await confirmPayment(
            name,
            salary,
            month
        );

    if (!confirmed) {
        return;
    }


    setButtonBusy(
        button,
        true,
        'Memproses...'
    );


    try {

        const result =
            await apiPost({

                action:
                    'paySalary',

                row:
                    row,

                month:
                    month
            });


        if (!result.success) {

            /*
             * Backend bisa mengembalikan
             * alreadyPaid=true.
             */
            if (result.alreadyPaid) {

                showToast(
                    result.message ||
                    'Gaji sudah dibayarkan.',
                    'warning'
                );

                await loadPayroll(
                    month
                );

                return;
            }

            throw new Error(
                result.message ||
                'Pembayaran gaji gagal.'
            );
        }


        showToast(
            result.message ||
            `Gaji ${name} berhasil dibayarkan.`,
            'success'
        );


        /*
         * Reload payroll agar status dan
         * tanggal pembayaran langsung berubah.
         */
        await loadPayroll(
            month
        );


        /*
         * Dashboard juga diperbarui.
         */
        if (result.dashboard) {

            state.dashboard =
                result.dashboard;

            renderDashboard();

        } else {

            await refreshDashboardOnlySafe();

        }


    } catch (error) {

        console.error(
            'paySalary:',
            error
        );

        showToast(
            getErrorMessage(error),
            'error'
        );

    } finally {

        setButtonBusy(
            button,
            false
        );
    }
}


/* ================================================================
   KONFIRMASI BAYAR
   ================================================================ */

async function confirmPayment(
    name,
    amount,
    month
) {

    /*
     * Gunakan modal custom jika index.html
     * menyediakan fungsi openConfirmModal.
     */

    if (
        typeof window.openConfirmModal ===
        'function'
    ) {

        return await window.openConfirmModal({

            title:
                'Konfirmasi Pembayaran',

            message:
                `Bayarkan gaji ${name} sebesar ${formatRupiah(amount)} untuk bulan ${month}?`,

            confirmText:
                '💰 BAYAR GAJI',

            cancelText:
                'Batal'
        });
    }


    /*
     * Fallback.
     */
    return window.confirm(
        `Bayarkan gaji ${name} sebesar ${formatRupiah(amount)} untuk bulan ${month}?`
    );
}


/* ================================================================
   RIWAYAT
   ================================================================ */

function renderHistory() {

    const container =
        getElementByIds(
            'historyTableBody',
            'riwayatTableBody',
            'historyList',
            'riwayatList'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!state.history.length) {

        container.innerHTML =
            emptyTableRow(
                'Belum ada riwayat transaksi.',
                6
            );

        return;
    }

    const data =
        [...state.history]
            .sort(function(a, b) {

                return String(
                    b.date || ''
                ).localeCompare(
                    String(a.date || '')
                );
            });


    data.forEach(function(item) {

        const tr =
            document.createElement('tr');

        tr.innerHTML = `

            <td>
                ${escapeHtml(
                    formatDisplayDate(item.date)
                )}
            </td>

            <td>
                ${escapeHtml(
                    item.type || '-'
                )}
            </td>

            <td class="money-cell">
                ${escapeHtml(
                    formatRupiah(item.amount)
                )}
            </td>

            <td class="description-cell">
                ${escapeHtml(
                    item.description || '-'
                )}
            </td>

            <td>
                ${escapeHtml(
                    item.allocation || '-'
                )}
            </td>

            <td class="money-cell">
                ${escapeHtml(
                    formatRupiah(item.balance)
                )}
            </td>

        `;

        container.appendChild(tr);
    });
}


/* ================================================================
   CONFIG
   ================================================================ */

function renderConfig() {

    const sources =
        getIncomeSources();

    /*
     * Dropdown pemasukan.
     */
    const selects =
        $all(
            '#incomeSource, #sumberPemasukan, #keteranganPemasukan'
        );


    selects.forEach(function(select) {

        const currentValue =
            select.value;

        /*
         * Hapus option lama selain placeholder.
         */
        select.innerHTML = '';

        const placeholder =
            document.createElement('option');

        placeholder.value = '';

        placeholder.textContent =
            'Pilih keterangan pemasukan';

        placeholder.disabled =
            false;

        select.appendChild(
            placeholder
        );


        sources.forEach(function(source) {

            const option =
                document.createElement('option');

            option.value =
                source;

            option.textContent =
                source;

            select.appendChild(
                option
            );

        });


        if (
            sources.includes(
                currentValue
            )
        ) {

            select.value =
                currentValue;
        }

    });


    /*
     * Max description words.
     */
    const maxWords =
        getMaxDescriptionWords();

    $all(
        '[data-max-description-words]'
    ).forEach(function(element) {

        element.textContent =
            maxWords;

    });
}


/* ================================================================
   DATE INPUT
   ================================================================ */

function initializeDateInputs() {

    const dateInputs =
        $all(
            'input[type="date"]'
        );

    dateInputs.forEach(function(input) {

        /*
         * Browser native date picker.
         */
        input.setAttribute(
            'autocomplete',
            'off'
        );

        /*
         * Jangan set readonly agar tanggal
         * tetap dapat diedit manual.
         */
        input.removeAttribute(
            'readonly'
        );
    });


    /*
     * Bulan penggajian.
     */
    const payrollMonth =
        getElementByIds(
            'payrollMonth',
            'bulanPenggajian',
            'salaryMonth'
        );

    if (
        payrollMonth &&
        payrollMonth.type === 'month'
    ) {

        if (!payrollMonth.value) {

            payrollMonth.value =
                state.currentPayrollMonth ||
                getCurrentMonth();
        }
    }
}


function setCurrentDateDefaults() {

    const today =
        getTodayLocal();

    const dateInputs =
        [
            getElementByIds(
                'incomeDate',
                'tanggalPemasukan'
            ),

            getElementByIds(
                'expenseDate',
                'tanggalPengeluaran'
            )
        ].filter(Boolean);


    dateInputs.forEach(function(input) {

        if (!input.value) {

            input.value =
                today;
        }

    });


    const payrollMonth =
        getElementByIds(
            'payrollMonth',
            'bulanPenggajian',
            'salaryMonth'
        );

    if (
        payrollMonth &&
        !payrollMonth.value
    ) {

        payrollMonth.value =
            state.currentPayrollMonth ||
            getCurrentMonth();
    }
}


/* ================================================================
   DESCRIPTION COUNTER
   ================================================================ */

function initializeDescriptionCounter() {

    const input =
        getElementByIds(
            'expenseDescription',
            'deskripsiPengeluaran',
            'description'
        );

    if (!input) {
        return;
    }

    input.addEventListener(
        'input',
        updateDescriptionCounter
    );

    updateDescriptionCounter();
}


function updateDescriptionCounter() {

    const input =
        getElementByIds(
            'expenseDescription',
            'deskripsiPengeluaran',
            'description'
        );

    if (!input) {
        return;
    }

    const count =
        countWords(
            input.value
        );

    const max =
        getMaxDescriptionWords();


    setText(
        [
            'descriptionWordCount',
            'jumlahKataDeskripsi',
            'wordCount'
        ],
        `${count}/${max} kata`
    );


    /*
     * Beberapa desain mungkin memakai
     * progress / warning.
     */
    const counter =
        getElementByIds(
            'descriptionCounter',
            'deskripsiCounter'
        );

    if (counter) {

        counter.classList.toggle(
            'limit-warning',
            count >= max * 0.8
        );

        counter.classList.toggle(
            'limit-error',
            count > max
        );
    }
}


/* ================================================================
   FORMAT DATA
   ================================================================ */

function formatRupiah(value) {

    const number =
        Number(value || 0);

    return (
        APP_CONFIG.CURRENCY_PREFIX +
        number.toLocaleString(
            APP_CONFIG.CURRENCY_LOCALE,
            {
                maximumFractionDigits: 0
            }
        )
    );
}


function numberFormat(value) {

    return Number(
        value || 0
    ).toLocaleString(
        APP_CONFIG.CURRENCY_LOCALE
    );
}


function formatDisplayDate(value) {

    if (!value) {
        return '-';
    }

    const text =
        String(value);

    /*
     * YYYY-MM-DD.
     */
    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (!match) {
        return text;
    }

    return (
        match[3] +
        '/' +
        match[2] +
        '/' +
        match[1]
    );
}


function parseCurrencyInput(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return 0;
    }

    if (typeof value === 'number') {
        return value;
    }

    let text =
        String(value)
            .trim()
            .replace(/Rp/gi, '')
            .replace(/\s/g, '');

    if (!text) {
        return 0;
    }

    /*
     * Format Indonesia:
     * 100.000
     * 1.250.000
     */
    if (
        text.includes('.') &&
        !text.includes(',')
    ) {

        text =
            text.replace(
                /\./g,
                ''
            );

    } else if (
        text.includes('.') &&
        text.includes(',')
    ) {

        text =
            text
                .replace(/\./g, '')
                .replace(',', '.');

    } else if (
        text.includes(',')
    ) {

        const parts =
            text.split(',');

        if (
            parts.length === 2 &&
            parts[1].length <= 2
        ) {

            text =
                parts[0] +
                '.' +
                parts[1];

        } else {

            text =
                text.replace(
                    /,/g,
                    ''
                );
        }
    }

    const result =
        Number(text);

    return Number.isFinite(result)
        ? result
        : 0;
}


function countWords(text) {

    if (
        !text ||
        !String(text).trim()
    ) {

        return 0;
    }

    return String(text)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}


/* ================================================================
   CONFIG ACCESS
   ================================================================ */

function getIncomeSources() {

    return (
        Array.isArray(
            state.config?.incomeSources
        )
        &&
        state.config.incomeSources.length
            ? state.config.incomeSources
            : APP_CONFIG.DEFAULT_INCOME_SOURCES
    );
}


function getMaxDescriptionWords() {

    return Number(
        state.config?.maxDescriptionWords ||
        APP_CONFIG.DEFAULT_MAX_DESCRIPTION_WORDS
    );
}


/* ================================================================
   DATE
   ================================================================ */

function getTodayLocal() {

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

    return (
        year +
        '-' +
        month +
        '-' +
        day
    );
}


function getCurrentMonth() {

    const now =
        new Date();

    return (
        now.getFullYear() +
        '-' +
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            '0'
        )
    );
}


/* ================================================================
   UI HELPER
   ================================================================ */

function setText(
    ids,
    value
) {

    const list =
        Array.isArray(ids)
            ? ids
            : [ids];

    list.forEach(function(id) {

        const element =
            document.getElementById(id);

        if (element) {

            element.textContent =
                value ?? '';
        }

    });
}


function setFormBusy(
    form,
    busy
) {

    if (!form) {
        return;
    }

    const buttons =
        form.querySelectorAll(
            'button[type="submit"], button'
        );

    buttons.forEach(function(button) {

        if (busy) {

            if (
                !button.dataset.originalText
            ) {

                button.dataset.originalText =
                    button.innerHTML;
            }

            button.disabled =
                true;

            button.classList.add(
                'is-loading'
            );

            button.innerHTML =
                '⏳ Memproses...';

        } else {

            button.disabled =
                false;

            button.classList.remove(
                'is-loading'
            );

            if (
                button.dataset.originalText
            ) {

                button.innerHTML =
                    button.dataset.originalText;
            }
        }

    });
}


function setButtonBusy(
    button,
    busy,
    loadingText = 'Memproses...'
) {

    if (!button) {
        return;
    }

    if (busy) {

        if (
            !button.dataset.originalText
        ) {

            button.dataset.originalText =
                button.innerHTML;
        }

        button.disabled =
            true;

        button.classList.add(
            'is-loading'
        );

        button.innerHTML =
            '⏳ ' +
            loadingText;

    } else {

        button.disabled =
            false;

        button.classList.remove(
            'is-loading'
        );

        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;
        }
    }
}


function setGlobalLoading(
    loading
) {

    state.loading =
        loading;

    document.body.classList.toggle(
        'app-loading',
        loading
    );
}


/* ================================================================
   STATUS KONEKSI
   ================================================================ */

function updateConnectionStatus(
    text,
    type
) {

    const elements =
        $all(
            '#connectionStatus, [data-connection-status]'
        );

    elements.forEach(function(element) {

        element.textContent =
            text;

        element.dataset.status =
            type;

        element.classList.remove(
            'online',
            'offline',
            'loading'
        );

        element.classList.add(
            type
        );
    });
}


/* ================================================================
   STATUS KAS
   ================================================================ */

function updateBalanceStatus(
    value
) {

    const amount =
        Number(value || 0);

    const elements =
        $all(
            '[data-balance-status]'
        );

    elements.forEach(function(element) {

        element.classList.remove(
            'positive',
            'zero',
            'negative'
        );

        if (amount > 0) {

            element.classList.add(
                'positive'
            );

        } else if (amount === 0) {

            element.classList.add(
                'zero'
            );

        } else {

            element.classList.add(
                'negative'
            );
        }

    });
}


/* ================================================================
   PAYROLL STATUS
   ================================================================ */

function getPayrollStatusText(item) {

    if (
        item.paid ||
        String(
            item.status || ''
        ).toUpperCase() ===
        'SUDAH DIBAYAR'
    ) {

        return 'SUDAH DIBAYAR';
    }

    if (
        !item.name ||
        !item.name.trim()
    ) {

        return 'BELUM DIISI';
    }

    if (
        Number(item.salary || 0) <= 0
    ) {

        return 'BELUM TERSEDIA';
    }

    return 'BELUM DIBAYAR';
}


function getPayrollStatusClass(item) {

    const status =
        getPayrollStatusText(
            item
        );

    if (
        status ===
        'SUDAH DIBAYAR'
    ) {

        return 'status status-paid';
    }

    if (
        status ===
        'BELUM DIBAYAR'
    ) {

        return 'status status-unpaid';
    }

    return 'status status-empty';
}


/* ================================================================
   ERROR HANDLING
   ================================================================ */

function getErrorMessage(error) {

    if (!error) {

        return 'Terjadi kesalahan.';
    }

    if (
        error.message
    ) {

        return error.message;
    }

    return String(error);
}


/* ================================================================
   TOAST
   ================================================================ */

function showToast(
    message,
    type = 'info'
) {

    /*
     * Jika index.html/style.css nanti memiliki
     * sistem toast sendiri, kita bisa gunakan
     * container berikut.
     */

    let container =
        document.getElementById(
            'toastContainer'
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


    toast.innerHTML = `
        <span class="toast-icon">
            ${icon}
        </span>

        <span class="toast-message">
            ${escapeHtml(message)}
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


    if (close) {

        close.addEventListener(
            'click',
            function() {

                removeToast(
                    toast
                );

            }
        );
    }


    /*
     * Animasi masuk.
     */
    requestAnimationFrame(
        function() {

            toast.classList.add(
                'show'
            );

        }
    );


    /*
     * Auto close.
     */
    window.setTimeout(
        function() {

            removeToast(
                toast
            );

        },
        type === 'error'
            ? 6000
            : 4000
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

    window.setTimeout(
        function() {

            toast.remove();

        },
        250
    );
}


/* ================================================================
   HTML SAFETY
   ================================================================ */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';
    }

    return String(value)
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
   FORM HELPER
   ================================================================ */

function findFormElement(
    form,
    ids
) {

    if (!form) {
        return null;
    }

    for (const id of ids) {

        const element =
            form.querySelector(
                '#' + CSS.escape(id)
            );

        if (element) {
            return element;
        }
    }


    /*
     * Fallback berdasarkan name.
     */
    for (const id of ids) {

        const element =
            form.querySelector(
                `[name="${CSS.escape(id)}"]`
            );

        if (element) {
            return element;
        }
    }


    return null;
}


/* ================================================================
   EMPTY TABLE
   ================================================================ */

function emptyTableRow(
    message,
    colspan
) {

    return `
        <tr class="empty-row">
            <td colspan="${colspan}">
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <span>${escapeHtml(message)}</span>
                </div>
            </td>
        </tr>
    `;
}


/* ================================================================
   SAFE DASHBOARD REFRESH
   ================================================================ */

async function refreshDashboardOnlySafe() {

    try {

        const result =
            await apiGet(
                'getDashboard'
            );

        if (
            result &&
            result.success
        ) {

            state.dashboard =
                result;

            renderDashboard();
        }

        return result;

    } catch (error) {

        console.warn(
            'Dashboard refresh gagal:',
            error
        );

        return null;
    }
}


/* ================================================================
   EXPORT PUBLIC API
   ================================================================ */

/*
 * Beberapa fungsi sengaja diekspos ke window
 * agar mudah dipanggil oleh index.html.
 */

window.KeuanganPokja = {

    state: state,

    loadAppData:
        loadAppData,

    loadPayroll:
        loadPayroll,

    refresh:
        loadAppData,

    refreshDashboard:
        refreshDashboardOnly,

    addIncome:
        addIncome,

    addExpense:
        addExpense,

    paySalary:
        handlePaySalary,

    formatRupiah:
        formatRupiah,

    showToast:
        showToast
};


/* ================================================================
   COMPATIBILITY ALIAS
   ================================================================ */

window.loadData =
    loadAppData;

window.refreshData =
    loadAppData;

window.formatRupiah =
    formatRupiah;
```
