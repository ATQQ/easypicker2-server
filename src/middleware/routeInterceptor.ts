import { publicError } from '@/constants/errorMsg'
import { addBehavior, getClientIp } from '@/db/logDb'
import { Middleware } from '@/lib/server/types'
import { getUserInfo } from '@/utils/userUtil'

const interceptor: Middleware = async (req, res) => {
  const { options } = req.route
  if (!options) return
  console.log(`路由拦截:${req.method} - ${req.url}`)
  const { needLogin } = options
  if (needLogin && (!req.headers.token || !(await getUserInfo(req)))) {
    const logIp = getClientIp(req)
    addBehavior(req, {
      module: 'interceptor',
      msg: `非法操作,没有权限 ip:${logIp} 未登录`,
      data: {
        ip: logIp,
      },
    })
    res.failWithError(publicError.request.notLogin)
  }
}
export default interceptor
