'use strict';

const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

/* In-memory cache + JSON file persistence */
var orders = {};

/* Load existing orders from disk on startup */
try {
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  }
} catch (e) {
  console.warn('[order-store] Failed to load orders file:', e.message);
}

var _writing = false;
var _pendingWrite = false;

function persist() {
  if (_writing) {
    _pendingWrite = true;
    return;
  }
  _writing = true;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('[order-store] Failed to create data dir:', e.message);
    _writing = false;
    return;
  }
  fs.writeFile(ORDERS_FILE, JSON.stringify(orders), 'utf-8', function (err) {
    _writing = false;
    if (err) console.warn('[order-store] Failed to persist orders:', err.message);
    if (_pendingWrite) {
      _pendingWrite = false;
      persist();
    }
  });
}

function saveOrder(orderId, orderData) {
  if (!orderId) return;
  orders[orderId] = orderData;
  persist();
}

function getOrder(orderId) {
  if (!orderId) return null;
  return orders[orderId] || null;
}

module.exports = { saveOrder, getOrder };
