import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GitPullRequest, ExternalLink, MessageSquare, GitCommit, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function PRCard({ pr }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex-shrink-0">
            <GitPullRequest className={`w-5 h-5 ${pr.draft ? 'text-slate-400' : 'text-green-600'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={pr.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors leading-snug"
              >
                {pr.title}
              </a>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">#{pr.number}</span>
              {pr.draft && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 text-slate-500">Draft</Badge>
              )}
              {pr.labels.map(label => (
                <span
                  key={label.name}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{ backgroundColor: `#${label.color}22`, color: `#${label.color}`, border: `1px solid #${label.color}44` }}
                >
                  {label.name}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <img src={pr.author_avatar} alt={pr.author} className="w-4 h-4 rounded-full" />
                {pr.author}
              </span>
              <span>{formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                {pr.head_branch} → {pr.base_branch}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
          <span className="flex items-center gap-1" title="Comments">
            <MessageSquare className="w-3.5 h-3.5" />
            {(pr.comments || 0) + (pr.review_comments || 0)}
          </span>
          <span className="flex items-center gap-1" title="Commits">
            <GitCommit className="w-3.5 h-3.5" />
            {pr.commits || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PullRequests() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [pulls, setPulls] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPRs = async () => {
    if (!owner.trim() || !repo.trim()) return;
    setLoading(true);
    setError(null);
    setPulls(null);
    const res = await base44.functions.invoke('getGithubPullRequests', { owner: owner.trim(), repo: repo.trim() });
    setLoading(false);
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setPulls(res.data?.pull_requests || []);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') fetchPRs(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pull Requests</h1>
        <p className="text-slate-500 text-sm mt-1">View open pull requests from any GitHub repository</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Owner / Organisation</label>
            <Input
              placeholder="e.g. wealthworks"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Repository</label>
            <Input
              placeholder="e.g. finance-dashboard"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={fetchPRs} disabled={loading || !owner || !repo} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? 'Loading…' : 'Fetch PRs'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {pulls !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {pulls.length === 0 ? 'No open pull requests' : `${pulls.length} open pull request${pulls.length !== 1 ? 's' : ''}`}
            </h2>
          </div>
          {pulls.map(pr => <PRCard key={pr.number} pr={pr} />)}
        </div>
      )}
    </div>
  );
}