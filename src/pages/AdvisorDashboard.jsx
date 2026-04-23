import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    navigate('/proposals', { replace: true });
  }, [navigate]);

  return null;
}