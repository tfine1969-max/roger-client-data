import { base44 } from '@/api/base44Client';
import { clientKey, normalizeClientText } from '@/lib/client-utils';

const BATCH = 20;

export async function mergeClients(clientKeys, mergedName, primaryKey, sourceNames = []) {
  const res = await base44.functions.invoke('bulkClientMaintenance', {
    action: 'merge',
    client_keys: clientKeys,
    merged_name: mergedName,
    primary_key: primaryKey || clientKeys[0],
    source_names: sourceNames.filter(Boolean),
  });
  return res.data;
}

export async function renameClient(key, mergedName, sourceName = null) {
  const res = await base44.functions.invoke('bulkClientMaintenance', {
    action: 'rename',
    client_keys: [key],
    merged_name: mergedName,
    primary_key: key,
    source_names: sourceName ? [sourceName] : [],
  });
  return res.data;
}

export async function deleteZeroBalances(uploadMonth, clientKeys) {
  const res = await base44.functions.invoke('bulkClientMaintenance', {
    action: 'delete_zero_balance',
    upload_month: uploadMonth,
    client_keys: clientKeys,
  });
  return res.data;
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