import { addRequestLog } from '@/db/logDb'
import { Middleware } from 'flash-wolves'

const interceptor: Middleware = async (req, res) => {
  addRequestLog(req)
}
export default interceptor
