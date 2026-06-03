import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { fromUSDCBaseUnits, formatUSDC } from "@/lib/utils/usdc"
import type { DashboardStats, SecondaryStats } from "@/hooks/useDashboard"

export interface StatementTransaction {
  date: string
  type: string
  direction: "IN" | "OUT"
  counterparty: string
  amountUSDC: string
  status: string
  txHash: string | null
}

export interface StatementInput {
  account: {
    name: string
    companyName: string | null
    role: string
    walletAddress: string | null
  }
  monthLabel: string
  generatedAt: Date
  stats: DashboardStats
  secondary: SecondaryStats
  transactions: StatementTransaction[]
}

const GOLD: [number, number, number] = [200, 169, 110]
const INK: [number, number, number] = [31, 41, 55]
const MUTED: [number, number, number] = [120, 130, 145]
const IN_GREEN: [number, number, number] = [13, 148, 96]
const OUT_RED: [number, number, number] = [185, 70, 60]

function money(baseUnits: string): string {
  return formatUSDC(fromUSDCBaseUnits(BigInt(baseUnits)))
}

function humanize(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase()
}

// Builds and downloads a bank-statement-style PDF for the selected month.
export function generateStatementPdf(input: StatementInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  let y = 48

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(...GOLD)
  doc.text("MERIDIAN", margin, y)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text("Finance Statement", margin, y + 16)

  // Right-aligned period + generated date.
  doc.setTextColor(...INK)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(input.monthLabel, pageW - margin, y, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(
    `Generated ${format(input.generatedAt, "dd MMM yyyy, HH:mm")}`,
    pageW - margin,
    y + 15,
    { align: "right" }
  )

  y += 40

  // ── Account block ─────────────────────────────────────────────────────────
  doc.setTextColor(...INK)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(input.account.companyName ?? input.account.name, margin, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  const accountLines = [
    `${input.account.name} · ${input.account.role}`,
    input.account.walletAddress
      ? `Wallet ${input.account.walletAddress} · Arc testnet (USDC)`
      : "Arc testnet (USDC)",
  ]
  doc.text(accountLines, margin, y + 14)

  y += 44
  doc.setDrawColor(220, 222, 226)
  doc.line(margin, y, pageW - margin, y)
  y += 24

  // ── Summary ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.text("Summary", margin, y)
  y += 8

  const s = input.stats
  const sec = input.secondary
  const summaryRows: [string, string][] = [
    ["Total Financed", `USDC ${money(s.totalFinanced)}`],
    ["Capital Deployed", `USDC ${money(s.capitalDeployed)}`],
    [
      "Avg Settlement",
      s.avgSettlementDays === null
        ? "—"
        : `${s.avgSettlementDays.toFixed(1)} days`,
    ],
    ["On-Time Rate", s.onTimeRate === null ? "—" : `${s.onTimeRate}%`],
    ["Paid Invoices", `${sec.paid.count}  ·  USDC ${money(sec.paid.amount)}`],
    ["Due Invoices", `${sec.due.count}  ·  USDC ${money(sec.due.amount)}`],
    [
      "Overdue Invoices",
      `${sec.overdue.count}  ·  USDC ${money(sec.overdue.amount)}`,
    ],
  ]

  autoTable(doc, {
    startY: y + 6,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 0, right: 0 } },
    columnStyles: {
      0: { textColor: MUTED, cellWidth: 160 },
      1: { textColor: INK, fontStyle: "bold" },
    },
    body: summaryRows,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 28

  // ── Transactions ledger ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.text("Transactions", margin, y)

  let totalIn = 0n
  let totalOut = 0n
  const rows = input.transactions.map((t) => {
    const amt = BigInt(t.amountUSDC)
    const inbound = t.direction === "IN"
    if (inbound) totalIn += amt
    else totalOut += amt
    return {
      date: format(new Date(t.date), "dd MMM yyyy"),
      desc: `${humanize(t.type)} · ${inbound ? "from" : "to"} ${t.counterparty}`,
      moneyIn: inbound ? money(t.amountUSDC) : "",
      moneyOut: inbound ? "" : money(t.amountUSDC),
    }
  })

  if (rows.length === 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    doc.text("No transactions in this period.", margin, y + 24)
  } else {
    autoTable(doc, {
      startY: y + 10,
      margin: { left: margin, right: margin },
      head: [["Date", "Description", "Money In", "Money Out"]],
      headStyles: {
        fillColor: [245, 246, 248],
        textColor: INK,
        fontStyle: "bold",
        fontSize: 9,
      },
      styles: { fontSize: 9, cellPadding: 5, textColor: INK },
      columnStyles: {
        0: { cellWidth: 80 },
        2: { halign: "right", textColor: IN_GREEN },
        3: { halign: "right", textColor: OUT_RED },
      },
      body: rows.map((r) => [r.date, r.desc, r.moneyIn, r.moneyOut]),
      foot: [
        [
          "",
          "Total",
          money(totalIn.toString()),
          money(totalOut.toString()),
        ],
      ],
      footStyles: {
        fillColor: [245, 246, 248],
        textColor: INK,
        fontStyle: "bold",
        halign: "right",
        fontSize: 9,
      },
    })
  }

  // ── Footer on every page ─────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  const pageH = doc.internal.pageSize.getHeight()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      "Meridian — AI-native trade finance · Arc testnet · USDC",
      margin,
      pageH - 24
    )
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 24, {
      align: "right",
    })
  }

  const safeMonth = input.monthLabel.replace(/\s+/g, "-")
  doc.save(`Meridian-Statement-${safeMonth}.pdf`)
}
