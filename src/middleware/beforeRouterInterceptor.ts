import { Middleware } from 'flash-wolves'
import { addRequestLog } from '@/db/logDb'

const interceptor: Middleware = async (req) => {
  addRequestLog(req)
}
export default interceptor
