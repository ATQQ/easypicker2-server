import { FWRequest } from 'flash-wolves'
import tokenUtil from './tokenUtil'

export async function getUserInfo(req: FWRequest) {
  if (!req.headers.token) {
    return null
  }
  return tokenUtil.getUserInfo(req.headers.token as string)
}

/**
 * 获取实际可以使用的大小，以字节为单位
 */
export function calculateSize(size: number) {
  // 换算成GB
  return size * 1024 * 1024 * 1024
}
