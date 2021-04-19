import { UserError } from '@/constants/errorMsg'
import { User, USER_STATUS } from '@/db/model/user'
import { expiredRedisKey, getRedisVal, setRedisValue } from '@/db/redisDb'
import { insertUser, selectUserByAccount, selectUserByPhone } from '@/db/userDb'
import Router from '@/lib/Router'
import { rAccount, rMobilePhone, rPassword } from '@/utils/regExp'
import { encryption } from '@/utils/stringUtil'
import tokenUtil from '@/utils/tokenUtil'

const router = new Router('user')

/**
 * 注册
 */
router.post('register', async (req, res) => {
    const { account, pwd, bindPhone, phone, code } = req.body
    if (!rAccount.test(account)) {
        res.failWithError(UserError.account.fault)
        return
    }
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
        const rightCode = await getRedisVal(`code-${phone}`)
        if (!code || code !== rightCode) {
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
        expiredRedisKey(phone)
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

/**
 * 登录
 */
router.post('login', async (req, res) => {
    const { account = '', pwd = '' } = req.body
    const isAccount = rAccount.test(account)
    const isPhone = rMobilePhone.test(account)
    // 帐号不正确
    if (account.length !== 11 && !isAccount) {
        res.failWithError(UserError.account.fault)
        return
    }
    // 手机号不正确
    if (account.length === 11 && !isPhone) {
        res.failWithError(UserError.mobile.fault)
        return
    }
    // 密码不正确
    if (!rPassword.test(pwd)) {
        res.failWithError(UserError.pwd.fault)
        return
    }
    let user: User
    if (isAccount) {
        ([user] = await selectUserByAccount(account))
    }
    if (isPhone) {
        ([user] = await selectUserByPhone(account))
    }
    if (!user) {
        res.failWithError(account.length === 11 ? UserError.mobile.fault : UserError.account.fault)
        return
    }
    if (user.password !== encryption(pwd)) {
        res.failWithError(UserError.pwd.fault)
        return
    }
    // TODO:状态判断
    if (user.status === USER_STATUS.BAN) {

    }
    if (user.status === USER_STATUS.FREEZE) {

    }
    // TODO:权限判断
    // TODO:更新最后登录信息
    const token = tokenUtil.createToken(user)
    res.success({
        token
    })
})

router.post('login/code', async (req, res) => {
    const { code, phone } = req.body
    const v = await getRedisVal(`code-${phone}`)
    if (code !== v) {
        res.failWithError(UserError.code.fault)
        return
    }
    const [user] = await selectUserByPhone(phone)

    if (!user) {
        res.failWithError(UserError.mobile.fault)
        return
    }
    // TODO:权限判断
    // TODO:更新最后登录信息
    const token = tokenUtil.createToken(user)
    setRedisValue(`code-${phone}`,'',1)
    res.success({
        token
    })
})
export default router