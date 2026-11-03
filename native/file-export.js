import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Older WKWebViews and HTTP development previews may lack randomUUID.
// Keep secure random IDs without relying on that newer convenience method.
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
}

// Export through the iOS share sheet; browser downloads remain available on web.
window.truckloadExport = async (name, blob) => {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-150) || 'Truckload-export';
  const path = `truckload-exports/${crypto.randomUUID()}/${safeName}`;
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the export.'));
    reader.readAsDataURL(blob);
  });
  try {
    const file = await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
    await Share.share({ title: name, files: [file.uri], dialogTitle: 'Save or share your Truckload file' });
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {});
  }
};
