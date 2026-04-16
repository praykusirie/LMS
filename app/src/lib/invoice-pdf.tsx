import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import schoolLogo from '@/public/logo.jpg';

export interface InvoiceData {
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
  `TZS ${new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0 }).format(
    Number(amount),
  )}`;

// â”€â”€ Colours from the school invoice â”€â”€
const ORANGE = '#F4A261';
const ORANGE_LIGHT = '#F9C998';

// â”€â”€ Styles â”€â”€
const s = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10, color: '#000' },

  /* Header */
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  logoBox: {
    width: 62, height: 72, borderWidth: 1, borderColor: '#ccc',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerRight: { flex: 1 },
  schoolName: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subBlock: {},
  subBlockR: { alignItems: 'flex-end' },
  subName: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  regText: { fontSize: 7.5, marginTop: 1 },

  redLine: { borderBottomWidth: 2, borderBottomColor: '#d03027', marginTop: 8, marginBottom: 6 },

  umbrellaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  umbrellaText: { fontFamily: 'Times-Italic', fontSize: 9 },
  dateText: { fontSize: 9 },

  title: { fontFamily: 'Helvetica-Bold', fontSize: 13, textAlign: 'center', marginBottom: 14 },

  /* Student info */
  infoBlock: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { fontFamily: 'Helvetica-Bold', width: 140, fontSize: 10 },
  infoValue: { fontSize: 10 },

  sectionLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 6 },

  /* Generic table building blocks */
  table: { borderWidth: 1, borderColor: '#000', marginBottom: 16 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000' },
  rowLast: { flexDirection: 'row' },

  cellOrange: {
    padding: 5, borderRightWidth: 1, borderRightColor: '#000',
    backgroundColor: ORANGE, justifyContent: 'center',
  },
  cellOrangeLight: {
    padding: 5, borderRightWidth: 1, borderRightColor: '#000',
    backgroundColor: ORANGE_LIGHT, justifyContent: 'center',
  },
  cell: {
    padding: 5, borderRightWidth: 1, borderRightColor: '#000',
    justifyContent: 'center',
  },
  cellNoBorder: {
    padding: 5, justifyContent: 'center',
  },

  hText: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  cText: { fontSize: 9 },
  cTextBold: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  cTextBig: { fontFamily: 'Helvetica-Bold', fontSize: 11 },

  /* Footer area */
  noteText: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#d03027', marginTop: 6, marginBottom: 16 },
  thankText: { fontSize: 10, marginTop: 6 },
  schoolFooter: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginTop: 2 },
});

// â”€â”€ Widths â”€â”€
const W_LABEL = '25%';
const W_FEES = '25%';

// â”€â”€ The document component â”€â”€
const InvoiceDocument = ({ invoice }: { invoice: InvoiceData }) => {
  const hasTerm3 = invoice.term3_amount > 0;
  const total = invoice.total_amount || 1;
  const t1Pct = Math.round((invoice.term1_amount / total) * 100);
  const t3Pct = hasTerm3 ? Math.round((invoice.term3_amount / total) * 100) : 0;
  const t2Pct = 100 - t1Pct - t3Pct;

  // Term column width depends on how many terms we show
  const termW = hasTerm3 ? '16.67%' : '25%';

  // Build a canonical line-item list matching the school document order.
  // Items that don't exist on the invoice get a dash.
  const EXPECTED_ORDER = [
    'Tuition Fee',
    'Admission Fee',
    'Application Form Fee',
    'Interview Fee',
    'Development Fee',
    'Books Fee',
    'Cambridge Exam Fees',
  ];

  const rendered: Array<{ name: string; amount: number | null }> = [];
  const seen = new Set<string>();

  for (const name of EXPECTED_ORDER) {
    const found = invoice.line_items.find(
      (li) => li.fee_name.toLowerCase().trim() === name.toLowerCase(),
    );
    rendered.push({ name, amount: found ? found.amount : null });
    if (found) seen.add(found.fee_name);
  }
  // Append any extra items not in the canonical list (e.g. Hostel Fee, Sibling Discount)
  for (const li of invoice.line_items) {
    if (!seen.has(li.fee_name)) {
      rendered.push({ name: li.fee_name, amount: li.amount });
    }
  }

  // Helper: last cell in a row should drop its right border
  const lastCell = (base: any) => [base, { borderRightWidth: 0 }];

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* â•â•â•â•â•â•â• HEADER â•â•â•â•â•â•â• */}
        <View style={s.headerRow}>
          <Image src={schoolLogo} style={{ width: 62, height: 72, objectFit: 'contain' }} />

          <View style={s.headerRight}>
            <Text style={s.schoolName}>Arusha Meru International School</Text>
            <View style={s.subRow}>
              <View style={s.subBlock}>
                <Text style={s.subName}>Arusha Meru Secondary School</Text>
                <Text style={s.regText}>Since 1964 | Reg. No. S.66/TZ</Text>
              </View>
              <View style={s.subBlockR}>
                <Text style={s.subName}>Arusha Meru Primary School</Text>
                <Text style={s.regText}>Since 2007 | Reg.</Text>
                <Text style={s.regText}>No. AR.01/7/E.A036 &amp; AR.01/036</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.redLine} />

        <View style={s.umbrellaRow}>
          <Text style={s.umbrellaText}>Under the umbrella of Arusha Educational and Cultural Society</Text>
          <Text style={s.dateText}>
            Date: {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
          </Text>
        </View>

        <Text style={s.title}>INVOICE</Text>

        {/* â•â•â•â•â•â•â• STUDENT INFO â•â•â•â•â•â•â• */}
        <View style={s.infoBlock}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>STUDENT NAME:</Text>
            <Text style={s.infoValue}>{invoice.student_name.toUpperCase()}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>CLASS:</Text>
            <Text style={s.infoValue}>{invoice.class_name}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>ACADEMIC YEAR:</Text>
            <Text style={s.infoValue}>{invoice.academic_year}</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>FEE SUMMARY:</Text>

        {/* â•â•â•â•â•â•â• FEE TABLE â•â•â•â•â•â•â• */}
        <View style={s.table}>
          {/* Header row */}
          <View style={s.row}>
            <View style={[s.cellOrange, { width: W_LABEL }]}>
              <Text style={s.hText}>TOTAL</Text>
            </View>
            <View style={[s.cellOrange, { width: W_FEES }]}>
              <Text style={s.hText}>FEES</Text>
            </View>
            <View style={[s.cellOrange, { width: termW }]}>
              <Text style={s.hText}>TERM 1 ({t1Pct}%)</Text>
            </View>
            {hasTerm3 ? (
              <>
                <View style={[s.cellOrange, { width: termW }]}>
                  <Text style={s.hText}>TERM 2 ({t2Pct}%)</Text>
                </View>
                <View style={lastCell([s.cellOrange, { width: termW }])}>
                  <Text style={s.hText}>TERM 3 ({t3Pct}%)</Text>
                </View>
              </>
            ) : (
              <View style={lastCell([s.cellOrange, { width: termW }])}>
                <Text style={s.hText}>TERM 2 ({t2Pct}%)</Text>
              </View>
            )}
          </View>

          {/* Line-item rows */}
          {rendered.map((li, i) => (
            <View style={s.row} key={i}>
              <View style={[s.cellOrangeLight, { width: W_LABEL }]}>
                <Text style={s.cText}>{li.name}</Text>
              </View>
              <View style={[s.cell, { width: W_FEES }]}>
                <Text style={s.cTextBold}>
                  {li.amount !== null ? `${formatCurrency(Math.abs(li.amount))}/-` : '-'}
                </Text>
              </View>
              {/* Term columns are intentionally blank per line item (matching the school doc) */}
              <View style={[s.cell, { width: termW }]}><Text>{''}</Text></View>
              {hasTerm3 ? (
                <>
                  <View style={[s.cell, { width: termW }]}><Text>{''}</Text></View>
                  <View style={[s.cellNoBorder, { width: termW }]}><Text>{''}</Text></View>
                </>
              ) : (
                <View style={[s.cellNoBorder, { width: termW }]}><Text>{''}</Text></View>
              )}
            </View>
          ))}

          {/* TOTAL row */}
          <View style={s.rowLast}>
            <View style={[s.cellOrange, { width: W_LABEL }]}>
              <Text style={s.hText}>TOTAL</Text>
            </View>
            <View style={[s.cell, { width: W_FEES }]}>
              <Text style={s.cTextBig}>{formatCurrency(invoice.total_amount)}/-</Text>
            </View>
            <View style={[s.cell, { width: termW }]}>
              <Text style={s.cText}>{formatCurrency(invoice.term1_amount)}/-</Text>
            </View>
            {hasTerm3 ? (
              <>
                <View style={[s.cell, { width: termW }]}>
                  <Text style={s.cText}>{formatCurrency(invoice.term2_amount)}/-</Text>
                </View>
                <View style={[s.cellNoBorder, { width: termW }]}>
                  <Text style={s.cText}>{formatCurrency(invoice.term3_amount)}/-</Text>
                </View>
              </>
            ) : (
              <View style={[s.cellNoBorder, { width: termW }]}>
                <Text style={s.cText}>{formatCurrency(invoice.term2_amount)}/-</Text>
              </View>
            )}
          </View>
        </View>

        {/* â•â•â•â•â•â•â• BANK DETAILS â•â•â•â•â•â•â• */}
        <Text style={s.sectionLabel}>The above fees must be deposited to the following banks:</Text>

        <View style={s.table}>
          {/* Header */}
          <View style={s.row}>
            <View style={[s.cellOrangeLight, { width: '22%' }]}><Text style={s.hText}>BANK</Text></View>
            <View style={[s.cellOrangeLight, { width: '39%' }]}><Text style={s.hText}>CRDB BANK</Text></View>
            <View style={[s.cellOrangeLight, { width: '39%', borderRightWidth: 0 }]}><Text style={s.hText}>EXIM BANK</Text></View>
          </View>
          {/* Account Name */}
          <View style={s.row}>
            <View style={[s.cellOrangeLight, { width: '22%' }]}><Text style={s.hText}>ACCOUNT NAME</Text></View>
            <View style={[s.cell, { width: '39%' }]}><Text style={s.cTextBold}>Arusha Educational &amp; Cultural Society</Text></View>
            <View style={[s.cellNoBorder, { width: '39%' }]}><Text style={s.cTextBold}>Arusha Educational &amp; Cultural Society</Text></View>
          </View>
          {/* TZS */}
          <View style={s.row}>
            <View style={[s.cellOrangeLight, { width: '22%' }]}><Text style={s.hText}>TZS ACCOUNT NUMBER</Text></View>
            <View style={[s.cell, { width: '39%' }]}><Text style={s.cTextBold}>015C832771100</Text></View>
            <View style={[s.cellNoBorder, { width: '39%' }]}><Text style={s.cTextBold}>0260000318</Text></View>
          </View>
          {/* USD */}
          <View style={s.rowLast}>
            <View style={[s.cellOrangeLight, { width: '22%' }]}><Text style={s.hText}>USD ACCOUNT NUMBER</Text></View>
            <View style={[s.cell, { width: '39%' }]}><Text style={s.cTextBold}>025C832771100</Text></View>
            <View style={[s.cellNoBorder, { width: '39%' }]}><Text style={s.cTextBold}>0260000319</Text></View>
          </View>
        </View>

        {/* â•â•â•â•â•â•â• NOTE â•â•â•â•â•â•â• */}
        <Text style={s.noteText}>
          NOTE: Total fee paid for the academic year {invoice.academic_year} ............... balance remaining...............
        </Text>

        <Text style={s.thankText}>Thank you</Text>
        <Text style={s.schoolFooter}>Arusha Meru International School (AMIS)</Text>
      </Page>
    </Document>
  );
};

// â”€â”€ Public API â€” async, generates blob and triggers download â”€â”€
export async function generateInvoicePdf(invoice: InvoiceData): Promise<void> {
  const blob = await pdf(<InvoiceDocument invoice={invoice} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoice_number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
