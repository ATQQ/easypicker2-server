# /bin/bash
source="build/serverless"
target="dist"
rm -rf $target/
tarFile="temp.tar.gz"
echo "开始编译ts"
tsc