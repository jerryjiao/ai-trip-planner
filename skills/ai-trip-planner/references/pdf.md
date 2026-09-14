# pdf · PDF 可选分支（打印塞给爸妈）

> **边界：不做主线维护。** 网页是唯一主线交付，PDF 是快照出口：需要纸质版时导一份，不为 PDF 单独调版式。导完的 PDF 不回收进流程，改动以网页为准、下次要用再导。

## 什么时候用

- 家里老人要纸质版、路上不想看手机。
- 需要塞进行李袋贴墙上的行程速查。

## 怎么导（从网页直接打）

攻略站是静态页，直接用无头浏览器打印成 A4：

```bash
# Chrome/Edge headless，一条一页
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --print-to-pdf=day1.pdf \
  --no-pdf-header-footer --print-to-pdf-no-header \
  "file://<staging目录绝对路径>/day1.html"
```

- 逐页导出后合并：`python3 -c "import pypdf,sys; w=pypdf.PdfWriter(); [w.append(p) for p in sys.argv[2:]]; w.write(sys.argv[1])" out.pdf day1.pdf day2.pdf ...`（缺 pypdf 就 `pip3 install pypdf`，或用系统「预览」手动合并）。
- 打印前把页面里的交互元素（勾选框）视为静态，不影响内容。
- **分页检查**：导完翻一遍，防止表格/时间轴被拦腰截断；截断的页面在网页里给该元素加 `page-break-inside:avoid` 再导。

## 注意

- 装备清单的勾选进度在 PDF 里是静态快照，勾选请用网页版。
- PDF 分发范围自己把握：内容含真实行程，别公开挂网。
