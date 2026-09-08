/* ================================================================
   KEUANGAN POKJA PENGELOLAAN SAMPAH ADIWIYATA
   SCRIPT.JS — FINAL
   Frontend : GitHub Pages
   Backend  : Google Apps Script Web App
   Database : Google Spreadsheet
   Timezone : Asia/Jakarta

   SESUAI DENGAN:
   - index.html FINAL
   - Code.gs backend
================================================================ */


/* ================================================================
   1. KONFIGURASI
================================================================ */

const CONFIG = {

    // ============================================================
    // GANTI DENGAN URL WEB APP CODE.GS ANDA
    // ============================================================
    API_URL:
        'https://script.google.com/macros/s/AKfycby8HssHrbPp7Njhy9TpP9kC3fOSx1MTNmontcdN3H_v57txKJNc5llC1nrvXr0WPqtt/exec',

    TIMEZONE: 'Asia/Jakarta',

    CURRENCY_LOCALE: 'id-ID',

    CURRENCY_CODE: 'IDR',

    MAX_EXPENSE_WORDS: 300,

    REFRESH_INTERVAL: 60000,

    REQUEST_TIMEOUT: 30000,

    AUTO_REFRESH: true

};


/* ================================================================
   2. NAMA ACTION API
================================================================ */

const API_ACTIONS = {

    INFO: 'info',

    DASHBOARD: 'dashboard',

    GET_INCOME: 'getIncome',

    ADD_INCOME: 'addIncome',

    GET_EXPENSE: 'getExpense',

    ADD_EXPENSE: 'addExpense',

    GET_PAYROLL: 'getPayroll',

    PAY_SALARY: 'paySalary',

    GET_CASH: 'getCash',

    GET_EMPLOYEES: 'getEmployees',

    GET_HISTORY: 'getHistory'

};


/* ================================================================
   3. STATE APLIKASI
================================================================ */

const state = {

    initialized: false,

    loading: false,

    currentMenu: 'dashboardSection',

    currentMonth: '',

    currentDate: '',

    dashboard: {},

    income: [],

    expense: [],

    payroll: [],

    employees: [],

    history: [],

    cash: {},

    selectedSalary: null,

    lastUpdated: null

};


/* ================================================================
   4. DOM HELPER
================================================================ */

function $(id) {
    return document.getElementById(id);
}


function exists(id) {
    return !!$(id);
}


function query(selector) {
    return document.querySelector(selector);
}


function queryAll(selector) {
    return document.querySelectorAll(selector);
}


/* ================================================================
   5. FORMAT DATA
================================================================ */

function formatRupiah(value) {

    const number = Number(value) || 0;

    return new Intl.NumberFormat(
        CONFIG.CURRENCY_LOCALE,
        {
            style: 'currency',
            currency: CONFIG.CURRENCY_CODE,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    ).format(number);
}


function formatNumber(value) {

    const number = Number(value) || 0;

    return new Intl.NumberFormat(
        CONFIG.CURRENCY_LOCALE
    ).format(number);
}


function formatDateDisplay(value) {

    if (!value) return '-';

    const date = parseDate(value);

    if (!date || Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: CONFIG.TIMEZONE
        }
    ).format(date);
}


function formatDateLong(value) {

    if (!value) return '-';

    const date = parseDate(value);

    if (!date || Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: CONFIG.TIMEZONE
        }
    ).format(date);
}


function formatMonth(month) {

    if (!month) return '-';

    const parts = String(month).split('-');

    if (parts.length !== 2) {
        return String(month);
    }

    const year = Number(parts[0]);
    const monthNumber = Number(parts[1]);

    if (!year || !monthNumber) {
        return String(month);
    }

    const date = new Date(
        Date.UTC(year, monthNumber - 1, 1)
    );

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
        }
    ).format(date);
}


function parseDate(value) {

    if (value instanceof Date) {
        return value;
    }

    if (!value) return null;

    const stringValue = String(value);

    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {

        const [year, month, day] =
            stringValue.split('-').map(Number);

        return new Date(
            Date.UTC(year, month - 1, day)
        );
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}


function toInputDate(value) {

    if (!value) return '';

    const date = parseDate(value);

    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getUTCFullYear();
    const month =
        String(date.getUTCMonth() + 1).padStart(2, '0');
    const day =
        String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}


function getCurrentMonth() {

    const now = new Date();

    const parts = new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone: CONFIG.TIMEZONE,
            year: 'numeric',
            month: '2-digit'
        }
    ).formatToParts(now);

    const year =
        parts.find(p => p.type === 'year')?.value;

    const month =
        parts.find(p => p.type === 'month')?.value;

    return `${year}-${month}`;
}


function getCurrentDate() {

    const now = new Date();

    const parts = new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone: CONFIG.TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }
    ).formatToParts(now);

    const year =
        parts.find(p => p.type === 'year')?.value;

    const month =
        parts.find(p => p.type === 'month')?.value;

    const day =
        parts.find(p => p.type === 'day')?.value;

    return `${year}-${month}-${day}`;
}


/* ================================================================
   6. ANGKA
================================================================ */

function toNumber(value) {

    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    let stringValue = String(value)
        .trim()
        .replace(/[^\d,.-]/g, '');

    if (!stringValue) return 0;

    /*
       Menangani:
       1000000
       1.000.000
       1,000,000
       1.000.000,50
    */

    if (
        stringValue.includes('.') &&
        stringValue.includes(',')
    ) {

        stringValue =
            stringValue
                .replace(/\./g, '')
                .replace(',', '.');

    } else if (
        stringValue.includes('.') &&
        /^\d{1,3}(\.\d{3})+$/.test(stringValue)
    ) {

        stringValue =
            stringValue.replace(/\./g, '');

    } else if (
        stringValue.includes(',') &&
        /^\d{1,3}(,\d{3})+$/.test(stringValue)
    ) {

        stringValue =
            stringValue.replace(/,/g, '');

    } else if (stringValue.includes(',')) {

        stringValue =
            stringValue.replace(',', '.');
    }

    const result = Number(stringValue);

    return Number.isFinite(result)
        ? result
        : 0;
}


/* ================================================================
   7. API REQUEST
================================================================ */

async function apiRequest(action, params = {}) {

    if (
        !CONFIG.API_URL ||
        CONFIG.API_URL.includes('PASTE_URL')
    ) {

        throw new Error(
            'URL Web App Code.gs belum diisi pada CONFIG.API_URL.'
        );
    }

    const url =
        new URL(CONFIG.API_URL);

    url.searchParams.set('action', action);

    Object.entries(params).forEach(
        ([key, value]) => {

            if (
                value !== undefined &&
                value !== null
            ) {

                url.searchParams.set(
                    key,
                    String(value)
                );
            }
        }
    );

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            CONFIG.REQUEST_TIMEOUT
        );

    try {

        const response =
            await fetch(
                url.toString(),
                {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-store',
                    signal: controller.signal
                }
            );

        if (!response.ok) {

            throw new Error(
                `Server mengembalikan HTTP ${response.status}.`
            );
        }

        const text =
            await response.text();

        let data;

        try {

            data = JSON.parse(text);

        } catch (error) {

            console.error(
                'Response bukan JSON:',
                text
            );

            throw new Error(
                'Response dari Code.gs bukan JSON yang valid.'
            );
        }

        if (
            data &&
            data.success === false
        ) {

            throw new Error(
                data.message ||
                data.error ||
                'Permintaan gagal diproses.'
            );
        }

        return data;

    } catch (error) {

        if (error.name === 'AbortError') {

            throw new Error(
                'Koneksi ke server terlalu lama. Silakan coba lagi.'
            );
        }

        throw error;

    } finally {

        clearTimeout(timeout);
    }
}


/* ================================================================
   8. API POST
   Dipakai untuk operasi yang memerlukan pengiriman data.
================================================================ */

async function apiPost(action, payload = {}) {

    if (
        !CONFIG.API_URL ||
        CONFIG.API_URL.includes('PASTE_URL')
    ) {

        throw new Error(
            'URL Web App Code.gs belum diisi pada CONFIG.API_URL.'
        );
    }

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            CONFIG.REQUEST_TIMEOUT
        );

    try {

        const response =
            await fetch(
                CONFIG.API_URL,
                {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type':
                            'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action,
                        ...payload
                    }),
                    signal: controller.signal
                }
            );

        if (!response.ok) {

            throw new Error(
                `Server mengembalikan HTTP ${response.status}.`
            );
        }

        const text =
            await response.text();

        let data;

        try {

            data = JSON.parse(text);

        } catch (error) {

            console.error(
                'Response POST bukan JSON:',
                text
            );

            throw new Error(
                'Response server tidak dapat dibaca.'
            );
        }

        if (
            data &&
            data.success === false
        ) {

            throw new Error(
                data.message ||
                data.error ||
                'Permintaan gagal.'
            );
        }

        return data;

    } catch (error) {

        if (error.name === 'AbortError') {

            throw new Error(
                'Koneksi ke server terlalu lama.'
            );
        }

        throw error;

    } finally {

        clearTimeout(timeout);
    }
}


/* ================================================================
   9. TOAST
================================================================ */

function showToast(
    message,
    type = 'info',
    duration = 3500
) {

    const container =
        $('toastContainer');

    if (!container) {

        alert(message);

        return;
    }

    const toast =
        document.createElement('div');

    toast.className =
        `toast toast-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">
            ${icons[type] || icons.info}
        </span>
        <span class="toast-message">
            ${escapeHtml(message)}
        </span>
        <button
            type="button"
            class="toast-close"
            aria-label="Tutup"
        >×</button>
    `;

    container.appendChild(toast);

    const close =
        toast.querySelector('.toast-close');

    if (close) {

        close.addEventListener(
            'click',
            () => removeToast(toast)
        );
    }

    setTimeout(
        () => removeToast(toast),
        duration
    );
}


function removeToast(toast) {

    if (!toast) return;

    toast.classList.add('toast-removing');

    setTimeout(
        () => toast.remove(),
        250
    );
}


/* ================================================================
   10. HTML ESCAPE
================================================================ */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* ================================================================
   11. LOADING
================================================================ */

function showLoader(show = true) {

    const loader =
        $('appLoader');

    if (!loader) return;

    if (show) {

        loader.classList.remove(
            'hidden',
            'is-hidden'
        );

        loader.style.display = '';

    } else {

        loader.classList.add(
            'hidden'
        );

        loader.style.display = 'none';
    }
}


/* ================================================================
   12. STATUS KONEKSI
================================================================ */

function setConnectionStatus(
    connected,
    text = ''
) {

    const dot =
        $('connectionDot');

    const status =
        $('connectionStatus');

    if (dot) {

        dot.classList.toggle(
            'connected',
            connected
        );

        dot.classList.toggle(
            'offline',
            !connected
        );
    }

    if (status) {

        status.textContent =
            text ||
            (
                connected
                    ? 'Terhubung'
                    : 'Tidak terhubung'
            );
    }
}


/* ================================================================
   13. HEADER DATE
================================================================ */

function updateHeaderDate() {

    const date =
        state.currentDate ||
        getCurrentDate();

    const formatted =
        formatDateLong(date);

    if ($('currentDateDisplay')) {

        $('currentDateDisplay').textContent =
            formatted;
    }

    if ($('heroDate')) {

        $('heroDate').textContent =
            formatted;
    }
}


/* ================================================================
   14. DASHBOARD
================================================================ */

async function loadDashboard() {

    try {

        const result =
            await apiRequest(
                API_ACTIONS.DASHBOARD
            );

        const dashboard =
            result.dashboard ||
            result.data ||
            result;

        state.dashboard =
            dashboard || {};

        updateDashboardUI();

        return state.dashboard;

    } catch (error) {

        console.error(
            'loadDashboard:',
            error
        );

        throw error;
    }
}


function updateDashboardUI() {

    const d =
        state.dashboard || {};

    setText(
        'totalIncome',
        formatRupiah(
            d.totalIncome
        )
    );

    setText(
        'kasAllocation',
        formatRupiah(
            d.kasAllocation
        )
    );

    setText(
        'totalExpense',
        formatRupiah(
            d.totalExpense
        )
    );

    setText(
        'remainingCash',
        formatRupiah(
            d.remainingCash
        )
    );

    setText(
        'salaryFund',
        formatRupiah(
            d.salaryFund
        )
    );

    setText(
        'totalSalaryPaid',
        formatRupiah(
            d.totalSalaryPaid
        )
    );

    setText(
        'remainingSalaryFund',
        formatRupiah(
            d.remainingSalaryFund
        )
    );

    setText(
        'totalSalaryUnpaid',
        formatRupiah(
            d.totalSalaryUnpaid
        )
    );

    setText(
        'totalEmployees',
        formatNumber(
            d.totalEmployees
        )
    );

    setText(
        'paidEmployees',
        formatNumber(
            d.paidEmployees
        )
    );

    setText(
        'unpaidEmployees',
        formatNumber(
            d.unpaidEmployees
        )
    );
}


/* ================================================================
   15. PEMASUKAN
================================================================ */

async function loadIncome() {

    try {

        const result =
            await apiRequest(
                API_ACTIONS.GET_INCOME
            );

        state.income =
            normalizeArray(
                result,
                [
                    'income',
                    'data',
                    'rows',
                    'pemasukan'
                ]
            );

        renderIncomeTable();

        return state.income;

    } catch (error) {

        console.error(
            'loadIncome:',
            error
        );

        state.income = [];

        renderIncomeTable();

        throw error;
    }
}


async function addIncome() {

    const date =
        $('incomeDate')?.value;

    const amount =
        toNumber(
            $('incomeAmount')?.value
        );

    const source =
        $('incomeSource')?.value?.trim();

    if (!date) {

        showToast(
            'Tanggal pemasukan wajib diisi.',
            'warning'
        );

        return false;
    }

    if (amount <= 0) {

        showToast(
            'Nominal pemasukan harus lebih dari 0.',
            'warning'
        );

        return false;
    }

    if (!source) {

        showToast(
            'Sumber dana wajib dipilih.',
            'warning'
        );

        return false;
    }

    const form =
        $('incomeForm');

    setFormLoading(
        form,
        true
    );

    try {

        const payload = {
            date,
            tanggal: date,
            amount,
            nominal: amount,
            nominalPemasukan: amount,
            source,
            sumberDana: source
        };

        let result;

        /*
           POST adalah metode utama.
        */

        try {

            result =
                await apiPost(
                    API_ACTIONS.ADD_INCOME,
                    payload
                );

        } catch (postError) {

            /*
               Fallback GET jika Code.gs menggunakan
               parameter query untuk menyimpan data.
            */

            result =
                await apiRequest(
                    API_ACTIONS.ADD_INCOME,
                    payload
                );
        }

        if (
            result &&
            result.success === false
        ) {

            throw new Error(
                result.message ||
                'Pemasukan gagal disimpan.'
            );
        }

        showToast(
            'Pemasukan berhasil disimpan.',
            'success'
        );

        resetIncomeForm();

        await refreshAll(
            false,
            [
                'income',
                'dashboard',
                'cash'
            ]
        );

        return true;

    } catch (error) {

        console.error(
            'addIncome:',
            error
        );

        showToast(
            error.message ||
            'Gagal menyimpan pemasukan.',
            'error'
        );

        return false;

    } finally {

        setFormLoading(
            form,
            false
        );
    }
}


function renderIncomeTable() {

    const tbody =
        $('incomeTableBody');

    if (!tbody) return;

    if (!state.income.length) {

        tbody.innerHTML = emptyTableRow(
            'Belum ada data pemasukan.',
            6
        );

        return;
    }

    tbody.innerHTML =
        state.income.map(
            (item, index) => {

                const date =
                    pick(
                        item,
                        [
                            'date',
                            'tanggal',
                            'Tanggal'
                        ]
                    );

                const amount =
                    toNumber(
                        pick(
                            item,
                            [
                                'amount',
                                'nominal',
                                'nominalPemasukan',
                                'Nominal Pemasukan'
                            ]
                        )
                    );

                const source =
                    pick(
                        item,
                        [
                            'source',
                            'sumberDana',
                            'sumber',
                            'Sumber Dana'
                        ]
                    ) || '-';

                const kas =
                    pick(
                        item,
                        [
                            'kas',
                            'kasAllocation',
                            'alokasiKas',
                            '30% Kas Pokja'
                        ]
                    );

                const salary =
                    pick(
                        item,
                        [
                            'salary',
                            'salaryFund',
                            'alokasiGaji',
                            '70% Penggajian'
                        ]
                    );

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(
                            formatDateDisplay(date)
                        )}</td>
                        <td class="money-cell">
                            ${formatRupiah(amount)}
                        </td>
                        <td>${escapeHtml(source)}</td>
                        <td class="money-cell">
                            ${formatRupiah(
                                kas !== undefined
                                    ? kas
                                    : amount * 0.30
                            )}
                        </td>
                        <td class="money-cell">
                            ${formatRupiah(
                                salary !== undefined
                                    ? salary
                                    : amount * 0.70
                            )}
                        </td>
                    </tr>
                `;
            }
        ).join('');
}


function resetIncomeForm() {

    const form =
        $('incomeForm');

    if (form) {
        form.reset();
    }

    setDefaultDates();

    updateIncomePreview();
}


/* ================================================================
   16. PREVIEW PEMASUKAN
================================================================ */

function updateIncomePreview() {

    const amount =
        toNumber(
            $('incomeAmount')?.value
        );

    const kas =
        amount * 0.30;

    const salary =
        amount * 0.70;

    setText(
        'incomeKasPreview',
        formatRupiah(kas)
    );

    setText(
        'incomeSalaryPreview',
        formatRupiah(salary)
    );
}


/* ================================================================
   17. PENGELUARAN
================================================================ */

async function loadExpense() {

    try {

        const result =
            await apiRequest(
                API_ACTIONS.GET_EXPENSE
            );

        state.expense =
            normalizeArray(
                result,
                [
                    'expense',
                    'expenses',
                    'data',
                    'rows',
                    'pengeluaran'
                ]
            );

        renderExpenseTable();

        return state.expense;

    } catch (error) {

        console.error(
            'loadExpense:',
            error
        );

        state.expense = [];

        renderExpenseTable();

        throw error;
    }
}


async function addExpense() {

    const date =
        $('expenseDate')?.value;

    const amount =
        toNumber(
            $('expenseAmount')?.value
        );

    const description =
        $('expenseDescription')?.value?.trim();

    if (!date) {

        showToast(
            'Tanggal pengeluaran wajib diisi.',
            'warning'
        );

        return false;
    }

    if (amount <= 0) {

        showToast(
            'Nominal pengeluaran harus lebih dari 0.',
            'warning'
        );

        return false;
    }

    if (!description) {

        showToast(
            'Deskripsi pengeluaran wajib diisi.',
            'warning'
        );

        return false;
    }

    const wordCount =
        countWords(description);

    if (
        wordCount >
        CONFIG.MAX_EXPENSE_WORDS
    ) {

        showToast(
            `Deskripsi maksimal ${CONFIG.MAX_EXPENSE_WORDS} kata.`,
            'warning'
        );

        return false;
    }

    const remainingCash =
        toNumber(
            state.dashboard.remainingCash
        );

    if (
        remainingCash > 0 &&
        amount > remainingCash
    ) {

        showToast(
            'Nominal pengeluaran melebihi sisa kas Pokja.',
            'warning'
        );

        return false;
    }

    const form =
        $('expenseForm');

    setFormLoading(
        form,
        true
    );

    try {

        const payload = {
            date,
            tanggal: date,
            amount,
            nominal: amount,
            nominalPengeluaran: amount,
            description,
            deskripsi: description,
            deskripsiPengeluaran: description
        };

        let result;

        try {

            result =
                await apiPost(
                    API_ACTIONS.ADD_EXPENSE,
                    payload
                );

        } catch (postError) {

            result =
                await apiRequest(
                    API_ACTIONS.ADD_EXPENSE,
                    payload
                );
        }

        if (
            result &&
            result.success === false
        ) {

            throw new Error(
                result.message ||
                'Pengeluaran gagal disimpan.'
            );
        }

        showToast(
            'Pengeluaran berhasil disimpan.',
            'success'
        );

        resetExpenseForm();

        await refreshAll(
            false,
            [
                'expense',
                'dashboard',
                'cash',
                'history'
            ]
        );

        return true;

    } catch (error) {

        console.error(
            'addExpense:',
            error
        );

        showToast(
            error.message ||
            'Gagal menyimpan pengeluaran.',
            'error'
        );

        return false;

    } finally {

        setFormLoading(
            form,
            false
        );
    }
}


function renderExpenseTable() {

    const tbody =
        $('expenseTableBody');

    if (!tbody) return;

    if (!state.expense.length) {

        tbody.innerHTML = emptyTableRow(
            'Belum ada data pengeluaran.',
            4
        );

        return;
    }

    tbody.innerHTML =
        state.expense.map(
            (item, index) => {

                const date =
                    pick(
                        item,
                        [
                            'date',
                            'tanggal',
                            'Tanggal'
                        ]
                    );

                const amount =
                    toNumber(
                        pick(
                            item,
                            [
                                'amount',
                                'nominal',
                                'nominalPengeluaran',
                                'Nominal Pengeluaran'
                            ]
                        )
                    );

                const description =
                    pick(
                        item,
                        [
                            'description',
                            'deskripsi',
                            'deskripsiPengeluaran',
                            'Deskripsi Pengeluaran'
                        ]
                    ) || '-';

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(
                            formatDateDisplay(date)
                        )}</td>
                        <td class="money-cell">
                            ${formatRupiah(amount)}
                        </td>
                        <td>
                            <div class="description-cell">
                                ${escapeHtml(description)}
                            </div>
                        </td>
                    </tr>
                `;
            }
        ).join('');
}


/* ================================================================
   18. HITUNG KATA
================================================================ */

function countWords(text) {

    if (!text || !text.trim()) {
        return 0;
    }

    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}


function updateDescriptionCounter() {

    const textarea =
        $('expenseDescription');

    const counter =
        $('descriptionCounter');

    const wordDisplay =
        $('descriptionWordCount');

    if (!textarea) return;

    const count =
        countWords(textarea.value);

    if (counter) {

        counter.textContent =
            `${count}/${CONFIG.MAX_EXPENSE_WORDS} kata`;
    }

    if (wordDisplay) {

        wordDisplay.textContent =
            `${count} kata`;
    }

    textarea.classList.toggle(
        'is-invalid',
        count > CONFIG.MAX_EXPENSE_WORDS
    );
}


/* ================================================================
   19. PENGGAJIAN
================================================================ */

async function loadPayroll(
    month = state.currentMonth
) {

    const selectedMonth =
        month ||
        getCurrentMonth();

    state.currentMonth =
        selectedMonth;

    try {

        const result =
            await apiRequest(
                API_ACTIONS.GET_PAYROLL,
                {
                    month: selectedMonth,
                    bulan: selectedMonth
                }
            );

        state.payroll =
            normalizeArray(
                result,
                [
                    'payroll',
                    'data',
                    'rows',
                    'penggajian'
                ]
            );

        updatePayrollSummary();

        renderPayrollTable();

        return state.payroll;

    } catch (error) {

        console.error(
            'loadPayroll:',
            error
        );

        state.payroll = [];

        updatePayrollSummary();

        renderPayrollTable();

        throw error;
    }
}


function renderPayrollTable() {

    const tbody =
        $('payrollTableBody');

    if (!tbody) return;

    if (!state.payroll.length) {

        tbody.innerHTML = emptyTableRow(
            'Belum ada data penggajian untuk bulan ini.',
            10
        );

        return;
    }

    tbody.innerHTML =
        state.payroll.map(
            (item, index) => {

                const position =
                    pick(
                        item,
                        [
                            'position',
                            'jabatan',
                            'Jabatan'
                        ]
                    ) || '-';

                const name =
                    pick(
                        item,
                        [
                            'name',
                            'nama',
                            'namaPegawai',
                            'Nama Pegawai'
                        ]
                    ) || '';

                const points =
                    toNumber(
                        pick(
                            item,
                            [
                                'points',
                                'point',
                                'poin',
                                'Poin'
                            ]
                        )
                    );

                const salary =
                    toNumber(
                        pick(
                            item,
                            [
                                'salary',
                                'gaji',
                                'Gaji'
                            ]
                        )
                    );

                const status =
                    pick(
                        item,
                        [
                            'status',
                            'Status'
                        ]
                    ) || '';

                const paymentStatus =
                    pick(
                        item,
                        [
                            'paymentStatus',
                            'statusPembayaran',
                            'Status Pembayaran'
                        ]
                    ) ||
                    (
                        isPaid(item)
                            ? 'SUDAH DIBAYAR'
                            : 'BELUM DIBAYAR'
                    );

                const paymentDate =
                    pick(
                        item,
                        [
                            'paymentDate',
                            'tanggalBayar',
                            'Tanggal Bayar'
                        ]
                    );

                const month =
                    pick(
                        item,
                        [
                            'month',
                            'bulan',
                            'Bulan'
                        ]
                    ) ||
                    state.currentMonth;

                const paid =
                    isPaid(item);

                const canPay =
                    !!name &&
                    salary > 0 &&
                    !paid;

                return `
                    <tr>
                        <td>${index + 1}</td>

                        <td>
                            ${escapeHtml(position)}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    name || 'Nama belum diisi'
                                )}
                            </strong>
                        </td>

                        <td class="number-cell">
                            ${formatNumber(points)}
                        </td>

                        <td class="money-cell">
                            ${formatRupiah(salary)}
                        </td>

                        <td>
                            <span class="${statusClass(
                                paymentStatus
                            )}">
                                ${escapeHtml(
                                    paymentStatus
                                )}
                            </span>
                        </td>

                        <td>
                            ${
                                paymentDate
                                    ? escapeHtml(
                                        formatDateDisplay(
                                            paymentDate
                                        )
                                      )
                                    : '-'
                            }
                        </td>

                        <td>
                            ${
                                canPay
                                    ? `
                                        <button
                                            type="button"
                                            class="pay-salary-button"
                                            data-index="${index}"
                                            onclick="openSalaryPaymentByIndex(${index})"
                                        >
                                            💰 BAYAR GAJI
                                        </button>
                                      `
                                    : paid
                                        ? `
                                            <span class="paid-badge">
                                                ✓ LUNAS
                                            </span>
                                          `
                                        : `
                                            <span class="disabled-pay">
                                                Belum siap
                                            </span>
                                          `
                            }
                        </td>
                    </tr>
                `;
            }
        ).join('');
}


function updatePayrollSummary() {

    const rows =
        state.payroll || [];

    let totalPoints = 0;
    let totalSalary = 0;
    let paidSalary = 0;
    let unpaidSalary = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    rows.forEach(item => {

        const points =
            toNumber(
                pick(
                    item,
                    [
                        'points',
                        'point',
                        'poin',
                        'Poin'
                    ]
                )
            );

        const salary =
            toNumber(
                pick(
                    item,
                    [
                        'salary',
                        'gaji',
                        'Gaji'
                    ]
                )
            );

        totalPoints += points;
        totalSalary += salary;

        if (isPaid(item)) {

            paidSalary += salary;
            paidCount++;

        } else {

            unpaidSalary += salary;
            unpaidCount++;
        }
    });

    const salaryFund =
        rows.length
            ? toNumber(
                pick(
                    rows[0],
                    [
                        'salaryFund',
                        'fund',
                        'danaPenggajian',
                        'Dana 70% Penggajian'
                    ]
                )
              )
            : toNumber(
                state.dashboard.salaryFund
            );

    const valuePerPoint =
        totalPoints > 0
            ? salaryFund / totalPoints
            : 0;

    setText(
        'salaryFundMonth',
        formatRupiah(salaryFund)
    );

    setText(
        'payrollTotalPoints',
        formatNumber(totalPoints)
    );

    setText(
        'valuePerPoint',
        formatRupiah(valuePerPoint)
    );

    setText(
        'payrollTotal',
        formatRupiah(totalSalary)
    );

    setText(
        'payrollPaid',
        formatRupiah(paidSalary)
    );

    setText(
        'payrollUnpaid',
        formatRupiah(unpaidSalary)
    );

    setText(
        'payrollPaidCount',
        formatNumber(paidCount)
    );

    setText(
        'payrollUnpaidCount',
        formatNumber(unpaidCount)
    );
}


/* ================================================================
   20. MODAL BAYAR GAJI
================================================================ */

function openSalaryPaymentByIndex(index) {

    const employee =
        state.payroll[index];

    if (!employee) {

        showToast(
            'Data pegawai tidak ditemukan.',
            'error'
        );

        return;
    }

    if (isPaid(employee)) {

        showToast(
            'Gaji pegawai ini sudah dibayar.',
            'info'
        );

        return;
    }

    const name =
        pick(
            employee,
            [
                'name',
                'nama',
                'namaPegawai',
                'Nama Pegawai'
            ]
        ) || '-';

    const salary =
        toNumber(
            pick(
                employee,
                [
                    'salary',
                    'gaji',
                    'Gaji'
                ]
            )
        );

    const month =
        pick(
            employee,
            [
                'month',
                'bulan',
                'Bulan'
            ]
        ) ||
        state.currentMonth;

    state.selectedSalary = {
        ...employee,
        _index: index,
        _name: name,
        _salary: salary,
        _month: month
    };

    setText(
        'confirmEmployeeName',
        name
    );

    setText(
        'confirmSalaryAmount',
        formatRupiah(salary)
    );

    setText(
        'confirmSalaryMonth',
        formatMonth(month)
    );

    openConfirmModal();
}


function openConfirmModal() {

    const modal =
        $('confirmModal');

    if (!modal) return;

    modal.classList.add(
        'active',
        'show'
    );

    modal.removeAttribute(
        'aria-hidden'
    );

    document.body.classList.add(
        'modal-open'
    );
}


function closeConfirmModal() {

    const modal =
        $('confirmModal');

    if (!modal) return;

    modal.classList.remove(
        'active',
        'show'
    );

    modal.setAttribute(
        'aria-hidden',
        'true'
    );

    document.body.classList.remove(
        'modal-open'
    );

    state.selectedSalary =
        null;
}


async function confirmSalaryPayment() {

    const selected =
        state.selectedSalary;

    if (!selected) {

        showToast(
            'Tidak ada pembayaran yang dipilih.',
            'warning'
        );

        return false;
    }

    const name =
        selected._name;

    const salary =
        selected._salary;

    const month =
        selected._month;

    if (!name) {

        showToast(
            'Nama pegawai belum tersedia.',
            'warning'
        );

        return false;
    }

    if (salary <= 0) {

        showToast(
            'Nominal gaji tidak valid.',
            'warning'
        );

        return false;
    }

    const confirmButton =
        $('confirmModalConfirm');

    setButtonLoading(
        confirmButton,
        true
    );

    try {

        const payload = {

            month,
            bulan: month,

            name,
            nama: name,
            namaPegawai: name,

            salary,
            gaji: salary,

            row:
                selected.row ||
                selected.rowNumber ||
                selected._row ||
                '',

            index:
                selected._index,

            position:
                pick(
                    selected,
                    [
                        'position',
                        'jabatan',
                        'Jabatan'
                    ]
                ) || '',

            points:
                toNumber(
                    pick(
                        selected,
                        [
                            'points',
                            'point',
                            'poin',
                            'Poin'
                        ]
                    )
                )
        };

        let result;

        try {

            result =
                await apiPost(
                    API_ACTIONS.PAY_SALARY,
                    payload
                );

        } catch (postError) {

            result =
                await apiRequest(
                    API_ACTIONS.PAY_SALARY,
                    payload
                );
        }

        if (
            result &&
            result.success === false
        ) {

            throw new Error(
                result.message ||
                'Pembayaran gaji gagal.'
            );
        }

        closeConfirmModal();

        showToast(
            `Gaji ${name} berhasil dibayar.`,
            'success'
        );

        await refreshAll(
            false,
            [
                'payroll',
                'dashboard',
                'cash',
                'history'
            ]
        );

        return true;

    } catch (error) {

        console.error(
            'confirmSalaryPayment:',
            error
        );

        showToast(
            error.message ||
            'Gagal memproses pembayaran gaji.',
            'error'
        );

        return false;

    } finally {

        setButtonLoading(
            confirmButton,
            false
        );
    }
}


/* ================================================================
   21. KAS POKJA
================================================================ */

async function loadCash() {

    try {

        const result =
            await apiRequest(
                API_ACTIONS.GET_CASH
            );

        const cash =
            result.cash ||
            result.data ||
            result;

        state.cash =
            cash || {};

        updateCashUI();

        return state.cash;

    } catch (error) {

        console.error(
            'loadCash:',
            error
        );

        updateCashUI();

        throw error;
    }
}


function updateCashUI() {

    const d =
        state.dashboard || {};

    const c =
        state.cash || {};

    const totalIncome =
        valueFrom(
            c,
            [
                'totalIncome',
                'totalPemasukan'
            ],
            d.totalIncome
        );

    const allocation =
        valueFrom(
            c,
            [
                'kasAllocation',
                'allocation',
                'alokasiKas',
                'alokasiKasPokja'
            ],
            d.kasAllocation
        );

    const expense =
        valueFrom(
            c,
            [
                'totalExpense',
                'totalPengeluaran'
            ],
            d.totalExpense
        );

    const remaining =
        valueFrom(
            c,
            [
                'remainingCash',
                'sisaKas',
                'sisaKasPokja'
            ],
            d.remainingCash
        );

    const salaryFund =
        valueFrom(
            c,
            [
                'salaryFund',
                'danaPenggajian'
            ],
            d.salaryFund
        );

    const salaryPaid =
        valueFrom(
            c,
            [
                'salaryPaid',
                'totalSalaryPaid'
            ],
            d.totalSalaryPaid
        );

    const salaryRemaining =
        valueFrom(
            c,
            [
                'salaryRemaining',
                'remainingSalaryFund'
            ],
            d.remainingSalaryFund
        );

    setText(
        'sisaKasPokja',
        formatRupiah(remaining)
    );

    setText(
        'cashTotalIncome',
        formatRupiah(totalIncome)
    );

    setText(
        'cashAllocationDetail',
        formatRupiah(allocation)
    );

    setText(
        'cashTotalExpense',
        formatRupiah(expense)
    );

    setText(
        'cashSalaryFund',
        formatRupiah(salaryFund)
    );

    setText(
        'cashSalaryPaid',
        formatRupiah(salaryPaid)
    );

    setText(
        'cashSalaryRemaining',
        formatRupiah(salaryRemaining)
    );
}


/* ================================================================
   22. PEGAWAI
================================================================ */

async function loadEmployees() {

    try {

        const result =
            await apiRequest(
                API_ACTIONS.GET_EMPLOYEES
            );

        state.employees =
            normalizeArray(
                result,
                [
                    'employees',
                    'employee',
                    'data',
                    'rows',
                    'pegawai'
                ]
            );

        renderEmployees();

        return state.employees;

    } catch (error) {

        console.error(
            'loadEmployees:',
            error
        );

        state.employees = [];

        renderEmployees();

        throw error;
    }
}


function renderEmployees() {

    const tbody =
        $('employeeTableBody');

    if (!tbody) return;

    const totalEmployees =
        state.employees.length ||
        toNumber(
            state.dashboard.totalEmployees
        );

    const totalPoints =
        state.employees.reduce(
            (
                total,
                employee
            ) => {

                return total +
                    toNumber(
                        pick(
                            employee,
                            [
                                'points',
                                'point',
                                'poin',
                                'Bobot Poin'
                            ]
                        )
                    );

            },
            0
        );

    setText(
        'employeeCountDisplay',
        formatNumber(totalEmployees)
    );

    setText(
        'employeeTotalPoints',
        formatNumber(
            totalPoints ||
            getDashboardTotalPoints()
        )
    );

    if (!state.employees.length) {

        tbody.innerHTML =
            emptyTableRow(
                'Belum ada data pegawai.',
                6
            );

        return;
    }

    tbody.innerHTML =
        state.employees.map(
            (employee, index) => {

                const no =
                    pick(
                        employee,
                        [
                            'no',
                            'No',
                            'number'
                        ]
                    ) ||
                    index + 1;

                const position =
                    pick(
                        employee,
                        [
                            'position',
                            'jabatan',
                            'Jabatan'
                        ]
                    ) || '-';

                const name =
                    pick(
                        employee,
                        [
                            'name',
                            'nama',
                            'namaPegawai',
                            'Nama Pegawai'
                        ]
                    ) || '-';

                const points =
                    toNumber(
                        pick(
                            employee,
                            [
                                'points',
                                'point',
                                'poin',
                                'Bobot Poin'
                            ]
                        )
                    );

                return `
                    <tr>
                        <td>${escapeHtml(no)}</td>
                        <td>${escapeHtml(position)}</td>
                        <td>
                            <strong>
                                ${escapeHtml(name)}
                            </strong>
                        </td>
                        <td class="number-cell">
                            ${formatNumber(points)}
                        </td>
                    </tr>
                `;
            }
        ).join('');
}


function getDashboardTotalPoints() {

    const d =
        state.dashboard || {};

    return toNumber(
        d.totalPoints ||
        d.totalPoin
    );
}


/* ================================================================
   23. RIWAYAT
================================================================ */

async function loadHistory() {

    try {

        const result =
            await apiRequest(
                API_ACTIONS.GET_HISTORY
            );

        state.history =
            normalizeArray(
                result,
                [
                    'history',
                    'data',
                    'rows',
                    'riwayat'
                ]
            );

        renderHistory();

        return state.history;

    } catch (error) {

        console.error(
            'loadHistory:',
            error
        );

        state.history = [];

        renderHistory();

        throw error;
    }
}


function renderHistory() {

    const tbody =
        $('historyTableBody');

    if (!tbody) return;

    if (!state.history.length) {

        tbody.innerHTML =
            emptyTableRow(
                'Belum ada riwayat transaksi.',
                6
            );

        return;
    }

    tbody.innerHTML =
        state.history.map(
            (item, index) => {

                const date =
                    pick(
                        item,
                        [
                            'date',
                            'tanggal',
                            'Tanggal'
                        ]
                    );

                const type =
                    pick(
                        item,
                        [
                            'type',
                            'jenis',
                            'Jenis'
                        ]
                    ) || '-';

                const amount =
                    toNumber(
                        pick(
                            item,
                            [
                                'amount',
                                'nominal',
                                'Nominal'
                            ]
                        )
                    );

                const description =
                    pick(
                        item,
                        [
                            'description',
                            'keterangan',
                            'keteranganSumber',
                            'Keterangan/Sumber'
                        ]
                    ) || '-';

                const allocation =
                    pick(
                        item,
                        [
                            'allocation',
                            'alokasi',
                            'Alokasi'
                        ]
                    ) || '-';

                const balance =
                    pick(
                        item,
                        [
                            'balance',
                            'saldo',
                            'saldoKas',
                            'Saldo Kas'
                        ]
                    );

                return `
                    <tr>
                        <td>${index + 1}</td>

                        <td>
                            ${escapeHtml(
                                formatDateDisplay(date)
                            )}
                        </td>

                        <td>
                            <span class="${historyTypeClass(type)}">
                                ${escapeHtml(type)}
                            </span>
                        </td>

                        <td class="money-cell">
                            ${formatRupiah(amount)}
                        </td>

                        <td>
                            ${escapeHtml(
                                allocation
                            )}
                        </td>

                        <td class="money-cell">
                            ${
                                balance !== undefined
                                    ? formatRupiah(balance)
                                    : '-'
                            }
                        </td>
                    </tr>
                `;
            }
        ).join('');
}


/* ================================================================
   24. NORMALISASI ARRAY RESPONSE
================================================================ */

function normalizeArray(
    result,
    keys = []
) {

    if (Array.isArray(result)) {
        return result;
    }

    if (!result || typeof result !== 'object') {
        return [];
    }

    for (const key of keys) {

        if (Array.isArray(result[key])) {
            return result[key];
        }
    }

    if (
        result.data &&
        Array.isArray(result.data)
    ) {

        return result.data;
    }

    if (
        result.rows &&
        Array.isArray(result.rows)
    ) {

        return result.rows;
    }

    return [];
}


/* ================================================================
   25. PICK OBJECT VALUE
================================================================ */

function pick(
    object,
    keys
) {

    if (
        !object ||
        typeof object !== 'object'
    ) {
        return undefined;
    }

    for (const key of keys) {

        if (
            Object.prototype.hasOwnProperty.call(
                object,
                key
            )
        ) {

            const value =
                object[key];

            if (
                value !== null &&
                value !== undefined &&
                value !== ''
            ) {

                return value;
            }
        }
    }

    return undefined;
}


function valueFrom(
    object,
    keys,
    fallback = 0
) {

    const value =
        pick(object, keys);

    return value !== undefined
        ? toNumber(value)
        : toNumber(fallback);
}


/* ================================================================
   26. STATUS PEMBAYARAN
================================================================ */

function isPaid(item) {

    if (!item) return false;

    const status =
        String(
            pick(
                item,
                [
                    'paymentStatus',
                    'statusPembayaran',
                    'Status Pembayaran',
                    'statusBayar',
                    'status',
                    'Status'
                ]
            ) || ''
        )
        .trim()
        .toUpperCase();

    return (
        status.includes('SUDAH') ||
        status.includes('DIBAYAR') ||
        status.includes('LUNAS') ||
        status === 'PAID'
    );
}


function statusClass(status) {

    const value =
        String(status || '')
            .toUpperCase();

    if (
        value.includes('SUDAH') ||
        value.includes('LUNAS') ||
        value.includes('PAID')
    ) {

        return 'status-badge status-paid';
    }

    if (
        value.includes('BELUM') ||
        value.includes('UNPAID')
    ) {

        return 'status-badge status-unpaid';
    }

    return 'status-badge status-info';
}


function historyTypeClass(type) {

    const value =
        String(type || '')
            .toUpperCase();

    if (
        value.includes('MASUK')
    ) {

        return 'history-income';
    }

    if (
        value.includes('KELUAR')
    ) {

        return 'history-expense';
    }

    if (
        value.includes('GAJI')
    ) {

        return 'history-salary';
    }

    return 'history-other';
}


/* ================================================================
   27. TABLE EMPTY
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
   28. TEXT HELPER
================================================================ */

function setText(
    id,
    value
) {

    const element =
        $(id);

    if (!element) return;

    element.textContent =
        value === null ||
        value === undefined
            ? ''
            : String(value);
}


/* ================================================================
   29. FORM LOADING
================================================================ */

function setFormLoading(
    form,
    loading
) {

    if (!form) return;

    const buttons =
        form.querySelectorAll(
            'button[type="submit"], button'
        );

    buttons.forEach(button => {

        if (loading) {

            if (
                !button.dataset.originalText
            ) {

                button.dataset.originalText =
                    button.innerHTML;
            }

            button.disabled = true;

            button.innerHTML =
                '⏳ Menyimpan...';

        } else {

            button.disabled = false;

            if (
                button.dataset.originalText
            ) {

                button.innerHTML =
                    button.dataset.originalText;

                delete button.dataset.originalText;
            }
        }
    });
}


function setButtonLoading(
    button,
    loading
) {

    if (!button) return;

    if (loading) {

        if (
            !button.dataset.originalText
        ) {

            button.dataset.originalText =
                button.innerHTML;
        }

        button.disabled = true;

        button.innerHTML =
            '⏳ Memproses...';

    } else {

        button.disabled = false;

        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;

            delete button.dataset.originalText;
        }
    }
}


/* ================================================================
   30. DEFAULT DATE
================================================================ */

function setDefaultDates() {

    const today =
        state.currentDate ||
        getCurrentDate();

    if ($('incomeDate')) {

        if (!$('incomeDate').value) {

            $('incomeDate').value =
                today;
        }
    }

    if ($('expenseDate')) {

        if (!$('expenseDate').value) {

            $('expenseDate').value =
                today;
        }
    }

    if ($('payrollMonth')) {

        if (!$('payrollMonth').value) {

            $('payrollMonth').value =
                state.currentMonth ||
                getCurrentMonth();
        }
    }
}


/* ================================================================
   31. NAVIGASI SIDEBAR
================================================================ */

function initNavigation() {

    const navItems =
        queryAll(
            '.nav-item[data-menu]'
        );

    navItems.forEach(item => {

        item.addEventListener(
            'click',
            event => {

                event.preventDefault();

                const target =
                    item.dataset.menu;

                if (!target) return;

                switchSection(target);

                closeSidebarMobile();
            }
        );
    });
}


function switchSection(
    sectionId
) {

    const sections =
        queryAll(
            '.content-section, section[data-section], .page-section'
        );

    let found = false;

    sections.forEach(section => {

        const id =
            section.id;

        if (id === sectionId) {

            section.classList.add(
                'active',
                'show'
            );

            section.removeAttribute(
                'hidden'
            );

            section.style.display =
                '';

            found = true;

        } else {

            section.classList.remove(
                'active',
                'show'
            );
        }
    });

    const navItems =
        queryAll(
            '.nav-item[data-menu]'
        );

    navItems.forEach(item => {

        item.classList.toggle(
            'active',
            item.dataset.menu === sectionId
        );
    });

    if (found) {

        state.currentMenu =
            sectionId;

        handleSectionLoad(sectionId);
    }
}


async function handleSectionLoad(
    sectionId
) {

    try {

        switch (sectionId) {

            case 'dashboardSection':
                await loadDashboard();
                break;

            case 'incomeSection':
                await loadIncome();
                break;

            case 'expenseSection':
                await loadExpense();
                break;

            case 'payrollSection':
                await loadPayroll(
                    $('payrollMonth')?.value ||
                    state.currentMonth
                );
                break;

            case 'cashSection':
                await loadCash();
                break;

            case 'employeeSection':
                await loadEmployees();
                break;

            case 'historySection':
                await loadHistory();
                break;

            case 'guideSection':
                break;
        }

    } catch (error) {

        showToast(
            error.message ||
            'Gagal memuat data.',
            'error'
        );
    }
}


/* ================================================================
   32. MOBILE SIDEBAR
================================================================ */

function initSidebar() {

    const menuToggle =
        $('menuToggle');

    const closeSidebar =
        $('closeSidebar');

    const overlay =
        $('sidebarOverlay');

    if (menuToggle) {

        menuToggle.addEventListener(
            'click',
            openSidebarMobile
        );
    }

    if (closeSidebar) {

        closeSidebar.addEventListener(
            'click',
            closeSidebarMobile
        );
    }

    if (overlay) {

        overlay.addEventListener(
            'click',
            closeSidebarMobile
        );
    }
}


function openSidebarMobile() {

    const sidebar =
        $('sidebar');

    const overlay =
        $('sidebarOverlay');

    if (sidebar) {

        sidebar.classList.add(
            'open',
            'active'
        );
    }

    if (overlay) {

        overlay.classList.add(
            'active',
            'show'
        );
    }

    document.body.classList.add(
        'sidebar-open'
    );
}


function closeSidebarMobile() {

    const sidebar =
        $('sidebar');

    const overlay =
        $('sidebarOverlay');

    if (sidebar) {

        sidebar.classList.remove(
            'open',
            'active'
        );
    }

    if (overlay) {

        overlay.classList.remove(
            'active',
            'show'
        );
    }

    document.body.classList.remove(
        'sidebar-open'
    );
}


/* ================================================================
   33. MODAL EVENTS
================================================================ */

function initModal() {

    const modal =
        $('confirmModal');

    const close =
        $('confirmModalClose');

    const cancel =
        $('confirmModalCancel');

    const confirm =
        $('confirmModalConfirm');

    if (close) {

        close.addEventListener(
            'click',
            closeConfirmModal
        );
    }

    if (cancel) {

        cancel.addEventListener(
            'click',
            closeConfirmModal
        );
    }

    if (confirm) {

        confirm.addEventListener(
            'click',
            confirmSalaryPayment
        );
    }

    if (modal) {

        modal.addEventListener(
            'click',
            event => {

                if (
                    event.target === modal
                ) {

                    closeConfirmModal();
                }
            }
        );
    }

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key === 'Escape'
            ) {

                closeConfirmModal();
            }
        }
    );
}


/*
   Bridge untuk inline HTML:
   window.openConfirmModal(...)
*/
window.openConfirmModal =
    openConfirmModal;


/* ================================================================
   34. FORM EVENTS
================================================================ */

function initForms() {

    const incomeForm =
        $('incomeForm');

    if (incomeForm) {

        incomeForm.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                addIncome();
            }
        );
    }

    const expenseForm =
        $('expenseForm');

    if (expenseForm) {

        expenseForm.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                addExpense();
            }
        );
    }

    const incomeAmount =
        $('incomeAmount');

    if (incomeAmount) {

        incomeAmount.addEventListener(
            'input',
            updateIncomePreview
        );
    }

    const expenseDescription =
        $('expenseDescription');

    if (expenseDescription) {

        expenseDescription.addEventListener(
            'input',
            updateDescriptionCounter
        );
    }

    const payrollMonth =
        $('payrollMonth');

    if (payrollMonth) {

        payrollMonth.addEventListener(
            'change',
            async () => {

                state.currentMonth =
                    payrollMonth.value ||
                    getCurrentMonth();

                try {

                    await loadPayroll(
                        state.currentMonth
                    );

                } catch (error) {

                    showToast(
                        error.message ||
                        'Gagal memuat penggajian.',
                        'error'
                    );
                }
            }
        );
    }
}


/* ================================================================
   35. REFRESH BUTTON
================================================================ */

function initRefreshButton() {

    const button =
        $('refreshButton');

    if (!button) return;

    button.addEventListener(
        'click',
        async () => {

            await refreshAll(
                true
            );
        }
    );
}


/* ================================================================
   36. REFRESH SEMUA DATA
================================================================ */

async function refreshAll(
    showMessage = false,
    only = null
) {

    if (state.loading) {
        return;
    }

    state.loading = true;

    if (showMessage) {

        showToast(
            'Memperbarui data...',
            'info',
            1800
        );
    }

    try {

        const targets =
            only ||
            [
                'dashboard',
                'income',
                'expense',
                'payroll',
                'cash',
                'employees',
                'history'
            ];

        const tasks = [];

        if (
            targets.includes('dashboard')
        ) {

            tasks.push(
                loadDashboard()
            );
        }

        if (
            targets.includes('income')
        ) {

            tasks.push(
                loadIncome()
            );
        }

        if (
            targets.includes('expense')
        ) {

            tasks.push(
                loadExpense()
            );
        }

        if (
            targets.includes('payroll')
        ) {

            tasks.push(
                loadPayroll(
                    state.currentMonth
                )
            );
        }

        if (
            targets.includes('cash')
        ) {

            tasks.push(
                loadCash()
            );
        }

        if (
            targets.includes('employees')
        ) {

            tasks.push(
                loadEmployees()
            );
        }

        if (
            targets.includes('history')
        ) {

            tasks.push(
                loadHistory()
            );
        }

        const results =
            await Promise.allSettled(
                tasks
            );

        const failed =
            results.filter(
                result =>
                    result.status ===
                    'rejected'
            );

        if (failed.length) {

            console.warn(
                'Sebagian data gagal dimuat:',
                failed
            );

            setConnectionStatus(
                false,
                'Sebagian data gagal'
            );

        } else {

            setConnectionStatus(
                true,
                'Terhubung'
            );
        }

        state.lastUpdated =
            new Date();

        updateHeaderDate();

        if (showMessage) {

            if (failed.length) {

                showToast(
                    'Data diperbarui sebagian.',
                    'warning'
                );

            } else {

                showToast(
                    'Data berhasil diperbarui.',
                    'success'
                );
            }
        }

    } catch (error) {

        console.error(
            'refreshAll:',
            error
        );

        setConnectionStatus(
            false,
            'Tidak terhubung'
        );

        if (showMessage) {

            showToast(
                error.message ||
                'Gagal memperbarui data.',
                'error'
            );
        }

    } finally {

        state.loading = false;
    }
}


/* ================================================================
   37. TEST CONNECTION
================================================================ */

async function testConnection() {

    try {

        const result =
            await apiRequest(
                API_ACTIONS.INFO
            );

        setConnectionStatus(
            true,
            'Terhubung'
        );

        if (result) {

            if (
                result.currentDate
            ) {

                state.currentDate =
                    result.currentDate;
            }

            if (
                result.currentMonth
            ) {

                state.currentMonth =
                    result.currentMonth;
            }

            if (
                result.dashboard
            ) {

                state.dashboard =
                    result.dashboard;

                updateDashboardUI();
            }
        }

        return true;

    } catch (error) {

        console.error(
            'testConnection:',
            error
        );

        setConnectionStatus(
            false,
            'Tidak terhubung'
        );

        return false;
    }
}


/* ================================================================
   38. INITIALIZE
================================================================ */

async function initializeApp() {

    if (state.initialized) {
        return;
    }

    showLoader(true);

    state.currentDate =
        getCurrentDate();

    state.currentMonth =
        getCurrentMonth();

    updateHeaderDate();

    setDefaultDates();

    initNavigation();

    initSidebar();

    initModal();

    initForms();

    initRefreshButton();

    updateIncomePreview();

    updateDescriptionCounter();

    /*
       Dashboard adalah tampilan pertama.
    */

    switchSection(
        'dashboardSection'
    );

    /*
       Tes koneksi terlebih dahulu.
    */

    const connected =
        await testConnection();

    if (!connected) {

        showToast(
            'Belum dapat terhubung ke Code.gs. Periksa API_URL.',
            'error',
            5000
        );

    } else {

        /*
           Setelah koneksi berhasil,
           ambil semua data.
        */

        await refreshAll(
            false
        );
    }

    state.initialized =
        true;

    showLoader(false);

    /*
       Auto refresh.
    */

    if (
        CONFIG.AUTO_REFRESH
    ) {

        setInterval(
            async () => {

                if (
                    document.hidden
                ) {
                    return;
                }

                await refreshAll(
                    false
                );

            },
            CONFIG.REFRESH_INTERVAL
        );
    }
}


/* ================================================================
   39. EVENT DOM READY
================================================================ */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializeApp
    );

} else {

    initializeApp();
}


/* ================================================================
   40. PUBLIC API
   Agar inline HTML atau debugging dapat mengakses fungsi.
================================================================ */

window.KeuanganPokja = {

    state,

    config: CONFIG,

    refreshAll,

    loadDashboard,

    loadIncome,

    addIncome,

    loadExpense,

    addExpense,

    loadPayroll,

    loadCash,

    loadEmployees,

    loadHistory,

    openConfirmModal,

    closeConfirmModal,

    openSalaryPaymentByIndex,

    confirmSalaryPayment,

    updateIncomePreview,

    updateDescriptionCounter,

    formatRupiah,

    formatNumber

};


/* ================================================================
   41. COMPATIBILITY ALIAS
   Menjamin nama fungsi lama tetap tersedia jika dipanggil
   oleh elemen HTML.
================================================================ */

window.addIncome =
    addIncome;

window.addExpense =
    addExpense;

window.openSalaryPaymentByIndex =
    openSalaryPaymentByIndex;

window.openConfirmModal =
    openConfirmModal;

window.closeConfirmModal =
    closeConfirmModal;

window.confirmSalaryPayment =
    confirmSalaryPayment;


/* ================================================================
   END OF SCRIPT.JS
================================================================ */
