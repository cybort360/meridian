"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function ApproveButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function approve() {
    setLoading(true)
    await fetch(`/api/kyc/approve/${userId}`, { method: "POST" })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={approve}
      disabled={loading}
      style={{
        padding: "6px 12px",
        background: "#10b981",
        color: "#0f172a",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {loading ? "Approving..." : "Approve"}
    </button>
  )
}
