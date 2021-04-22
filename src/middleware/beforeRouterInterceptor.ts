import { addRequestLog } from '@/db/logDb'
import { Middleware } from '@/lib/server/types'

const interceptor: Middleware = async (req, res) => {
  addRequestLog(req)
}
export default interceptor
