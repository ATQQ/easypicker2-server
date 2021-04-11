import Router from '@/lib/Router'
import { getUploadToken } from '@/utils/qiniuUtil'

const router = new Router('file')

router.get('token',(req,res)=>{
    const token = getUploadToken()
    res.success({
        token
    })
})
export default router
