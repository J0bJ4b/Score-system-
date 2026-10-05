/**
 * Print to PDF Utility
 * Configures print-ready page orientation, document title (for default PDF filename),
 * and triggers window.print() for professional document saving.
 */

export interface PrintToPdfOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

export function triggerPrintToPdf(options?: PrintToPdfOptions) {
  const { title, orientation = 'portrait', onBeforePrint, onAfterPrint } = options || {};

  // Store original document title
  const originalTitle = document.title;
  if (title) {
    document.title = title;
  }

  // Inject or update dynamic print style tag
  let styleEl = document.getElementById('dynamic-print-page-style') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-page-style';
    document.head.appendChild(styleEl);
  }

  const margin = orientation === 'landscape' ? '8mm 8mm 8mm 8mm' : '10mm 10mm 10mm 10mm';
  styleEl.innerHTML = `
    @media print {
      @page {
        size: A4 ${orientation} !important;
        margin: ${margin} !important;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;

  document.body.classList.remove('print-orientation-portrait', 'print-orientation-landscape');
  document.body.classList.add(`print-orientation-${orientation}`);

  if (onBeforePrint) {
    onBeforePrint();
  }

  const cleanup = () => {
    document.title = originalTitle;
    document.body.classList.remove(`print-orientation-${orientation}`);
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    window.removeEventListener('afterprint', cleanup);
    if (onAfterPrint) {
      onAfterPrint();
    }
  };

  window.addEventListener('afterprint', cleanup, { once: true });

  // Brief delay to allow React state updates to render to DOM before print dialog opens
  setTimeout(() => {
    window.print();
  }, 120);
}
