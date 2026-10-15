# 安装到本机指定目录

**目标目录**：`/home/spark/Projects/github/voxnelo/`

源码包内使用项目根相对路径，推荐以下安全解压方式，不会覆盖你已经整理的 PRD：

```bash
mkdir -p /home/spark/Projects/github/voxnelo
unzip -n voxnelo-desktop-starter-v0.1.zip -d /home/spark/Projects/github/voxnelo
cd /home/spark/Projects/github/voxnelo
corepack enable
corepack prepare pnpm@12.11.2 --activate
pnpm install
pnpm dev
```

如果你之前在同一目录放了与项目源码同名的旧文件，`unzip -n` 会跳过它们；请先对比内容再手动合并。项目中已有 `.git` 时不要重新初始化或强制覆盖。

如该目录尚未初始化 Git：

```bash
cd /home/spark/Projects/github/voxnelo
[ -d .git ] || git init
# 完成运行与检查后再手动提交
```

> 说明：此档案是源码，不含 `node_modules`、npm 锁文件及预编译可执行文件。首次执行 `pnpm install` 需要访问 npm 软件包仓库，安装成功后生成 pnpm-lock.yaml，建议提交锁文件以保持构建可复现。
