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
- 搜索并查看动作 GIF、目标肌肉和多步骤说明
- 每个动作独立保存训练笔记
- 收藏常用动作
- 笔记和收藏保存在当前浏览器的 `localStorage` 中

## 数据与媒体

动作数据来自 `hasaneyldrm/exercises-dataset`。代码和数据结构使用 MIT License；动作图片与 GIF 属于 Gym Visual，使用或发布前请阅读上游仓库的 `LICENSE` 与 `NOTICE.md`。
