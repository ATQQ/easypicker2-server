import { Middleware } from 'flash-wolves'
import { publicError } from '@/constants/errorMsg'
import { addBehavior, getClientIp } from '@/db/logDb'
import { USER_POWER } from '@/db/model/user'
import { getUserInfo } from '@/utils/userUtil'

const interceptor: Middleware = async (req, res) => {
  const { options } = req.route
  const logIp = getClientIp(req)
  if (!options) return
  console.log(`路由拦截:${req.method} - ${req.url}`)
  const { needLogin, userPower } = options
  if (needLogin && (!req.headers.token || !(await getUserInfo(req)))) {
    addBehavior(req, {
      module: 'interceptor',
      msg: `非法操作,没有权限 ip:${logIp} path:${req.url} 未登录`,
      data: {
        ip: logIp,
        url: req.url,
      },
    })
    res.failWithError(publicError.request.notLogin)
  }

  if (userPower === USER_POWER.SUPER) {
    const user = await getUserInfo(req)
    if (user.power !== userPower) {
      addBehavior(req, {
        module: 'interceptor',
        msg: `非法操作,没有权限 ip:${logIp} path:${req.url} 权限不足`,
        data: {
          ip: logIp,
          url: req.url,
        },
      })
      res.failWithError(publicError.request.notLogin)
    }
  }
}
export default interceptor
