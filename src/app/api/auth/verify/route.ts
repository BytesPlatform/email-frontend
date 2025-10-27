import { NextRequest, NextResponse } from 'next/server'
import { API_CONFIG } from '@/lib/constants'

// Helper function to proxy requests to backend
async function proxyRequest(
  request: NextRequest,
  endpoint: string,
  method: string = 'POST'
) {
  try {
    const body = method !== 'GET' ? await request.text() : undefined
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Forward cookies for authentication
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
    }

    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      method,
      headers,
      body,
    })

    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If not JSON, return error
      console.error('Backend returned non-JSON response:', {
        status: response.status,
        contentType,
        url: `${API_CONFIG.baseUrl}${endpoint}`
      })
      return NextResponse.json(
        { error: 'Backend returned invalid response format' },
        { status: 502 }
      )
    }

    // Create response with same status
    const nextResponse = NextResponse.json(data, { status: response.status })

    // Forward set-cookie headers from backend
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader)
    }

    return nextResponse
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/auth/verify
export async function GET(request: NextRequest) {
  return proxyRequest(request, '/auth/verify', 'GET')
}
