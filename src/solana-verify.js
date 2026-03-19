'use strict';

const { PublicKey } = require('@solana/web3.js');
const { getConnection } = require('./solana-pay');
const {
  getInvoice,
  updateStatus,
  updateInvoiceField,
  getAwaitingInvoices,
  expireStaleInvoices,
  logEvent,
  USDC_MINT,
  TOKEN_PROGRAM,
} = require('./invoice');

const POLL_INTERVAL_MS = 5000;
let pollerHandle = null;

/**
 * Look for a transaction containing the invoice's reference key,
 * then validate it matches expected payment parameters.
 */
async function verifyInvoice(invoice) {
  const connection = getConnection();
  const reference = new PublicKey(invoice.reference);

  // Search for signatures referencing this key
  let signatures;
  try {
    signatures = await connection.getSignaturesForAddress(reference, { limit: 5 }, 'confirmed');
  } catch (err) {
    // RPC error — skip this cycle
    return;
  }

  if (!signatures || signatures.length === 0) return;

  for (const sigInfo of signatures) {
    if (sigInfo.err) continue; // failed tx
    const sig = sigInfo.signature;

    // Avoid re-processing
    if (invoice.tx_signature === sig) continue;

    let txData;
    try {
      txData = await connection.getTransaction(sig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
    } catch (err) {
      continue;
    }

    if (!txData || txData.meta?.err) continue;

    const valid = invoice.asset === 'SOL'
      ? validateSolPayment(txData, invoice)
      : validateUsdcPayment(txData, invoice);

    if (valid) {
      // Record tx details
      updateInvoiceField(invoice.id, 'tx_signature', sig);
      updateInvoiceField(invoice.id, 'tx_slot', txData.slot);
      if (txData.blockTime) {
        updateInvoiceField(invoice.id, 'tx_block_time', txData.blockTime * 1000);
      }
      if (sigInfo.memo) {
        // Payer wallet from first signer
      }

      // Transition to paid (skip confirming for simplicity in v1)
      try {
        if (invoice.status === 'quoted') {
          updateStatus(invoice.id, 'awaiting_payment', { sig });
        }
        const refreshed = getInvoice(invoice.id);
        if (refreshed.status === 'awaiting_payment') {
          updateStatus(invoice.id, 'confirming', { sig });
        }
        const refreshed2 = getInvoice(invoice.id);
        if (refreshed2.status === 'confirming') {
          updateStatus(invoice.id, 'paid', { sig, slot: txData.slot });
        }
      } catch (e) {
        console.error('[verify] Status transition error for', invoice.id, e.message);
      }

      console.log('[verify] Invoice', invoice.id, 'paid via tx', sig);
      return;
    }
  }
}

function validateSolPayment(txData, invoice) {
  const meta = txData.meta;
  if (!meta || meta.err) return false;

  const accountKeys = txData.transaction.message.staticAccountKeys
    || txData.transaction.message.accountKeys;
  if (!accountKeys) return false;

  const recipient = invoice.recipient;
  const expectedLamports = BigInt(invoice.amount_raw);

  // Check pre/post balances for recipient
  for (let i = 0; i < accountKeys.length; i++) {
    const key = accountKeys[i].toString();
    if (key === recipient) {
      const pre = BigInt(meta.preBalances[i]);
      const post = BigInt(meta.postBalances[i]);
      const received = post - pre;
      if (received >= expectedLamports) {
        return true;
      }
    }
  }

  return false;
}

function validateUsdcPayment(txData, invoice) {
  const meta = txData.meta;
  if (!meta || meta.err) return false;

  // Check token balance changes
  const postTokenBalances = meta.postTokenBalances || [];
  const preTokenBalances = meta.preTokenBalances || [];

  const recipientAddr = invoice.recipient_ata || invoice.recipient;
  const expectedAmount = BigInt(invoice.amount_raw);

  for (const post of postTokenBalances) {
    // Verify mint and program
    if (post.mint !== USDC_MINT) continue;
    if (post.programId && post.programId !== TOKEN_PROGRAM) continue;

    // Find owner — must be our merchant
    const owner = post.owner;
    if (owner !== invoice.recipient) continue;

    // Find matching pre-balance
    const pre = preTokenBalances.find(
      p => p.accountIndex === post.accountIndex && p.mint === USDC_MINT
    );
    const preAmount = BigInt(pre?.uiTokenAmount?.amount || '0');
    const postAmount = BigInt(post.uiTokenAmount?.amount || '0');
    const received = postAmount - preAmount;

    if (received >= expectedAmount) {
      return true;
    }
  }

  return false;
}

function startPoller() {
  if (pollerHandle) return;

  console.log('[verify] Payment verification poller started (interval: ' + POLL_INTERVAL_MS + 'ms)');

  pollerHandle = setInterval(async () => {
    try {
      // Expire stale invoices first
      expireStaleInvoices();

      // Check awaiting invoices
      const invoices = getAwaitingInvoices();
      for (const inv of invoices) {
        if (inv.status === 'expired' || inv.status === 'paid') continue;
        try {
          await verifyInvoice(inv);
        } catch (err) {
          console.error('[verify] Error checking invoice', inv.id, err.message);
        }
      }
    } catch (err) {
      console.error('[verify] Poller cycle error:', err.message);
    }
  }, POLL_INTERVAL_MS);
}

function stopPoller() {
  if (pollerHandle) {
    clearInterval(pollerHandle);
    pollerHandle = null;
  }
}

module.exports = { startPoller, stopPoller, verifyInvoice };
