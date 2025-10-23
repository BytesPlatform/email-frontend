import { NextResponse } from 'next/server'

// POST /api/auth/login
export async function POST() {
  try {
    // Since we're using client-side authentication, 
    // just return success for API calls
    return NextResponse.json({ success: true, message: 'Use client-side auth' })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/auth/me
export async function GET() {
  try {
    // Since we're using client-side authentication,
    // just return a message
    return NextResponse.json({ 
      message: 'Use client-side authentication',
      user: null 
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

