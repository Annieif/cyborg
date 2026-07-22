// 开发模式默认版本，构建时由 scripts/bundle-assets.js 覆盖
export interface AssetEntry {
  content: Buffer;
  contentType: string;
}

export function getFrontendAssets(): Map<string, AssetEntry> {
  // 开发模式下从磁盘读取，此函数仅作为 fallback
  return new Map();
}