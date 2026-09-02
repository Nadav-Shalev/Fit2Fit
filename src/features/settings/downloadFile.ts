/**
 * Triggers a browser download for generated text.
 *
 * The object URL is revoked on the next tick: revoking synchronously can cancel
 * the download in some browsers before it has started reading the blob.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'application/json',
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
