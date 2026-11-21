# Voxnelo 本地源码运行指南

此文件说明如何从**当前 Git 仓库**安装开发依赖并运行 Voxnelo，不是历史 `v0.1` ZIP 启动器的安装手册，也不是面向最终用户的桌面安装流程。

- **源码版本：** 以 [package.json](package.json) 为准，当前为 `1.0.4`（未公开的开发候选）。
- **公开桌面版：** [v1.0.3](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.3)；要安装桌面应用请阅读 [用户指南](docs/USER-GUIDE.md)。
- **开发工具链：** Node.js 26（Active LTS）、pnpm 12.22.0。Node.js 26 **不内置 Corepack**，不要假设 `corepack enable` 可用。

## 在自己的开发目录运行

在已安装 Node.js 26 的终端运行：

```bash
git clone https://github.com/kunlong-luo/voxnelo.git
cd voxnelo
npm install --global pnpm@12.22.0
pnpm --version
pnpm install --frozen-lockfile
pnpm check:toolchain
pnpm dev
```

`pnpm --version` 应输出 `12.22.0`。如已拥有本地仓库，直接在现有目录更新代码；**不要重新 `git init`、覆盖个人数据、解压旧版 ZIP 覆盖源文件，或删除学习历史/私人 Moonshine 模型目录**。若已有 pnpm 且版本正确，可跳过全局安装步骤。

`pnpm install --frozen-lockfile` 使用仓库已提交的 `pnpm-lock.yaml`，不会为了首次安装重新生成版本锁。首次安装需要从可信软件包仓库下载依赖。仅运行网页界面可使用 `pnpm dev:web`，但网页预览并不等同于 Electron 桌面功能或离线模型能力。

## 验证与打包

```bash
pnpm check:stable-deps
pnpm typecheck
pnpm lint
pnpm docs:check
pnpm test:coverage
pnpm build
```

Windows、macOS、Linux 的本机安装包要在受支持的平台构建和验证，不能把本地 `pnpm build` 当作已签名或已发布。参阅 [开发指南](docs/DEVELOPMENT.md) 与 [发布运维说明](docs/engineering/RELEASE-OPERATIONS.md)。

> 历史 `voxnelo-desktop-starter-v0.1.zip`、私人 `/home/.../Projects` 路径和旧 pnpm 指令已不适用于当前仓库；历史材料如需追溯应查看 Git 提交记录，不应作为新用户安装步骤。
