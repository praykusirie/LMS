import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoice_number: string;
  student_name: string;
  student_code: string;
  class_name: string;
  academic_year: string;
  year_group: string;
  invoice_date: string;
  is_new_student: boolean;
  is_boarder: boolean;
  total_amount: number;
  total_paid: number;
  balance: number;
  term1_amount: number;
  term2_amount: number;
  term3_amount: number;
  line_items: Array<{ fee_name: string; amount: number }>;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0 }).format(
    Number(amount),
  );

export function generateInvoicePdf(invoice: InvoiceData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // ── School Header ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('THE SCHOOL NAME', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('P.O. Box XXXX, Dar es Salaam, Tanzania', pageWidth / 2, y, {
    align: 'center',
  });
  y += 5;
  doc.text(
    'Reg. No: XXXX | TIN: XXXX | Tel: +255 XXX XXX XXX',
    pageWidth / 2,
    y,
    { align: 'center' },
  );
  y += 8;

  // Line
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Invoice Title ──
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FEE INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // ── Student Info ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const infoLeft = [
    ['Student:', invoice.student_name],
    ['ID:', invoice.student_code],
    ['Class:', `${invoice.class_name} (${invoice.year_group})`],
  ];
  const infoRight = [
    ['Invoice #:', invoice.invoice_number],
    ['Date:', new Date(invoice.invoice_date).toLocaleDateString('en-GB')],
    ['Academic Year:', invoice.academic_year],
  ];

  for (let i = 0; i < infoLeft.length; i++) {
    doc.setFont('helvetica', 'bold');
    doc.text(infoLeft[i][0], margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(infoLeft[i][1], margin + 25, y);

    doc.setFont('helvetica', 'bold');
    doc.text(infoRight[i][0], pageWidth / 2 + 10, y);
    doc.setFont('helvetica', 'normal');
    doc.text(infoRight[i][1], pageWidth / 2 + 45, y);
    y += 6;
  }

  y += 4;

  // ── Fee Breakdown Table ──
  const feeTableBody = invoice.line_items.map((li) => [
    li.fee_name,
    `TZS ${formatCurrency(Math.abs(li.amount))}`,
  ]);

  feeTableBody.push([
    { content: 'TOTAL', styles: { fontStyle: 'bold' as const } } as any,
    {
      content: `TZS ${formatCurrency(invoice.total_amount)}`,
      styles: { fontStyle: 'bold' as const },
    } as any,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Fee Item', 'Amount (TZS)']],
    body: feeTableBody,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Term Breakdown ──
  autoTable(doc, {
    startY: y,
    head: [['Term', 'Amount (TZS)']],
    body: [
      ['Term 1 (50%)', `TZS ${formatCurrency(invoice.term1_amount)}`],
      ['Term 2 (35%)', `TZS ${formatCurrency(invoice.term2_amount)}`],
      ['Term 3 (15%)', `TZS ${formatCurrency(invoice.term3_amount)}`],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Payment Summary ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Fee Paid: TZS ${formatCurrency(invoice.total_paid)}`, margin, y);
  y += 6;
  doc.text(
    `Balance Remaining: TZS ${formatCurrency(invoice.balance)}`,
    margin,
    y,
  );
  y += 10;

  // ── Bank Details ──
  autoTable(doc, {
    startY: y,
    head: [['Bank', 'Account Name', 'TZS Account', 'USD Account']],
    body: [
      ['CRDB Bank', 'School Name', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX'],
      ['EXIM Bank', 'School Name', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Footer ──
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'This is a computer-generated invoice. No signature is required.',
    pageWidth / 2,
    y,
    { align: 'center' },
  );

  // Save
  doc.save(`${invoice.invoice_number}.pdf`);
}
