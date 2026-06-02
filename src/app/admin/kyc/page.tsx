import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ApproveButton } from "./ApproveButton"

// Basic admin review screen — lists submissions awaiting review.
export default async function AdminKycPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const pending = await prisma.user.findMany({
    where: { kycStatus: "PENDING_REVIEW" },
    select: { id: true, email: true, name: true, kycSubmission: true },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div style={{ padding: 24, color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>KYC — Pending Review ({pending.length})</h1>
      {pending.length === 0 && <p>No submissions awaiting review.</p>}
      {pending.map((u) => {
        const s = u.kycSubmission
        return (
          <div
            key={u.id}
            style={{
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <p>
              <strong>{u.name}</strong> · {u.email}
            </p>
            {s && (
              <ul style={{ fontSize: 14, lineHeight: 1.7 }}>
                <li>Business: {s.legalBusinessName}</li>
                <li>Trade License #: {s.tradeLicenseNumber}</li>
                <li>Commercial Reg #: {s.commercialRegNumber}</li>
                <li>Industry: {s.industry}</li>
                <li>
                  Address: {s.businessAddress}, {s.city}, {s.country}
                </li>
                <li>Phone: {s.phoneNumber}</li>
                <li>
                  Docs:{" "}
                  <a href={s.tradeLicenseDocUrl} target="_blank" style={{ color: "#34d399" }}>
                    Trade License
                  </a>
                  {" · "}
                  <a href={s.ownerIdDocUrl} target="_blank" style={{ color: "#34d399" }}>
                    Owner ID
                  </a>
                  {s.proofOfAddressUrl && (
                    <>
                      {" · "}
                      <a href={s.proofOfAddressUrl} target="_blank" style={{ color: "#34d399" }}>
                        Proof of Address
                      </a>
                    </>
                  )}
                </li>
              </ul>
            )}
            <ApproveButton userId={u.id} />
          </div>
        )
      })}
    </div>
  )
}
