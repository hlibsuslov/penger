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

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders), 'utf-8');
  } catch (e) {
    console.warn('[order-store] Failed to persist orders:', e.message);
  }
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
