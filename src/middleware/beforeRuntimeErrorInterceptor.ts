import { addErrorLog } from '@/db/logDb'
import { RuntimeErrorInterceptor } from '@/lib/server/types'

const interceptor: RuntimeErrorInterceptor = async (req, res, err) => {
  addErrorLog(req, err.toString(), err.stack)
}
export default interceptor
