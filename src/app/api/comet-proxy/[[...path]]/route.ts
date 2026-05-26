import { NextRequest, NextResponse } from 'next/server'

const COMET_TARGET = 'http://172.192.41.96:26657'

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'proxy-authenticate',
  'proxy-authorization',
])

async function proxy(req: NextRequest, path: string[]) {
  const target = `${COMET_TARGET}/${path.join('/')}${req.nextUrl.search}`

  const headers = new Headers(req.headers)
  for (const h of HOP_BY_HOP) headers.delete(h)

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    duplex: 'half',
  })

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  })
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params.path ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params.path ?? [])
}

export async function PUT(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params.path ?? [])
}

export async function PATCH(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params.path ?? [])
}

export async function DELETE(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params.path ?? [])
}

export async function OPTIONS(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params.path ?? [])
}
