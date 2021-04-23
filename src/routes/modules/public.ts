import Router from '@/lib/Router'
import { rMobilePhone } from '@/utils/regExp'
import { UserError } from '@/constants/errorMsg'
import { randomNumStr } from '@/utils/randUtil'
import { setRedisValue } from '@/db/redisDb'
import { sendMessage } from '@/utils/tencent'
import { addBehavior } from '@/db/logDb'

const router = new Router('public')

router.get('code', (req, res) => {
  const { phone } = req.query
  // 手机号不正确,直接返回
  if (!rMobilePhone.test(phone)) {
    addBehavior(req, {
      module: 'public',
      msg: `获取验证码 手机号:${phone} 格式不正确`,
      data: {
        phone,
      },
    })
    res.failWithError(UserError.mobile.fault)
    return
  }
  const code = randomNumStr(4)
  const logPhone = phone.slice(-4)
  addBehavior(req, {
    module: 'public',
    msg: `获取验证码 手机号:${logPhone}  验证码:${code} 成功`,
    data: {
      phone: logPhone,
      code,
    },
  })
  if (process.env.NODE_ENV !== 'development') {
    sendMessage(phone, code, 2)
  }
  console.log(code)
  setRedisValue(`code-${phone}`, code, 120)
  res.success()
})

export default router
