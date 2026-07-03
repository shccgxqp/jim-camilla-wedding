export const layouts = {
  frame06: {
    id: "frame06",
    name: "RAW 測試",
    description: "原始攝像頭畫面，無邊框，診斷用。",
    requiredShots: 1,
    previewClass: "preview-frame06",
    width: 1080,
    height: 1440,
    shotRatio: "1080/1440",
    skipFrameSelect: true,
  },
  frame05: {
    id: "frame05",
    name: "仙女雙格",
    description: "兩格仙女版型，復古條紋蕾絲，適合甜美合照。",
    requiredShots: 2,
    previewClass: "preview-frame05",
    width: 960,
    height: 1707,
    shotRatio: "683/423",
    skipFrameSelect: true,
  },
  frame04: {
    id: "frame04",
    name: "派對四格",
    description: "四格派對邊框，迪斯可球光，適合歡慶合照。",
    requiredShots: 4,
    previewClass: "preview-frame04",
    width: 2090,
    height: 3135,
    shotRatio: "910/1074",
    skipFrameSelect: true,
  },
  frame03: {
    id: "frame03",
    name: "雲朵直條",
    description: "四格雲朵邊框，清新藍底，適合溫馨合照。",
    requiredShots: 4,
    previewClass: "preview-frame03",
    width: 858,
    height: 2532,
    shotRatio: "724/543",
    skipFrameSelect: true,
  },
  frame02: {
    id: "frame02",
    name: "星空直條",
    description: "三格橫向直排，復古丘比特邊框。",
    requiredShots: 3,
    previewClass: "preview-frame02",
    width: 784,
    height: 1176,
    shotRatio: "545/365",
    skipFrameSelect: true,
  },
  frame01: {
    id: "frame01",
    name: "愛心拍貼",
    description: "六格愛心版型，浪漫紅底花邊框，適合情侶賓客。",
    requiredShots: 6,
    previewClass: "preview-frame01",
    width: 779,
    height: 1172,
    shotRatio: "315/280",
    skipFrameSelect: true,
  },
};

export const filters = [
  {
    id: "natural",
    name: "原色",
    filter: "brightness(1.06) contrast(0.9) saturate(0.95)",
  },
  {
    id: "fresh",
    name: "清新",
    filter:
      "brightness(1.12) contrast(0.86) saturate(0.8) hue-rotate(2deg) opacity(0.98)",
  },
  {
    id: "vintage",
    name: "美式復古",
    filter:
      "brightness(0.9) contrast(1.24) saturate(1.19) sepia(1) grayscale(0.17)",
  },
  { id: "bw", name: "黑白", filter: "grayscale(100%)" },
];

export const DEFAULT_CONFIG = {
  coupleName: "jim & camilla",
  weddingDate: "2026.11.07",
  tagline: "Wedding Photo Booth",
  countdownSeconds: 3,
  theme: { primary: "#f28ca8", secondary: "#fff4f7", ink: "#49333a" },
};
