# /bin/bash
compressDir="./src ./upload package.json tsconfig.json yarn.lock" # 需要压缩目录 
compressFile="ep2-server.tar.gz"        # 压缩后的文件名
echo "开始-----归档压缩"
tar -zvcf ${compressFile} ${compressDir}