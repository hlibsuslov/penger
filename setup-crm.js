#!/usr/bin/env node
/**
 * Penger CRM — Google Sheets setup script
 * Creates a full CRM spreadsheet with orders, statuses, and analytics.
 *
 * Usage: node setup-crm.js [spreadsheetId]
 *
 * Reads credentials from .env:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 *   CRM_SPREADSHEET_ID  (or pass as CLI arg)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = process.argv[2] || process.env.CRM_SPREADSHEET_ID || '';
const SHARE_EMAIL = 'glebsuslov720@gmail.com';
const TITLE = 'CRM — Penger';

// ── Colour palette ──────────────────────────────────────────────
const C = {
  headerBg:   { red: 0.10, green: 0.10, blue: 0.10 },
  headerFg:   { red: 1,    green: 1,    blue: 1    },
  rowEven:    { red: 0.95, green: 0.95, blue: 0.97 },
  rowOdd:     { red: 1,    green: 1,    blue: 1    },
  // status colours
  new:        { red: 0.85, green: 0.92, blue: 1    },
  awaiting:   { red: 1,    green: 0.95, blue: 0.80 },
  confirming: { red: 1,    green: 0.90, blue: 0.70 },
  paid:       { red: 0.80, green: 0.95, blue: 0.80 },
  shipped:    { red: 0.85, green: 0.90, blue: 1    },
  delivered:  { red: 0.70, green: 0.92, blue: 0.70 },
  expired:    { red: 0.95, green: 0.85, blue: 0.85 },
  failed:     { red: 1,    green: 0.80, blue: 0.80 },
  cancelled:  { red: 0.90, green: 0.90, blue: 0.90 },
  refunded:   { red: 0.92, green: 0.85, blue: 0.95 },
};

const STATUSES = [
  'Новая',
  'Ожидание оплаты',
  'Подтверждение',
  'Оплачена',
  'Отправлена',
  'Доставлена',
  'Истекла',
  'Ошибка оплаты',
  'Отменена',
  'Возврат',
];

const STATUS_COLOURS = {
  'Новая':             C.new,
  'Ожидание оплаты':   C.awaiting,
  'Подтверждение':     C.confirming,
  'Оплачена':          C.paid,
  'Отправлена':        C.shipped,
  'Доставлена':        C.delivered,
  'Истекла':           C.expired,
  'Ошибка оплаты':     C.failed,
  'Отменена':          C.cancelled,
  'Возврат':           C.refunded,
};

const SOURCES = ['Сайт', 'Telegram', 'Дропшиппинг', 'Реферал', 'Instagram', 'Другое'];

// ── Headers for "Заявки" ────────────────────────────────────────
const HEADERS = [
  'ID',
  'Дата',
  'Источник',
  'Имя',
  'Фамилия',
  'Email',
  'Телефон',
  'Страна',
  'Город',
  'Адрес',
  'Индекс',
  'Кол-во плейтов',
  'Цвета чехлов',
  'Панч-тул',
  'Способ оплаты',
  'Промокод',
  'Сумма (EUR)',
  'Статус',
  'Ответственный',
  'Комментарий',
  'Дата обновления',
];

const COL_WIDTHS = [
  100, 120, 120, 120, 120, 200, 140, 80, 120, 200, 80,
  80, 140, 80, 140, 110, 100, 140, 130, 250, 140,
];

// ── Test data ───────────────────────────────────────────────────
const TEST_ROWS = [
  ['PG-10001', '2026-03-20', 'Сайт',         'Олександр', 'Петренко',  'alex.p@gmail.com',     '+380501234567', 'UA', 'Київ',     'вул. Хрещатик 10, кв. 5', '01001', 2, 'black, red',    'Да',  'crypto (SOL)',  'PENGER10', 94.00,  'Оплачена',         'Глеб',   'Постійний клієнт',           '2026-03-20'],
  ['PG-10002', '2026-03-21', 'Telegram',      'Max',       'Müller',   'max.m@proton.me',      '+4917612345678', 'DE', 'Berlin',   'Friedrichstr. 42',         '10117', 1, 'black',         'Нет', 'crypto (USDC)', '',         49.00,  'Отправлена',       'Глеб',   '',                            '2026-03-22'],
  ['PG-10003', '2026-03-22', 'Реферал',       'Sarah',     'Connor',   'sarah.c@outlook.com',  '+14155557890',   'US', 'New York', '221B Baker St, Apt 3',     '10001', 3, 'blue, coffee, black', 'Да', 'crypto (SOL)', 'CRAFT2026', 129.00, 'Ожидание оплаты', 'Глеб',   'Реферал від CRAFT2026',      '2026-03-22'],
  ['PG-10004', '2026-03-23', 'Дропшиппинг',   'Іван',      'Коваль',   'ivan.k@ukr.net',       '+380671112233',  'UA', 'Львів',   'НП Відділення №12',        '79000', 1, 'coffee',        'Нет', 'ua-cod',        '',         59.00,  'Новая',            '',       'Накладений платіж',          '2026-03-23'],
  ['PG-10005', '2026-03-24', 'Instagram',      'Emma',      'Larsson',  'emma.l@icloud.com',    '+46701234567',   'SE', 'Stockholm','Drottninggatan 15',        '11151', 4, 'red, red, blue, black', 'Да', 'crypto (USDC)', '', 164.00, 'Подтверждение',   'Глеб',   'Великий ордер, перевірити',   '2026-03-24'],
];

// ── Main ────────────────────────────────────────────────────────
async function main() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey  = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.error('Missing env vars. Set in .env:');
    console.error('  GOOGLE_SERVICE_ACCOUNT_EMAIL=...');
    console.error('  GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive  = google.drive({ version: 'v3', auth });

  // ── 1. Use existing spreadsheet (user creates it, SA populates) ──
  if (!SPREADSHEET_ID) {
    console.error('Usage: node setup-crm.js <credentials.json> <spreadsheetId>');
    console.error('\nService accounts have 0 storage quota, so YOU must create the spreadsheet:');
    console.error('1. Go to https://sheets.new');
    console.error(`2. Share it (Editor) with: ${clientEmail}`);
    console.error('3. Copy the spreadsheet ID from the URL and pass it as 3rd argument');
    process.exit(1);
  }

  const spreadsheetId = SPREADSHEET_ID;
  console.log(`Using spreadsheet: ${spreadsheetId}`);

  // ── 2. Set up sheets structure ─────────────────────────────
  console.log('Setting up sheets…');
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets.map(s => s.properties.title);
  const defaultSheetId = meta.data.sheets[0].properties.sheetId;

  const setupRequests = [
    { updateSpreadsheetProperties: { properties: { title: TITLE, locale: 'uk_UA' }, fields: 'title,locale' } },
    { updateSheetProperties: { properties: { sheetId: defaultSheetId, title: 'Заявки', gridProperties: { frozenRowCount: 1, rowCount: 500, columnCount: HEADERS.length } }, fields: 'title,gridProperties.frozenRowCount,gridProperties.rowCount,gridProperties.columnCount' } },
  ];

  // Only add new sheets if they don't exist
  if (!existingSheets.includes('Статусы')) {
    setupRequests.push({ addSheet: { properties: { title: 'Статусы', index: 1, gridProperties: { frozenRowCount: 1, rowCount: 20, columnCount: 3 } } } });
  }
  if (!existingSheets.includes('Аналитика')) {
    setupRequests.push({ addSheet: { properties: { title: 'Аналитика', index: 2, gridProperties: { frozenRowCount: 1, rowCount: 30, columnCount: 5 } } } });
  }

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: setupRequests } });

  // Re-fetch to get all sheet IDs + existing banded ranges
  const meta2 = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetIds = meta2.data.sheets.map(s => s.properties.sheetId);

  // Remove existing banded ranges and conditional format rules to allow re-run
  const cleanupRequests = [];
  for (const sheet of meta2.data.sheets) {
    if (sheet.bandedRanges) {
      for (const br of sheet.bandedRanges) {
        cleanupRequests.push({ deleteBanding: { bandedRangeId: br.bandedRangeId } });
      }
    }
    if (sheet.conditionalFormats) {
      for (let i = sheet.conditionalFormats.length - 1; i >= 0; i--) {
        cleanupRequests.push({ deleteConditionalFormatRule: { sheetId: sheet.properties.sheetId, index: i } });
      }
    }
  }
  if (cleanupRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: cleanupRequests } });
  }

  // ── 3. Write data ──────────────────────────────────────────
  console.log('Writing data…');

  // Заявки – headers + test data
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Заявки!A1', values: [HEADERS, ...TEST_ROWS] },
        {
          range: 'Статусы!A1',
          values: [
            ['Статус', 'Описание', 'Цвет'],
            ['Новая',             'Заявка щойно надійшла',                    '🔵'],
            ['Ожидание оплаты',   'Інвойс створено, чекаємо оплату',         '🟡'],
            ['Подтверждение',     'Транзакція в мережі, підтверджуємо',      '🟠'],
            ['Оплачена',          'Оплата підтверджена',                      '🟢'],
            ['Отправлена',        'Відправлено поштою/НП',                    '🔷'],
            ['Доставлена',        'Клієнт отримав замовлення',               '✅'],
            ['Истекла',           'Час на оплату вийшов',                     '🔴'],
            ['Ошибка оплаты',     'Помилка при оплаті',                      '❌'],
            ['Отменена',          'Скасовано клієнтом або нами',             '⚫'],
            ['Возврат',           'Повернення коштів',                        '🟣'],
          ],
        },
        {
          range: 'Аналитика!A1',
          values: [
            ['Метрика', 'Значение', '', 'Источник', 'Кол-во заявок'],
            ...STATUSES.map(s => [`Статус: ${s}`, `=COUNTIF(Заявки!R2:R500,"${s}")`]),
            [],
            ['Всего заявок', '=COUNTA(Заявки!A2:A500)'],
            ['Оплачено (EUR)', '=SUMPRODUCT((Заявки!R2:R500="Оплачена")*(Заявки!Q2:Q500))'],
            ['Конверсия в оплату', '=IF(COUNTA(Заявки!A2:A500)=0,0,COUNTIF(Заявки!R2:R500,"Оплачена")/COUNTA(Заявки!A2:A500))'],
          ],
        },
        {
          range: 'Аналитика!D2',
          values: SOURCES.map(s => [s, `=COUNTIF(Заявки!C2:C500,"${s}")`]),
        },
      ],
    },
  });

  // ── 4. Formatting requests ─────────────────────────────────
  console.log('Applying formatting…');

  const requests = [];
  const [sheetZajavki, sheetStatuses, sheetAnalytics] = sheetIds;

  // — Column widths for Заявки
  HEADERS.forEach((_, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: sheetZajavki, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: COL_WIDTHS[i] || 120 },
        fields: 'pixelSize',
      },
    });
  });

  // — Header row formatting (all sheets)
  [sheetZajavki, sheetStatuses, sheetAnalytics].forEach((sid, idx) => {
    const colCount = idx === 0 ? HEADERS.length : idx === 1 ? 3 : 5;
    requests.push({
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
        cell: {
          userEnteredFormat: {
            backgroundColor: C.headerBg,
            textFormat: { foregroundColor: C.headerFg, bold: true, fontSize: 11 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });
  });

  // — Alternating row colors on Заявки
  requests.push({
    addBanding: {
      bandedRange: {
        range: { sheetId: sheetZajavki, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 0, endColumnIndex: HEADERS.length },
        rowProperties: {
          firstBandColor: C.rowOdd,
          secondBandColor: C.rowEven,
        },
      },
    },
  });

  // — Data validation: Status column (R = index 17)
  requests.push({
    setDataValidation: {
      range: { sheetId: sheetZajavki, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 17, endColumnIndex: 18 },
      rule: {
        condition: { type: 'ONE_OF_LIST', values: STATUSES.map(v => ({ userEnteredValue: v })) },
        showCustomUi: true,
        strict: true,
      },
    },
  });

  // — Data validation: Source column (C = index 2)
  requests.push({
    setDataValidation: {
      range: { sheetId: sheetZajavki, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 2, endColumnIndex: 3 },
      rule: {
        condition: { type: 'ONE_OF_LIST', values: SOURCES.map(v => ({ userEnteredValue: v })) },
        showCustomUi: true,
        strict: false,
      },
    },
  });

  // — Data validation: Панч-тул column (N = index 13)
  requests.push({
    setDataValidation: {
      range: { sheetId: sheetZajavki, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 13, endColumnIndex: 14 },
      rule: {
        condition: { type: 'ONE_OF_LIST', values: [{ userEnteredValue: 'Да' }, { userEnteredValue: 'Нет' }] },
        showCustomUi: true,
        strict: true,
      },
    },
  });

  // — Conditional formatting per status (column R = index 17)
  Object.entries(STATUS_COLOURS).forEach(([status, color]) => {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: sheetZajavki, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 0, endColumnIndex: HEADERS.length }],
          booleanRule: {
            condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: `=$R2="${status}"` }] },
            format: { backgroundColor: color },
          },
        },
        index: 0,
      },
    });
  });

  // — Date column format (B = index 1, U = index 20)
  [1, 20].forEach(col => {
    requests.push({
      repeatCell: {
        range: { sheetId: sheetZajavki, startRowIndex: 1, endRowIndex: 500, startColumnIndex: col, endColumnIndex: col + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'yyyy-MM-dd' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  });

  // — EUR column format (Q = index 16)
  requests.push({
    repeatCell: {
      range: { sheetId: sheetZajavki, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 16, endColumnIndex: 17 },
      cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '€#,##0.00' } } },
      fields: 'userEnteredFormat.numberFormat',
    },
  });

  // — Percentage format for conversion cell in Analytics
  requests.push({
    repeatCell: {
      range: { sheetId: sheetAnalytics, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 1, endColumnIndex: 2 },
      cell: { userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.0%' } } },
      fields: 'userEnteredFormat.numberFormat',
    },
  });

  // — Bold labels in Analytics
  requests.push({
    repeatCell: {
      range: { sheetId: sheetAnalytics, startRowIndex: 1, endRowIndex: 20, startColumnIndex: 0, endColumnIndex: 1 },
      cell: { userEnteredFormat: { textFormat: { bold: true } } },
      fields: 'userEnteredFormat.textFormat.bold',
    },
  });
  requests.push({
    repeatCell: {
      range: { sheetId: sheetAnalytics, startRowIndex: 1, endRowIndex: 10, startColumnIndex: 3, endColumnIndex: 4 },
      cell: { userEnteredFormat: { textFormat: { bold: true } } },
      fields: 'userEnteredFormat.textFormat.bold',
    },
  });

  // — Column widths for Статусы
  [200, 300, 50].forEach((px, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: sheetStatuses, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px },
        fields: 'pixelSize',
      },
    });
  });

  // — Column widths for Аналитика
  [220, 140, 30, 160, 140].forEach((px, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: sheetAnalytics, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px },
        fields: 'pixelSize',
      },
    });
  });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });

  // ── Done ───────────────────────────────────────────────────
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  console.log('\n✓ CRM создана успешно!');
  console.log(`\n  ${url}\n`);
  console.log(`Доступ Editor → ${SHARE_EMAIL}`);
  console.log('Листы: Заявки | Статусы | Аналитика');
  console.log('Тестовых заявок: 5\n');
}

main().catch(err => {
  console.error('Error:', err.message || err);
  if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
