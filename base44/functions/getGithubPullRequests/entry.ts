import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    const { owner, repo } = await req.json();
    if (!owner || !repo) {
      return Response.json({ error: 'owner and repo are required' }, { status: 400 });
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ error: error.message || 'GitHub API error' }, { status: response.status });
    }

    const pulls = await response.json();

    const result = pulls.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login,
      author_avatar: pr.user?.avatar_url,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      html_url: pr.html_url,
      draft: pr.draft,
      labels: pr.labels?.map(l => ({ name: l.name, color: l.color })) || [],
      comments: pr.comments,
      review_comments: pr.review_comments,
      commits: pr.commits,
      head_branch: pr.head?.ref,
      base_branch: pr.base?.ref,
    }));

    return Response.json({ pull_requests: result, total: result.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});