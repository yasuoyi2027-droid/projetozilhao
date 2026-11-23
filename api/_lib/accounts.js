// Contas do painel (clientes + admin), persistidas no mesmo KV usado pelos pagamentos.
const { kvGet, kvSet } = require('./kv');

async function saveAccount(id, data) {
  await kvSet('account:' + id, data);
}

async function loadAccount(id) {
  if (!id) return null;
  return kvGet('account:' + id);
}

async function saveUsernameIndex(username, accountId) {
  await kvSet('account_by_username:' + String(username).toLowerCase(), accountId);
}

async function loadIdByUsername(username) {
  if (!username) return null;
  return kvGet('account_by_username:' + String(username).toLowerCase());
}

async function addToIndex(accountId) {
  const list = (await kvGet('accounts_index')) || [];
  if (!list.includes(accountId)) {
    list.push(accountId);
    await kvSet('accounts_index', list);
  }
}

async function listAccountIds() {
  return (await kvGet('accounts_index')) || [];
}

module.exports = { saveAccount, loadAccount, saveUsernameIndex, loadIdByUsername, addToIndex, listAccountIds };
