'use client';
import { useEffect, useState } from 'react';

export default function MobileBlocker({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          background: '#0a0f15',
          color: '#ffffff',
        }}
      >
        <h2 style={{ margin: '0 0 8px' }}>
          This WebApp is not optimized for mobile.
        </h2>
        <p style={{ margin: 0 }}>Please check it in your PC.</p>
      </div>
    );
  }

  return <>{children}</>;
}
