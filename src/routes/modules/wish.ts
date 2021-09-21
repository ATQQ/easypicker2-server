import { Wish, WishStatus } from '@/db/model/wish'
import { addWishData } from '@/db/wishDb'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'
import {
  FwController,
  FWRequest,
  FWResponse,
  RouterController,
  RouteMapping,
} from 'flash-wolves'

@RouterController('wish')
export default class WishRouter extends FwController {
    @RouteMapping('post', 'add', {
      needLogin: true,
    })
  async add(
    req: FWRequest,
    res: FWResponse,
  ) {
    const user = await getUserInfo(req)
    const wish:Wish = {
      ...req.body,
      id: getUniqueKey(),
      userId: user.id,
      status: WishStatus.REVIEW,
    }
    await addWishData(wish)
    res.success()
  }
}
