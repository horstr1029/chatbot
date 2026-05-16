export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error', ts: new Date().toISOString() }, { status: 503 })
  }
}
