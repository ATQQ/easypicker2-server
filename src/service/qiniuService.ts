import { Context, InjectCtx, Provide } from 'flash-wolves'
import { getTipImageKey } from '@/utils/stringUtil'

@Provide()
export default class QiniuService {
  @InjectCtx()
  private ctx: Context

  constructor() {
    console.log('init success')
  }

  getTipImageKey(key: string, name: string, uid: number) {
    return getTipImageKey(key, name, uid)
  }
}
