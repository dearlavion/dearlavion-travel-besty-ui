import type { ProductItemView } from '../shop/product-item.service';

/** A kit flattened for export (email / PDF). */
export interface KitExport {
  title: string;
  summary: string;
  items: { label: string; product?: ProductItemView }[];
}

function itemLines(k: KitExport): string[] {
  return k.items.map((it, i) => {
    const base = `${i + 1}. ${it.label}`;
    return it.product ? `${base}  —  ${it.product.name} ($${it.product.price.toFixed(2)})` : base;
  });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'travel-kit';
}

/** A `mailto:` link with the kit pre-filled in the subject + body (opens the user's email client). */
export function buildKitMailto(k: KitExport): string {
  const subject = encodeURIComponent(k.title || 'My Travel Besty Kit');
  const body = encodeURIComponent(
    [k.summary, '', `Packing checklist (${k.items.length} items):`, ...itemLines(k), '', 'Built with Travel Besty 🧳'].join(
      '\n',
    ),
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Generates and downloads a PDF of the kit. jsPDF is dynamically imported so it is never loaded
 * during SSR / prerender — this only ever runs from a browser click handler.
 */
export async function downloadKitPdf(k: KitExport): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(45, 62, 134);
  doc.text(k.title || 'Your Travel Kit', margin, y);
  y += 28;

  // Summary
  if (k.summary) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 107, 127);
    const summary = doc.splitTextToSize(k.summary, pageW - margin * 2);
    doc.text(summary, margin, y);
    y += summary.length * 15 + 10;
  }

  // Section heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 32, 46);
  doc.text(`Packing checklist  —  ${k.items.length} items`, margin, y);
  y += 22;

  // Checklist rows (empty checkbox + label + suggested product)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  for (const it of k.items) {
    if (y > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(150);
    doc.rect(margin, y - 9, 11, 11); // checkbox
    doc.setTextColor(22, 32, 46);
    doc.text(it.label, margin + 20, y);
    if (it.product) {
      doc.setTextColor(120, 130, 140);
      const suffix = `${it.product.name} — $${it.product.price.toFixed(2)}`;
      doc.text(suffix, margin + 24 + doc.getTextWidth(it.label) + 12, y);
    }
    y += 20;
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(160);
  doc.text('Built with Travel Besty', margin, pageH - 24);

  doc.save(`${slugify(k.title || 'travel-kit')}.pdf`);
}
