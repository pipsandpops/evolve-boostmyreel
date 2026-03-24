import { useState } from 'react';
import { Link2, Check } from 'lucide-react';

interface ShareBarProps {
  title: string;
  description: string;
  /** Canonical URL to share. Falls back to window.location.href */
  url?: string;
}

export function ShareBar({ title, description, url }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl  = url ?? window.location.href;
  const encoded   = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${title}\n\n${description}\n\n`);

  const linkedin  = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
  const facebook  = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
  const whatsapp  = `https://wa.me/?text=${encodedText}${encoded}`;

  const openShare = (href: string) =>
    window.open(href, '_blank', 'width=600,height=480,noopener,noreferrer');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('input');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Use native Web Share API on mobile if available
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url: shareUrl });
      } catch { /* user dismissed */ }
    } else {
      copyLink();
    }
  };

  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0',
      borderRadius: 16, padding: '18px 22px', marginTop: 32,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: '#94a3b8',
        letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px',
      }}>
        Share this article
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* LinkedIn */}
        <button
          onClick={() => openShare(linkedin)}
          title="Share on LinkedIn"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#0077b5', color: 'white',
            border: 'none', borderRadius: 10, padding: '9px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          {/* LinkedIn icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          LinkedIn
        </button>

        {/* Facebook */}
        <button
          onClick={() => openShare(facebook)}
          title="Share on Facebook"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1877f2', color: 'white',
            border: 'none', borderRadius: 10, padding: '9px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          {/* Facebook icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook
        </button>

        {/* Instagram — copy link (no direct web share URL exists) */}
        <button
          onClick={nativeShare}
          title="Share on Instagram (copy link)"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
            color: 'white',
            border: 'none', borderRadius: 10, padding: '9px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          {/* Instagram icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
          Instagram
        </button>

        {/* WhatsApp */}
        <button
          onClick={() => openShare(whatsapp)}
          title="Share on WhatsApp"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#25d366', color: 'white',
            border: 'none', borderRadius: 10, padding: '9px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          {/* WhatsApp icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: '#e2e8f0', flexShrink: 0 }} />

        {/* Copy link */}
        <button
          onClick={copyLink}
          title="Copy link"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: copied ? '#f0fdf4' : '#f8fafc',
            color: copied ? '#10b981' : '#64748b',
            border: `1px solid ${copied ? '#86efac' : '#e2e8f0'}`,
            borderRadius: 10, padding: '9px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied
            ? <><Check size={14} strokeWidth={2.5} /> Copied!</>
            : <><Link2 size={14} /> Copy link</>
          }
        </button>
      </div>

      {/* Instagram note */}
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '12px 0 0', lineHeight: 1.5 }}>
        📸 <strong>Instagram:</strong> Tap the button above to copy the link, then paste it in your Story or bio.
      </p>
    </div>
  );
}
