# /bin/bash
source="build/serverless"
target="dist"
rm -rf $target/
tarFile="temp.tar.gz"
echo "开始编译ts"
tsc

# echo "开始拷贝Serverless配置"
# tar -zvcf $tarFile $source
# tar -xf $tarFile -C $target
# mv $target/$source/* $target
# cp .env $target
# rm $tarFile
# rm -rf $target/build