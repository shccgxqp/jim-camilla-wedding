import './feature-quick-links.css';

const LINKS = [
  { label: '婚禮網站', href: '/', hint: '回到首頁' },
  { label: '拍照亭', href: '/photo-booth', hint: '開始拍照' },
  { label: '遠端相機', href: '/photo-booth/camera', hint: '手機遙控拍照' },
  { label: '照片相簿', href: '/photo-booth/gallery', hint: '查看照片' },
  { label: '直播牆', href: '/live-wall', hint: '即時照片牆' },
  { label: '直播牆控制', href: '/live-wall-control', hint: '工作人員使用' },
  { label: '照片管理', href: '/photo-library', hint: '管理婚禮照片' },
];

export default function FeatureQuickLinks({ tone = 'light' }) {
  return (
    <details className={`feature-links ${tone}`}>
      <summary>jim &amp; camilla by 2026</summary>
      <nav aria-label="網站功能快捷入口">
        <div>
          {LINKS.map((link) => (
            <a href={link.href} key={link.href}>
              <span>{link.label}</span>
              <small>{link.hint}</small>
            </a>
          ))}
        </div>
      </nav>
    </details>
  );
}
