import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple string similarity scoring (0-1)
function similarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all clients
    const clients = await base44.entities.Client.list();
    
    // Find potential duplicates with similarity threshold
    const suggestions = [];
    const seen = new Set();
    const threshold = 0.7; // 70% similarity threshold
    
    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        const pair = [clients[i].id, clients[j].id].sort().join('|');
        if (seen.has(pair)) continue;
        
        const score = similarity(clients[i].portfolio_name, clients[j].portfolio_name);
        
        if (score >= threshold) {
          seen.add(pair);
          suggestions.push({
            id1: clients[i].id,
            id2: clients[j].id,
            name1: clients[i].portfolio_name,
            name2: clients[j].portfolio_name,
            code1: clients[i].account_code,
            code2: clients[j].account_code,
            score: Math.round(score * 100),
          });
        }
      }
    }
    
    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);
    
    return Response.json({ suggestions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});