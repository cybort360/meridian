import { format } from "date-fns"
import { fromUSDCBaseUnits } from "@/lib/utils/usdc"
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

// Plain decimal string (no thousands separators) so the values parse cleanly in
// Excel / Sheets. Base units → "1234.56".
function money(baseUnits: string): string {
  return fromUSDCBaseUnits(BigInt(baseUnits))
}

function humanize(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase()
}

// RFC 4180 field escaping: wrap in quotes when the value contains a comma,
// quote, or newline, and double any embedded quotes.
function cell(value: string | number): string {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function row(...cells: Array<string | number>): string {
  return cells.map(cell).join(",")
}

// Builds a bank-statement-style CSV for the selected month: an account block, a
// summary section, then the transaction ledger with a totals row. Returns the
// full CSV text. Replaces the old PDF export (jsPDF) — CSV streams reliably and
// opens straight into any spreadsheet.
export function buildStatementCsv(input: StatementInput): string {
  const { account, stats: s, secondary: sec } = input
  const lines: string[] = []

  // ── Header / account block ────────────────────────────────────────────────
  lines.push(row("Meridian Finance Statement"))
  lines.push(row("Period", input.monthLabel))
  lines.push(row("Generated", format(input.generatedAt, "dd MMM yyyy, HH:mm")))
  lines.push(row("Account", account.companyName ?? account.name))
  lines.push(row("Name", account.name))
  lines.push(row("Role", account.role))
  lines.push(row("Wallet", account.walletAddress ?? "—"))
  lines.push(row("Network", "Arc testnet (USDC)"))
  lines.push("")

  // ── Summary ───────────────────────────────────────────────────────────────
  lines.push(row("Summary"))
  lines.push(row("Metric", "Value"))
  lines.push(row("Total Financed (USDC)", money(s.totalFinanced)))
  lines.push(row("Capital Deployed (USDC)", money(s.capitalDeployed)))
  lines.push(row("Active Invoices", s.activeInvoices))
  lines.push(
    row(
      "Avg Settlement (days)",
      s.avgSettlementDays === null ? "—" : s.avgSettlementDays.toFixed(1)
    )
  )
  lines.push(
    row("On-Time Rate (%)", s.onTimeRate === null ? "—" : s.onTimeRate)
  )
  lines.push(row("Paid Invoices", sec.paid.count))
  lines.push(row("Paid Amount (USDC)", money(sec.paid.amount)))
  lines.push(row("Due Invoices", sec.due.count))
  lines.push(row("Due Amount (USDC)", money(sec.due.amount)))
  lines.push(row("Overdue Invoices", sec.overdue.count))
  lines.push(row("Overdue Amount (USDC)", money(sec.overdue.amount)))
  lines.push("")

  // ── Transactions ledger ───────────────────────────────────────────────────
  lines.push(row("Transactions"))
  lines.push(
    row(
      "Date",
      "Type",
      "Direction",
      "Counterparty",
      "Money In (USDC)",
      "Money Out (USDC)",
      "Status",
      "Tx Hash"
    )
  )

  let totalIn = 0n
  let totalOut = 0n
  if (input.transactions.length === 0) {
    lines.push(row("No transactions in this period."))
  } else {
    for (const t of input.transactions) {
      const amt = BigInt(t.amountUSDC)
      const inbound = t.direction === "IN"
      if (inbound) totalIn += amt
      else totalOut += amt
      lines.push(
        row(
          format(new Date(t.date), "yyyy-MM-dd"),
          humanize(t.type),
          t.direction,
          t.counterparty,
          inbound ? money(t.amountUSDC) : "",
          inbound ? "" : money(t.amountUSDC),
          t.status,
          t.txHash ?? ""
        )
      )
    }
    lines.push(
      row(
        "Total",
        "",
        "",
        "",
        money(totalIn.toString()),
        money(totalOut.toString()),
        "",
        ""
      )
    )
  }

  // Lead with a BOM so Excel reads the UTF-8 correctly; CRLF per RFC 4180.
  return "﻿" + lines.join("\r\n") + "\r\n"
}
