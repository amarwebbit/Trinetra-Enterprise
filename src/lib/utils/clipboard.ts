/**
 * Copy text to clipboard with support for non-secure HTTP contexts (local network testing).
 * Returns true if copy succeeded, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // If navigator.clipboard and isSecureContext are available, use modern async clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('Modern clipboard copy failed, trying fallback...', e);
    }
  }

  // Fallback for non-secure contexts (HTTP network IP access)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Position out-of-screen
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Clipboard fallback copy failed:', err);
    return false;
  }
}
