/**
 * 컨셉 목록 API
 * 현재 활성 컨셉 목록 반환
 */
import { NextResponse } from 'next/server'
import { CONCEPTS } from '@/lib/profileforge/concepts'

export async function GET() {
  return NextResponse.json({
    count: CONCEPTS.length,
    concepts: CONCEPTS,
  })
}
