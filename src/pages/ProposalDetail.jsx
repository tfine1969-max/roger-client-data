import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// This page is no longer an entry point — redirect straight to the Proposal Engine.
export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/proposal/${id}/engine`, { replace: true });
  }, [id]);

  return null;
}