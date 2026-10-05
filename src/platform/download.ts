/**
 * ファイルのダウンロード (書出)。Blob を作って `a[download]` をクリックする。
 * `io/` の `SerializeResult.files` の 1 エントリをそのまま渡せる形にしている。
 */
export function downloadFile(name: string, content: string | Uint8Array, mimeType: string): void {
  const blob = new Blob([content as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // クリック直後に revoke すると一部ブラウザでダウンロードが始まらないため、次のタスクまで待つ。
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
