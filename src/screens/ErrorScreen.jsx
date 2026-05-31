import { useApp } from '../context/AppContext.jsx';

export default function ErrorScreen({ onRetry, onBackToLayouts }) {
  const { errorInfo } = useApp();
  const phase = errorInfo?.phase || '發生錯誤';
  const message = errorInfo?.message || '未知原因';

  return (
    <section className="stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="result-screen-bg">
        <div className="result-screen-overlay" />
      </div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(20,14,10,0.88)',
        border: '1px solid #BD9A4E',
        borderRadius: 16,
        padding: '2rem 2.5rem',
        maxWidth: 420,
        width: '90vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Icon */}
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="#E0584B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>

        {/* Phase */}
        <div style={{
          color: '#E4C97E',
          fontSize: '1.05rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textAlign: 'center',
        }}>
          {phase}
        </div>

        {/* Message */}
        <div style={{
          color: 'rgba(228,201,126,0.65)',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 8,
          padding: '0.6rem 0.9rem',
          width: '100%',
          wordBreak: 'break-all',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          {message}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="result-btn-primary"
            type="button"
            onClick={onRetry}
          >
            重 新 拍 攝
          </button>
          <button
            className="result-btn-outline"
            type="button"
            onClick={onBackToLayouts}
          >
            回 首 頁
          </button>
        </div>
      </div>
    </section>
  );
}
