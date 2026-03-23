'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '..', 'public', 'PENGER.svg');

/* Pricing constants (EUR) */
const BASE_PRICE = 49;
const EXTRA_PLATE = 35;
const SLEEVE_PRICE = 10;
const PUNCH_PRICE = 10;

/**
 * Generate a Ukrainian invoice (рахунок-фактура) PDF.
 * @param {Object} order - Order data from sessionStorage
 * @param {string} orderId - Invoice/order ID
 * @param {{ rate: number, date: string }} nbu - NBU EUR/UAH rate
 * @returns {PDFDocument} - Readable stream
 */
function generateInvoicePdf(order, orderId, nbu) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 44, right: 44 },
    info: {
      Title: 'Рахунок-фактура №' + orderId,
      Author: 'PENGER',
    },
  });

  /* Register Cyrillic-capable fonts */
  const FONT_DIR = path.join(__dirname, '..', 'fonts');
  doc.registerFont('NotoSans', path.join(FONT_DIR, 'NotoSans-Regular.ttf'));
  doc.registerFont('NotoSans-Bold', path.join(FONT_DIR, 'NotoSans-Bold.ttf'));

  const W = 595.28 - 44 - 44; // usable width
  const rate = nbu.rate || 45;
  const rateDate = nbu.date || '—';

  /* ---- Seller details ---- */
  const seller = {
    name: 'Суслов Гліб Максимович',
    code: '3924501311',
    iban: 'UA103220010000026206345975321',
    bank: 'АТ "Універсал Банк" (ЄДРПОУ: 21133352, МФО: 322001)',
    address: '04080, м. Київ, вул. Кирилівська, 13-А',
  };

  /* ---- Contact / Address ---- */
  const c = order.contact || {};
  const a = order.address || {};
  const buyerName = ((c.firstName || '') + ' ' + (c.lastName || '')).trim() || '—';
  const buyerEmail = c.email || '—';
  const buyerPhone = c.phone || '—';
  const addrParts = [a.street, a.apt, a.city, a.zip, a.country].filter(Boolean);
  const buyerAddr = addrParts.join(', ') || '—';

  /* ---- Date ---- */
  const now = new Date();
  const dateStr = now.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });
  const shortDate = now.toLocaleDateString('uk-UA', { year: 'numeric', month: '2-digit', day: '2-digit' });

  /* ===== HEADER ===== */
  // Logo
  try {
    const svgContent = fs.readFileSync(LOGO_PATH, 'utf-8');
    doc.save();
    doc.translate(44, doc.y);
    doc.scale(0.45);
    doc.path('M0 47.1818V0.636368H20.0909C23.5455 0.636368 26.5682 1.31819 29.1591 2.68182C31.75 4.04546 33.7652 5.96213 35.2045 8.43182C36.6439 10.9015 37.3636 13.7879 37.3636 17.0909C37.3636 20.4242 36.6212 23.3106 35.1364 25.75C33.6667 28.1894 31.5985 30.0682 28.9318 31.3864C26.2803 32.7046 23.1818 33.3636 19.6364 33.3636H7.63636V23.5455H17.0909C18.5758 23.5455 19.8409 23.2879 20.8864 22.7727C21.947 22.2424 22.7576 21.4924 23.3182 20.5227C23.8939 19.553 24.1818 18.4091 24.1818 17.0909C24.1818 15.7576 23.8939 14.6212 23.3182 13.6818C22.7576 12.7273 21.947 12 20.8864 11.5C19.8409 10.9849 18.5758 10.7273 17.0909 10.7273H12.6364V47.1818H0ZM40.08 47.1818V0.636368H73.6255V10.8182H52.7164V18.8182H71.8982V29H52.7164V37H73.5345V47.1818H40.08ZM118.245 0.636368V47.1818H107.7L90.8816 22.7273H90.6089V47.1818H77.9725V0.636368H88.6998L105.245 25H105.609V0.636368H118.245ZM152.53 16C152.333 15.197 152.022 14.4924 151.598 13.8864C151.174 13.2652 150.643 12.7424 150.007 12.3182C149.386 11.8788 148.659 11.553 147.825 11.3409C147.007 11.1136 146.106 11 145.121 11C142.999 11 141.189 11.5076 139.689 12.5227C138.204 13.5379 137.068 15 136.28 16.9091C135.507 18.8182 135.121 21.1212 135.121 23.8182C135.121 26.5455 135.492 28.8788 136.234 30.8182C136.977 32.7576 138.083 34.2424 139.552 35.2727C141.022 36.303 142.848 36.8182 145.03 36.8182C146.954 36.8182 148.552 36.5379 149.825 35.9773C151.113 35.4167 152.075 34.6212 152.712 33.5909C153.348 32.5606 153.666 31.3485 153.666 29.9545L155.848 30.1818H145.212V21.1818H165.848V27.6364C165.848 31.8788 164.946 35.5076 163.143 38.5227C161.356 41.5227 158.886 43.8258 155.734 45.4318C152.598 47.0227 148.999 47.8182 144.939 47.8182C140.409 47.8182 136.431 46.8561 133.007 44.9318C129.583 43.0076 126.909 40.2652 124.984 36.7046C123.075 33.1439 122.121 28.9091 122.121 24C122.121 20.1515 122.704 16.7424 123.871 13.7727C125.052 10.803 126.689 8.29546 128.78 6.25C130.871 4.1894 133.287 2.63637 136.03 1.59091C138.772 0.530306 141.712 3.8147e-06 144.848 3.8147e-06C147.606 3.8147e-06 150.166 0.393944 152.53 1.18182C154.909 1.95455 157.007 3.06061 158.825 4.5C160.659 5.92425 162.136 7.61364 163.257 9.56819C164.378 11.5227 165.06 13.6667 165.302 16H152.53ZM169.82 47.1818V0.636368H203.365V10.8182H182.456V18.8182H201.638V29H182.456V37H203.275V47.1818H169.82ZM207.712 47.1818V0.636368H227.803C231.258 0.636368 234.281 1.26516 236.872 2.52273C239.462 3.78031 241.478 5.59091 242.917 7.95455C244.356 10.3182 245.076 13.1515 245.076 16.4545C245.076 19.7879 244.334 22.5985 242.849 24.8864C241.379 27.1742 239.311 28.9015 236.644 30.0682C233.993 31.2349 230.894 31.8182 227.349 31.8182H215.349V22H224.803C226.288 22 227.553 21.8182 228.599 21.4545C229.659 21.0758 230.47 20.4773 231.031 19.6591C231.606 18.8409 231.894 17.7727 231.894 16.4545C231.894 15.1212 231.606 14.0379 231.031 13.2046C230.47 12.3561 229.659 11.7349 228.599 11.3409C227.553 10.9318 226.288 10.7273 224.803 10.7273H220.349V47.1818H207.712ZM234.985 25.8182L246.622 47.1818H232.894L221.531 25.8182H234.985Z').fill('#000');
    doc.restore();
    doc.y = 40; // reset y after logo
  } catch (e) { /* logo not found, skip */ }

  // Title (right-aligned)
  doc.font('NotoSans-Bold').fontSize(16);
  doc.text('РАХУНОК-ФАКТУРА', 44, 42, { width: W, align: 'right' });
  doc.font('NotoSans').fontSize(10);
  doc.text('№' + orderId + ' від ' + dateStr, 44, 62, { width: W, align: 'right' });

  // Divider
  doc.y = 82;
  doc.moveTo(44, doc.y).lineTo(44 + W, doc.y).lineWidth(2).stroke('#111');
  doc.y += 14;

  /* ===== PARTIES ===== */
  const partiesY = doc.y;
  const halfW = (W - 16) / 2;

  // Seller block
  drawPartyBlock(doc, 44, partiesY, halfW, 'ПОСТАЧАЛЬНИК', [
    ['ФОП:', seller.name],
    ['ІПН:', seller.code],
    ['IBAN:', seller.iban],
    ['Банк:', seller.bank],
    ['Адреса:', seller.address],
  ]);

  // Buyer block
  drawPartyBlock(doc, 44 + halfW + 16, partiesY, halfW, 'ПОКУПЕЦЬ', [
    ['ПІБ:', buyerName],
    ['Email:', buyerEmail],
    ['Тел.:', buyerPhone],
    ['Адреса:', buyerAddr],
  ]);

  doc.y = partiesY + 120;

  /* ===== EXCHANGE RATE ===== */
  doc.y += 6;
  doc.roundedRect(44, doc.y, 260, 20, 3).fill('#FFFFFF').stroke('#111111');
  doc.fill('#111111').font('NotoSans-Bold').fontSize(8);
  doc.text('Курс НБУ на ' + rateDate + ':  1 EUR = ' + rate.toFixed(4) + ' UAH', 52, doc.y + 5);
  doc.fill('#000');
  doc.y += 30;

  /* ===== TABLE ===== */
  const items = buildItems(order);
  const orderTotal = parseFloat(order.value) || items.reduce(function (s, i) { return s + i.amount; }, 0);
  const orderTotalUah = orderTotal * rate;

  const cols = [
    { label: '№', w: 28, align: 'center' },
    { label: 'Найменування товару/послуги', w: W - 28 - 42 - 34 - 72 - 72 - 80, align: 'left' },
    { label: 'К-сть', w: 42, align: 'center' },
    { label: 'Од.', w: 34, align: 'center' },
    { label: 'Ціна, EUR', w: 72, align: 'right' },
    { label: 'Сума, EUR', w: 72, align: 'right' },
    { label: 'Сума, UAH', w: 80, align: 'right' },
  ];

  drawTable(doc, 44, doc.y, cols, items, rate);

  doc.y += 8;

  /* ===== TOTALS ===== */
  // EUR total box
  const totalText = 'Всього до сплати:  ' + fmtEur(orderTotal) + ' EUR';
  doc.font('NotoSans-Bold').fontSize(11);
  const tbW = doc.widthOfString(totalText) + 28;
  const tbX = 44 + W - tbW;
  doc.rect(tbX, doc.y, tbW, 24).lineWidth(1.5).stroke('#111');
  doc.text(totalText, tbX + 14, doc.y + 7);

  doc.y += 30;

  // UAH total box
  const uahText = 'В т.ч. у гривнях:  ' + fmtUah(orderTotalUah) + ' UAH';
  const ubW = doc.widthOfString(uahText) + 28;
  const ubX = 44 + W - ubW;
  doc.rect(ubX, doc.y, ubW, 24).lineWidth(1.5).stroke('#111111');
  doc.fill('#111111').text(uahText, ubX + 14, doc.y + 7);
  doc.fill('#000');

  doc.y += 36;

  /* ===== PAYMENT PURPOSE ===== */
  const purposeH = 44;
  doc.rect(44, doc.y, W, purposeH).fill('#FFFFFF').stroke('#999999');
  doc.moveTo(44, doc.y).lineTo(44, doc.y + purposeH).lineWidth(3).stroke('#111111');

  doc.fill('#111111').font('NotoSans-Bold').fontSize(8);
  doc.text('ПРИЗНАЧЕННЯ ПЛАТЕЖУ:', 54, doc.y + 8);

  doc.fill('#1a1a1a').font('NotoSans').fontSize(9);
  const purposeStr = 'Оплата за товар згідно рахунку-фактури №' + orderId + ' від ' + shortDate +
    '. Сума: ' + fmtEur(orderTotal) + ' EUR (' + fmtUah(orderTotalUah) + ' UAH). Без ПДВ.';
  doc.text(purposeStr, 54, doc.y + 22, { width: W - 24 });

  doc.y += purposeH + 40;

  /* ===== SIGNATURE ===== */
  const sigX = 44;
  doc.moveTo(sigX, doc.y).lineTo(sigX + 200, doc.y).lineWidth(0.5).stroke('#999');
  doc.font('NotoSans').fontSize(9).fill('#888');
  doc.text('Постачальник', sigX, doc.y + 4, { width: 200, align: 'center' });
  doc.font('NotoSans-Bold').fontSize(8).fill('#555');
  doc.text(seller.name, sigX, doc.y + 16, { width: 200, align: 'center' });

  /* ===== FOOTER ===== */
  doc.font('NotoSans').fontSize(7).fill('#bbb');
  doc.text('PENGER — BIP39 SELF-CUSTODY TOOLS', 44, 800, { width: W, align: 'center' });

  doc.end();
  return doc;
}

/* ---- Helpers ---- */

function drawPartyBlock(doc, x, y, w, title, rows) {
  doc.roundedRect(x, y, w, 110, 4).fill('#FFFFFF').stroke('#CCCCCC');

  doc.fill('#999').font('NotoSans-Bold').fontSize(7);
  doc.text(title, x + 10, y + 8, { width: w - 20 });

  doc.moveTo(x + 10, y + 20).lineTo(x + w - 10, y + 20).lineWidth(0.5).stroke('#CCCCCC');

  let rowY = y + 26;
  rows.forEach(function (r) {
    doc.fill('#888').font('NotoSans').fontSize(8);
    doc.text(r[0], x + 10, rowY, { width: 46 });
    doc.fill('#1a1a1a').font('NotoSans-Bold').fontSize(8);
    doc.text(r[1], x + 58, rowY, { width: w - 68 });
    rowY += 16;
  });
}

function drawTable(doc, x, y, cols, items, rate) {
  const rowH = 22;
  const headerH = 22;

  // Header
  let cx = x;
  doc.rect(x, y, cols.reduce(function (s, c) { return s + c.w; }, 0), headerH).fill('#111');

  cols.forEach(function (col) {
    doc.fill('#fff').font('NotoSans-Bold').fontSize(7);
    doc.text(col.label, cx + 4, y + 7, { width: col.w - 8, align: col.align });
    cx += col.w;
  });

  let ry = y + headerH;

  // Body rows
  items.forEach(function (item, idx) {
    const bg = '#FFFFFF';
    const totalW = cols.reduce(function (s, c) { return s + c.w; }, 0);
    doc.rect(x, ry, totalW, rowH).fill(bg);

    // Draw cell borders
    let bx = x;
    cols.forEach(function (col) {
      doc.rect(bx, ry, col.w, rowH).stroke('#D4D4D4');
      bx += col.w;
    });

    const uahAmount = item.amount * rate;

    cx = x;
    var cellData = [
      { val: String(item.n), align: 'center' },
      { val: item.desc, align: 'left' },
      { val: String(item.qty), align: 'center' },
      { val: item.unit, align: 'center' },
      { val: fmtEur(item.price), align: 'right' },
      { val: fmtEur(item.amount), align: 'right' },
      { val: fmtUah(uahAmount), align: 'right' },
    ];

    cellData.forEach(function (cell, ci) {
      doc.fill('#1a1a1a').font('NotoSans').fontSize(8);
      doc.text(cell.val, cx + 4, ry + 7, { width: cols[ci].w - 8, align: cell.align });
      cx += cols[ci].w;
    });

    ry += rowH;
  });

  // Footer row
  var totalW = cols.reduce(function (s, c) { return s + c.w; }, 0);
  doc.rect(x, ry, totalW, rowH).fill('#F5F5F5').stroke('#D4D4D4');

  var labelW = cols.slice(0, 5).reduce(function (s, c) { return s + c.w; }, 0);
  doc.fill('#1a1a1a').font('NotoSans-Bold').fontSize(8);
  doc.text('Разом до сплати:', x + 4, ry + 7, { width: labelW - 8, align: 'right' });

  var eurTotal = items.reduce(function (s, i) { return s + i.amount; }, 0);
  var uahTotal = eurTotal * rate;

  doc.text(fmtEur(parseFloat(items._orderTotal || eurTotal)), x + labelW + 4, ry + 7, { width: cols[5].w - 8, align: 'right' });
  doc.fill('#1a1a1a').text(fmtUah(parseFloat(items._orderTotalUah || uahTotal)), x + labelW + cols[5].w + 4, ry + 7, { width: cols[6].w - 8, align: 'right' });

  doc.y = ry + rowH;
}

function buildItems(order) {
  var items = [];
  var n = 0;

  n++;
  items.push({ n: n, desc: 'Комплект PENGER v1.0 (титанові пластини BIP39)', qty: 1, unit: 'шт.', price: BASE_PRICE, amount: BASE_PRICE });

  var plates = parseInt(order.plates, 10) || 3;
  if (plates > 3) {
    var extra = plates - 3;
    n++;
    items.push({ n: n, desc: 'Додаткові титанові пластини (×' + extra + ')', qty: extra, unit: 'шт.', price: EXTRA_PLATE, amount: extra * EXTRA_PLATE });
  }

  n++;
  items.push({ n: n, desc: 'Захисний чохол', qty: 1, unit: 'шт.', price: SLEEVE_PRICE, amount: SLEEVE_PRICE });

  if (order.punchTool) {
    n++;
    items.push({ n: n, desc: 'Кернер для маркування', qty: 1, unit: 'шт.', price: PUNCH_PRICE, amount: PUNCH_PRICE });
  }

  var shipping = parseFloat(order.shipping) || 0;
  if (shipping > 0) {
    n++;
    items.push({ n: n, desc: 'Доставка', qty: 1, unit: 'послуга', price: shipping, amount: shipping });
  }

  var discount = parseFloat(order.discount) || 0;
  if (discount > 0) {
    n++;
    var discDesc = 'Знижка';
    if (order.promo) discDesc += ' (' + order.promo + ')';
    items.push({ n: n, desc: discDesc, qty: 1, unit: '—', price: -discount, amount: -discount });
  }

  return items;
}

function fmtEur(v) {
  var n = parseFloat(v);
  if (isNaN(n)) return '0.00';
  var prefix = n < 0 ? '-' : '';
  return prefix + '€' + Math.abs(n).toFixed(2);
}

function fmtUah(v) {
  var n = parseFloat(v);
  if (isNaN(n)) return '0.00';
  var prefix = n < 0 ? '-' : '';
  return prefix + Math.abs(n).toFixed(2) + ' ₴';
}

module.exports = { generateInvoicePdf };
