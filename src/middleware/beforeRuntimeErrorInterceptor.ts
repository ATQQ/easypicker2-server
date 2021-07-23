import { addErrorLog } from '@/db/logDb'
import { RuntimeErrorInterceptor } from 'flash-wolves'

const interceptor: RuntimeErrorInterceptor = async (req, res, err) => {
  addErrorLog(req, err.toString(), err.stack)
}
export default interceptor
