import { addErrorLog } from '@/db/logDb'
import { BeforeRuntimeErrorInterceptor } from '@/lib/server/types'

const interceptor: BeforeRuntimeErrorInterceptor = async (req, res, err) => {
  addErrorLog(req, err.toString(), err.stack)
}
export default interceptor
