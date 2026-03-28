'use strict';

const {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');
const { USDC_MINT } = require('./invoice');

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/* Support comma-separated RPC URLs for failover (R1 fix) */
const RPC_URLS = (process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com')
  .split(',').map(s => s.trim()).filter(Boolean);

let _connection;
let _rpcIndex = 0;

function getConnection() {
  if (!_connection) {
    _connection = new Connection(RPC_URLS[_rpcIndex], 'confirmed');
  }
  return _connection;
}

/**
 * Rotate to the next RPC endpoint. Returns the new connection.
 * No-op if only one URL is configured.
 */
function rotateRpc() {
  if (RPC_URLS.length <= 1) return getConnection();
  _rpcIndex = (_rpcIndex + 1) % RPC_URLS.length;
  _connection = new Connection(RPC_URLS[_rpcIndex], 'confirmed');
  console.log('[solana] Rotated to RPC:', RPC_URLS[_rpcIndex]);
  return _connection;
}

/**
 * Build a SOL transfer transaction for Solana Pay Transaction Request.
 */
async function buildSolTransfer(buyerPubkey, invoice) {
  const connection = getConnection();
  const buyer = new PublicKey(buyerPubkey);
  const recipient = new PublicKey(invoice.recipient);
  const reference = new PublicKey(invoice.reference);
  const lamports = BigInt(invoice.amount_raw);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: buyer,
  });

  // SOL transfer with reference key
  const transferIx = SystemProgram.transfer({
    fromPubkey: buyer,
    toPubkey: recipient,
    lamports,
  });
  // Add reference as read-only non-signer for on-chain tracking
  transferIx.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
  tx.add(transferIx);

  // Memo instruction
  if (invoice.memo) {
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: buyer, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(invoice.memo, 'utf-8'),
      })
    );
  }

  return tx;
}

/**
 * Build a USDC SPL token transfer transaction.
 */
async function buildUsdcTransfer(buyerPubkey, invoice) {
  const connection = getConnection();
  const buyer = new PublicKey(buyerPubkey);
  const recipient = new PublicKey(invoice.recipient);
  const reference = new PublicKey(invoice.reference);
  const usdcMint = new PublicKey(USDC_MINT);
  const amount = BigInt(invoice.amount_raw);

  const buyerAta = await getAssociatedTokenAddress(usdcMint, buyer, false, TOKEN_PROGRAM_ID);
  const recipientAta = invoice.recipient_ata
    ? new PublicKey(invoice.recipient_ata)
    : await getAssociatedTokenAddress(usdcMint, recipient, false, TOKEN_PROGRAM_ID);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: buyer,
  });

  // SPL token transfer with reference key
  const transferIx = createTransferInstruction(
    buyerAta,
    recipientAta,
    buyer,
    amount,
    [],
    TOKEN_PROGRAM_ID,
  );
  transferIx.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
  tx.add(transferIx);

  // Memo
  if (invoice.memo) {
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: buyer, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(invoice.memo, 'utf-8'),
      })
    );
  }

  return tx;
}

/**
 * Serialize transaction for Solana Pay Transaction Request POST response.
 */
function serializeTransaction(tx) {
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString('base64');
}

/**
 * Build and serialize a transaction for a given invoice + buyer.
 */
async function handleTransactionRequest(invoice, buyerAccount) {
  let tx;
  if (invoice.asset === 'SOL') {
    tx = await buildSolTransfer(buyerAccount, invoice);
  } else if (invoice.asset === 'USDC') {
    tx = await buildUsdcTransfer(buyerAccount, invoice);
  } else {
    throw new Error('Unsupported asset: ' + invoice.asset);
  }
  return {
    transaction: serializeTransaction(tx),
    lastValidBlockHeight: tx.lastValidBlockHeight || null,
  };
}

module.exports = {
  getConnection,
  rotateRpc,
  buildSolTransfer,
  buildUsdcTransfer,
  serializeTransaction,
  handleTransactionRequest,
};
