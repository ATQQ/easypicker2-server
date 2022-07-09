import { Middleware } from 'flash-wolves'
import { publicError } from '@/constants/errorMsg'
import { addBehavior } from '@/db/logDb'
import { USER_POWER } from '@/db/model/user'
import { getUserInfo } from '@/utils/userUtil'

const interceptor: Middleware = async (req, res) => {
  const { meta } = req.route
  if (!meta || Object.keys(meta).length === 0) return
  // console.log(`路由拦截:${req.method} - ${req.url}`)
  const { needLogin, userPower, CORS } = meta
  if (CORS) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  if (needLogin && (!req.headers.token || !(await getUserInfo(req)))) {
    addBehavior(req, {
      module: 'interceptor',
      msg: `非法操作,未登录 path:${req.url}`,
      data: {
        url: req.url,
      },
    })
    res.failWithError(publicError.request.notLogin)
    return
  }

  if ([USER_POWER.SUPER, USER_POWER.SYSTEM].includes(userPower)) {
    const user = await getUserInfo(req)
    if (user.power !== userPower) {
      addBehavior(req, {
        module: 'interceptor',
        msg: `非法操作,权限不足 path:${req.url} `,
        data: {
          url: req.url,
        },
      })
      res.failWithError(publicError.request.notLogin)
    }
  }
}
export default interceptor
