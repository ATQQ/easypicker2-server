import { Response } from 'flash-wolves'

export function wrapperCatchError(err: any) {
  const { code, msg } = err || {}
  if (code && msg) {
    return Response.failWithError(err)
  }
  throw err
}
