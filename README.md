# 练练

一个基于 [Exercises Dataset](https://github.com/hasaneyldrm/exercises-dataset) 的健身动作浏览与训练笔记网站。

## 本地运行

这是纯静态网站，可以直接打开 `index.html`。为避免浏览器对本地请求的限制，推荐启动一个本地服务器：

```powershell
python -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 功能

- 按器械筛选 1,324 个健身动作
- 搜索并查看动作动画、目标肌肉和多步骤说明
- 每个动作独立保存训练笔记
- 收藏常用动作
- 笔记和收藏保存在当前浏览器的 `localStorage` 中

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
