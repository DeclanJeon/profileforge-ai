/**
 * 컨셉 목록 API
 * 50개 핵심 컨셉 반환
 */
import { NextResponse } from 'next/server'
import { CONCEPTS } from '@/lib/profileforge/concepts'

export async function GET() {
  return NextResponse.json({
    count: CONCEPTS.length,
    concepts: CONCEPTS,
  })
}
