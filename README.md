# 数算 A · 练习室

从 `期中复习题库(1).pdf` 提取的静态练习网站。共 **210 道**：184 道分章题、26 道模拟题。

公开练习网址：**https://lockheed-git.github.io/dsa-practice/**

无需登录，手机和电脑均可访问。练习进度保存在访问者自己的浏览器中。

## 使用

直接双击 `dist/index.html` 即可离线练习，无需安装依赖。也可以运行 `python -m http.server 4173 --directory dist`，访问 http://localhost:4173。

- 随机练习一轮内不会重复，结束后可开始下一轮；支持上一题和顺序练习。
- 按章节、题型、重点题、未练习和未掌握筛选，支持题号和题面关键词搜索。
- 答案默认收起，每次换题重新隐藏；点击“查看答案”后自评“已掌握”或“还需复习”。
- 支持收藏和每题草稿；记录保存在当前浏览器的 localStorage。不同浏览器、设备或网址不会同步；清除浏览器数据会移除记录。
- 题面与长答案使用原 PDF 的清晰裁图，保留公式、代码缩进和图示；点击图片可放大。
- 空格展开/收起答案，左右方向键切题（输入时不触发）。

## 数据

`dist/questions.json`：完整题库，包括题号、章节、题型、重点标记、题面、答案、原书页码、PDF 页码、原始区域坐标和图片路径。

`dist/questions.js`：相同数据的离线加载版本。

模拟卷的前 22 道题原本共用三块集中答案，已逐题人工拆分并整理公式为 Unicode 文本；其余 188 道题均有分别裁切的题面与答案。答案沿用原题库，未另外改写解法或进行学术勘误。文字检索版本可能丢失复杂公式的上下标，练习页面以原图显示为准。

章节题量：概论 28、线性表 27、栈与队列 33、字符串 27、二叉树 36、树 33；模拟卷 26。

## 维护

- `node scripts/verify.js`：检查完整性、资源、随机无重复、筛选及边界情形。
- `scripts/inspect_pdf.py` 和 `scripts/extract_bank.py` 为本次 PDF 提取脚本，使用 PyMuPDF 和 Pillow；重新提取前执行 `python -m pip install -r requirements-extract.txt`，并依次运行两个脚本。PDF 源文件放在本项目上一级目录。
- 将 `dist/` 内容上传到 GitHub Pages 等静态托管服务即可运行。不需要后端或账号系统。
- 本仓库的 `main` 分支保存完整源码，`gh-pages` 分支发布 `dist/` 内容。修改后先提交到 `main`，再运行 `pwsh -File scripts/publish-pages.ps1` 推送源码并更新公开网站。

交互参考：https://lwlaymh.github.io/ics-test/ 。本项目独立实现。
