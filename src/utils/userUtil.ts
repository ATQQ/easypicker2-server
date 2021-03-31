import { FWRequest } from '@/lib/server/types'
import tokenUtil from './tokenUtil'

export async function getUserInfo(req: FWRequest) {
    return tokenUtil.getUserInfo(req.headers['token'] as string)
}