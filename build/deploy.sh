# /bin/bash
compressFile="ep2-server.tar.gz"        # 压缩后的文件名
user="root"                         # 远程登录用户
origin="sugarat.top"                   # 远程登录origin
targetDir="/www/wwwroot/ep2.sugarat.top/server"     # 目标目录
echo "开始-----部署"
ssh -p22 ${user}@${origin} "rm -rf ${targetDir}/* && tar -zvxf ${compressFile} -C ${targetDir}"
echo "开始-----安装依赖"
ssh -p22 ${user}@${origin} "cd ${targetDir} && yarn install --production"
echo "开始-----重新启动"
ssh -p22 ${user}@${origin} "bash ${targetDir}/../runServer.sh"
echo "清理-----临时的文件"
rm -rf $compressFile