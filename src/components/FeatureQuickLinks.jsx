import './feature-quick-links.css';

const LINKS = [
  { label: '正式首頁', href: '/', hint: '主婚禮網站' },
  { label: '新版頁面', href: '/v2', hint: '版型預覽' },
  { label: '拍貼機', href: '/photo-booth', hint: '賓客拍照入口' },
  { label: '遠端相機', href: '/photo-booth/camera', hint: '手機鏡頭連線' },
  { label: '照片管理', href: '/photo-booth/gallery', hint: '拍貼成品管理' },
  { label: '投影幕', href: '/live-wall', hint: '晚宴記憶牆' },
  { label: '投影控制', href: '/live-wall-control', hint: '現場工作人員' },
  { label: '照片庫', href: '/photo-library', hint: 'R2 照片上傳' },
];

export default function FeatureQuickLinks({ tone = 'light' }) {
  return (
    <nav className={`feature-links ${tone}`} aria-label="網站功能快捷入口">
      <p>展示與管理快捷入口</p>
      <div>
        {LINKS.map((link) => (
          <a href={link.href} key={link.href}>
            <span>{link.label}</span>
            <small>{link.hint}</small>
          </a>
        ))}
      </div>
    </nav>
  );
}
