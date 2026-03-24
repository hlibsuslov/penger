'use strict';

const { EventEmitter } = require('events');

/**
 * Central event bus for PENGER.
 *
 * Events:
 *   invoice:created   — new invoice created (orderData, invoice)
 *   invoice:status    — status changed (invoice, oldStatus, newStatus)
 *   invoice:paid      — payment confirmed (invoice, txSignature)
 *   invoice:expired   — invoice expired (invoice)
 *   contact:submitted — contact form submitted (data)
 */
const bus = new EventEmitter();
bus.setMaxListeners(20);

module.exports = bus;
