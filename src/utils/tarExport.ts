export interface ArchiveEntry {
  path: string;
  content: string;
  mode?: string;
}

function writeOctal(buf: Uint8Array, offset: number, length: number, value: number): void {
  const oct = value.toString(8).padStart(length - 1, '0');
  for (let i = 0; i < length - 1; i++) {
    buf[offset + i] = oct.charCodeAt(i);
  }
  buf[offset + length - 1] = 0;
}

function writeString(buf: Uint8Array, offset: number, maxLen: number, str: string): void {
  const bytes = new TextEncoder().encode(str);
  const count = Math.min(bytes.length, maxLen);
  for (let i = 0; i < count; i++) {
    buf[offset + i] = bytes[i];
  }
}

export function buildTarArchive(rootDir: string, entries: ArchiveEntry[]): Blob {
  const encoder = new TextEncoder();
  const blocks: Uint8Array[] = [];
  const mtime = Math.floor(Date.now() / 1000);

  for (const entry of entries) {
    const fullPath = `${rootDir}/${entry.path}`;
    const data = encoder.encode(entry.content);
    const header = new Uint8Array(512);

    let name = fullPath;
    let prefix = '';
    if (fullPath.length > 100) {
      const idx = fullPath.lastIndexOf('/');
      if (idx > 0 && idx <= 155 && fullPath.length - idx - 1 <= 100) {
        prefix = fullPath.slice(0, idx);
        name = fullPath.slice(idx + 1);
      }
    }

    writeString(header, 0, 100, name);
    writeOctal(header, 100, 8, parseInt(entry.mode ?? '0644', 8));
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, data.length);
    writeOctal(header, 136, 12, mtime);

    // Checksum field filled with spaces during computation
    for (let i = 148; i < 156; i++) {
      header[i] = 32;
    }

    // Typeflag '0' = regular file
    header[156] = 48;
    // ustar magic + version
    writeString(header, 257, 6, 'ustar');
    header[262] = 0;
    writeString(header, 263, 2, '00');
    writeString(header, 265, 32, 'root');
    writeString(header, 297, 32, 'root');

    if (prefix) {
      writeString(header, 345, 155, prefix);
    }

    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    const chkOct = checksum.toString(8).padStart(6, '0');
    for (let i = 0; i < 6; i++) {
      header[148 + i] = chkOct.charCodeAt(i);
    }
    header[154] = 0;
    header[155] = 32;

    blocks.push(header);

    if (data.length > 0) {
      const paddedLen = Math.ceil(data.length / 512) * 512;
      const padded = new Uint8Array(paddedLen);
      padded.set(data, 0);
      blocks.push(padded);
    }
  }

  // Two 512-byte zero blocks for POSIX tar EOF
  blocks.push(new Uint8Array(1024));

  return new Blob(blocks as BlobPart[], { type: 'application/x-tar' });
}

export function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
