# /bin/bash
compressDir="./src ./upload package.json tsconfig.json pnpm-lock.yaml .env" # 需要压缩目录 
compressFile="ep-server.tar.gz"        # 压缩后的文件名
echo "开始-----归档压缩"
tar -zvcf ${compressFile} ${compressDir}