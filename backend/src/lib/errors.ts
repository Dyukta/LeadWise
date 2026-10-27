import type { NextFunction, Request, RequestHandler, Response } from 'express'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const badRequest = (message: string) => new ApiError(400, message)
export const forbidden = (message = 'Only the owner can do that.') => new ApiError(403, message)
export const notFound = (message: string) => new ApiError(404, message)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

export function requireId(value: unknown): string {
  if (!isUuid(value)) throw badRequest('That record id is not valid.')
  return value
}

export function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function route(
  handler: (req: Request, res: Response) => Promise<unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res)
      .then((body) => {
        if (!res.headersSent) res.json(body)
      })
      .catch(next)
  }
}

const BODY_ERRORS: Record<string, [number, string]> = {
  'entity.parse.failed': [400, 'Expected a JSON body.'],
  'entity.too.large': [413, 'That request is too large.']
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(error)
    return
  }
  if (error instanceof ApiError) {
    res.status(error.status).json({ ok: false, error: error.message })
    return
  }

  const known = BODY_ERRORS[isRecord(error) ? String(error.type) : '']
  if (known) {
    res.status(known[0]).json({ ok: false, error: known[1] })
    return
  }

  console.error(error)
  res.status(500).json({ ok: false, error: 'The server hit an unexpected error. Try again in a moment.' })
}
