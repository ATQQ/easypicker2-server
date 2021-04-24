import { selectFiles } from '@/db/fileDb'
import {
  findLogCount, findLogReserve, findLogWithTimeRange, findPvLogWithRange,
} from '@/db/logDb'

import { USER_POWER } from '@/db/model/user'
import { selectAllUser } from '@/db/userDb'
import Router from '@/lib/Router'
import { ObjectId } from 'bson'

const router = new Router('super/user')

router.get('list', async (req, res) => {
  const columns = ['id', 'account', 'phone', 'status', 'join_time', 'login_time', 'login_count', 'open_time']
  const users = await selectAllUser(columns)
  res.success({
    list: users.map((u) => ({
      ...u,
      phone: u.phone && u.phone.slice(-4),
    })),
  })
},
{
  userPower: USER_POWER.SUPER,
  needLogin: true,
})
export default router
