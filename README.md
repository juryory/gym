# 练练

一个基于 [Exercises Dataset](https://github.com/hasaneyldrm/exercises-dataset) 的健身动作浏览与训练笔记网站。

## 本地运行

这是纯静态网站，可以直接打开 `index.html`。为避免浏览器对本地请求的限制，推荐启动一个本地服务器：

```powershell
python -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 功能

- **动作库**：按器械和部位筛选 1,324 个动作，查看动画、目标肌肉和分步说明
- **训练记录**：按次记录，每个动作逐组填重量和次数，翻开动作能看到上次练到多少
- **动作技巧**：把私教纠正的要点按动作累积，注明是谁教的
- **训练计划**：把练过的内容存成计划，没私教的时候照着开练
- 收藏常用动作，数据可导出为 JSON 备份

## 数据存在哪

目前全部存在当前浏览器的 `localStorage` 里（键名 `lianlian:v1`）。这意味着：

> **换手机、清缓存、或 iOS Safari 长期不访问自动清理，记录就没了。** 页脚有「导出备份」，
> 建议定期导出。导入是按 id 合并，同一份备份重复导入不会产生重复记录。

云端同步和多人功能见下面的「后续规划」。

### 数据结构

`store.js` 是唯一的数据出入口，UI 不直接碰 `localStorage`。三类数据分开存，因为它们的
隐私属性完全不同——这个划分是为将来的公开/私密开关准备的：

| | 内容 | 隐私 |
| --- | --- | --- |
| `sessions` | 某天做了什么、每组重量次数 | 高，含个人身体数据 |
| `tips` | 绑在动作上的技巧要点 | 低，最适合分享 |
| `plans` | 动作清单加目标组次 | 中 |

老版本的「每个动作一段自由文本」会在首次加载时自动转成 `tips`，旧的 localStorage 键
原样保留作为兜底，不会删除。

## 后端：账号与云同步

`server/` 是一个**零 npm 依赖**的 Node 服务，只用内置模块（`node:sqlite`、`node:crypto`、
`node:http`），不需要 `npm install`，也不需要编译工具链。只提供 `/api/*`，静态文件仍由
Nginx 直接伺服。

需要 **Node 22.5 以上**（`node:sqlite` 从这个版本开始可用）。

```bash
cd server
DB_FILE=/www/lianlian-data/gym.db PORT=3000 node server.js
```

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 监听端口 |
| `BIND` | `127.0.0.1` | 只监听本机，由 Nginx 反代，不直接暴露公网 |
| `DB_FILE` | 仓库外的 `../lianlian-data/gym.db` | SQLite 文件路径 |

> **数据库文件绝不能放在网站根目录里。** 网站根目录就是仓库根目录，放进去意味着
> `https://你的域名/data/gym.db` 能被任何人下载，里面是所有用户的密码哈希和训练记录。
> 默认路径已经指到仓库外，改 `DB_FILE` 时别改回来。

### 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 注册，返回 httpOnly cookie |
| POST | `/api/auth/login` | 登录，连续失败 8 次后限速 15 分钟 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/me` | 当前用户，未登录返回 `null` |
| POST | `/api/sync` | 双向同步，见下 |
| GET | `/api/public/tips?exerciseId=` | 某个动作下所有人公开的技巧 |
| GET | `/api/public/plans` | 公开的训练计划 |

### 同步怎么工作

客户端推本地改动、拉服务端改动，两边都按 `updatedAt` **最后写入胜出**。删除写**墓碑**
（`deletedAt`）而不是真删——否则在手机上删掉的记录，下次从平板同步回来会复活。

**写入永远是本地优先**：填一组「45kg × 6」直接落 `localStorage` 并立刻返回，同步在后台
跑。器械房信号差是常态，记一组不该等网络，断网也能照常用。

隐私边界在服务端强制，不信任客户端：训练记录（含个人重量数据）无论客户端传什么
`visibility` 都会被改写成 `private`，只有技巧和计划能公开。

## 部署（宝塔面板）

### 1. 静态站

站点根目录指向仓库。可以先只部署静态部分——**后端没起来时整站照常可用**，只是没有
登录和同步。

### 2. Node 后端

宝塔「软件商店」装 **Node 版本管理器**，选 22.5 以上的版本。然后「网站 → Node 项目 →
添加 Node 项目」：

- 项目目录：仓库的 `server/` 子目录
- 启动方式：`node server.js`（或 `npm start`）
- 端口：`3000`
- 环境变量：`DB_FILE=/www/lianlian-data/gym.db`

数据库目录要**建在网站根目录之外**，并给运行用户写权限。

### 3. 反向代理

「网站 → 设置 → 反向代理」，添加：

- 代理名称：`api`
- 目标 URL：`http://127.0.0.1:3000`
- 发送域名：`$host`
- 代理目录：`/api`

登录 cookie 的 `Secure` 标志依赖 `X-Forwarded-Proto`，确认反代配置里有这一行
（宝塔默认模板通常带，没有就手动加）：

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

### 4. HTTPS

「网站 → SSL」签一张 Let's Encrypt 证书并开启强制 HTTPS。登录令牌走 cookie，明文 HTTP
下会被中间人截取。

### 5. 备份

数据库就是一个文件，宝塔「计划任务」加一条 shell 定时备份即可。SQLite 开了 WAL，
**热备份要用 `.backup` 而不是直接 `cp`**，否则可能拷到不一致的状态：

```bash
sqlite3 /www/lianlian-data/gym.db ".backup '/www/backup/gym-$(date +\%F).db'"
```

## 素材放腾讯云 COS

把 `assets/` 整个目录传到存储桶根目录（保持 `images/`、`videos/` 两级结构），然后改
`app.js` 顶部这一行：

```js
const MEDIA_ROOT = "https://your-bucket.cos.ap-guangzhou.myqcloud.com/";
```

其余代码无需改动。桶要设为公有读，并在跨域设置里允许你的站点域名。

## 数据与素材

数据和素材都随仓库一起分发，页面不依赖任何外部 CDN：

| 路径 | 内容 | 体积 |
| --- | --- | --- |
| `data/exercises.json` | 1,324 条动作，仅保留 UI 用到的字段与中英文说明 | 1.4 MB |
| `assets/images/` | 动作缩略图，1,324 张 JPEG | 8.5 MB |
| `assets/videos/` | 动作动画，1,324 个 animated WebP | 39.7 MB |

原先这些资源通过 `cdn.jsdelivr.net` 引用上游仓库，而该域名在国内长期存在 DNS 污染，
列表页几十个并发图片请求几乎必然失败，因此改为同源加载。

### 重新生成

素材是派生产物，可以用 [`tools/build-assets.py`](tools/build-assets.py) 从上游仓库重新生成
（需要 `gif2webp`，Debian/Ubuntu 装 `webp` 包，macOS 用 `brew install webp`）：

```bash
git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset /tmp/exercises-dataset
python3 tools/build-assets.py --source /tmp/exercises-dataset
```

脚本会把 GIF 转成 animated WebP（约为原体积的三分之一，保持 180×180），并把上游 16.6 MB
的十语种数据裁到 1.4 MB。

### 改用对象存储

若不想让素材随仓库分发，把 `assets/` 目录整个上传到存储桶根目录，再把 `app.js` 顶部的
`MEDIA_ROOT` 换成桶域名即可，其余代码无需改动：

```js
const MEDIA_ROOT = "https://your-bucket.cos.ap-guangzhou.myqcloud.com/";
```

### 版权

动作数据（名称、分类、部位、器械、说明）来自 `hasaneyldrm/exercises-dataset`，采用 MIT License。

动作缩略图与动画**属于 Gym visual（https://gymvisual.com/），不在 MIT 范围内**。上游仓库是
获得单独书面许可后转载的，其 `NOTICE.md` 明确写着「cloning this repo is not a license」——
也就是说克隆上游并不会把许可一并传递给下游。上游许可的条件包括：仅以 180×180 分辨率分发、
每次使用都必须保留 `© Gym visual — https://gymvisual.com/` 署名（本站已放在页脚）。

**本仓库自行分发这批素材，需要向 Gym visual 取得自己的授权。** 公开部署前请先阅读
[Gym visual 使用条款](https://gymvisual.com/content/3-terms-and-conditions-of-use)。
