import { UserError } from '@/constants/errorMsg'
import { insertUser, selectUserByAccount, selectUserByPhone } from '@/db/userDb'
import Router from '@/lib/Router'
import { rMobilePhone } from '@/utils/regExp'
import storageUtil from '@/utils/storageUtil'
import { encryption } from '@/utils/stringUtil'

const router = new Router('user')

router.post('register', async (req, res) => {
    const { account, pwd, bindPhone, phone, code } = req.data

    // 检查账号是否存在
    let [user] = await selectUserByAccount(account)

    // 存在返回错误
    if (user) {
        res.failWithError(UserError.account.exist)
        return
    }

    // 绑定手机
    if (bindPhone) {
        if (!rMobilePhone.test(phone)) {
            res.failWithError(UserError.mobile.fault)
            return
        }

        if (!code || code !== storageUtil.getItem(phone)?.value) {
            res.failWithError(UserError.code.fault)
            return
        }
        // 检查手机号是否存在
        ([user] = await selectUserByPhone(phone))

        // 存在返回错误
        if (user) {
            res.failWithError(UserError.mobile.exist)
            return
        }
        // 过期验证码
        storageUtil.expireItem(phone)
    }

    // 不存在则加入
    insertUser({
        password: encryption(pwd),
        account,
        ...(bindPhone ? { phone } : {})
    }).then(() => {
        res.success()
    })
})

export default router