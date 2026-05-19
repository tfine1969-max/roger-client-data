import { base44 } from '@/api/base44Client';
import { clientKey, normalizeClientText } from '@/lib/client-utils';

const BATCH = 20;

async function fetchAllDbRows() {
  return base44.entities.PortfolioValuation.list('-upload_month', 10000);
}

export async function mergeClients(clientKeys, mergedName) {
  const keySet = new Set(clientKeys);
  const allRows = await fetchAllDbRows();
  const toUpdate = allRows.filter(row => keySet.has(clientKey(row)));

  for (let i = 0; i < toUpdate.length; i += BATCH) {
    await Promise.all(
      toUpdate.slice(i, i + BATCH).map(row =>
        base44.entities.PortfolioValuation.update(row.id, { portfolio_name: mergedName })
      )
    );
  }

  return {
    success: true,
    updated: toUpdate.length,
    message: `Updated ${toUpdate.length} records to "${mergedName}".`,
  };
}

export async function renameClient(key, mergedName) {
  return mergeClients([key], mergedName);
}

export async function deleteZeroBalances(uploadMonth, clientKeys) {
  const keySet = new Set(clientKeys);
  const monthRows = await base44.entities.PortfolioValuation.filter(
    { upload_month: uploadMonth },
    '-created_date',
    20000
  );
  const toDelete = monthRows.filter(row => keySet.has(clientKey(row)));

  for (let i = 0; i < toDelete.length; i += BATCH) {
    await Promise.all(
      toDelete.slice(i, i + BATCH).map(row =>
        base44.entities.PortfolioValuation.delete(row.id)
      )
    );
  }

  return { success: true, deleted: toDelete.length };
}

function compact(value) {
  return normalizeClientText(value).replace(/[^a-z0-9]+/g, '');
}

function sortedKey(value) {
  return normalizeClientText(value).split(' ').filter(Boolean).sort().join('');
}

function nameSimilarity(a, b) {
  const ka = compact(a);
  const kb = compact(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 100;
  if (sortedKey(a) === sortedKey(b)) return 95;
  if (ka.includes(kb) || kb.includes(ka)) return 85;

  const tokensA = normalizeClientText(a).split(' ').filter(Boolean);
  const tokensB = normalizeClientText(b).split(' ').filter(Boolean);
  if (tokensA.length < 2 || tokensB.length < 2) return 0;
  const overlap = tokensA.filter(t => tokensB.includes(t)).length;
  const minLen = Math.min(tokensA.length, tokensB.length);
  return overlap >= 2 ? Math.round((overlap / minLen) * 75) : 0;
}

export function suggestMerges(clients) {
  const suggestions = [];
  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const score = nameSimilarity(
        clients[i].portfolio_name || '',
        clients[j].portfolio_name || ''
      );
      if (score >= 80) {
        suggestions.push({
          client_key1: clients[i].client_key,
          client_key2: clients[j].client_key,
          name1: clients[i].portfolio_name,
          name2: clients[j].portfolio_name,
          code1: clients[i].account_codes.join(', '),
          code2: clients[j].account_codes.join(', '),
          score,
        });
      }
    }
  }
  return suggestions.sort((a, b) => b.score - a.score);
}
