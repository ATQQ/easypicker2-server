function isCmdExist() {
	local cmd="$1"
  	if [ -z "$cmd" ]; then
		echo "Usage isCmdExist yourCmd"
		return 1
	fi

	which "$cmd" >/dev/null 2>&1
	if [ $? -eq 0 ]; then
		return 0
	fi

	return 2
}

exist=0
notExist=2
repository="https://github.com/ATQQ/easypicker2-client.git"
if [ $1 == "gitee" ]
then
    echo "use gitee repository"
    repository="https://gitee.com/sugarjl/easypicker2-client.git"
else
    echo "use github repository"
fi


isCmdExist "git"
if [ $? == $notExist ]
then
  echo "❌ git"
  echo "请自行安装git"
  exit 2
else
  echo "✅ git"
fi

# 拉最新仓库代码
if [ ! -d "easypicker2-client/.git" ]; then
  echo "❌ git repository"
  git clone $repository
  cd easypicker2-client
  else
  cd easypicker2-client
  git pull
  echo "✅ git repository"
fi


# 安装依赖
pnpm install

# 执行构建
pnpm build

clientPkgName="client.tar.gz"

# 压缩产物
tar -zvcf $clientPkgName dist

# 拷贝产物
tar -xf $clientPkgName -C "../"

echo "✅ 部署完成 🎉🎉🎉"