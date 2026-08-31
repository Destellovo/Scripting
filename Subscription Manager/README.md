# Subscription Manager

使用 SF Symbols 的 Scripting 订阅管理项目。

## 功能

- 新增、编辑、删除订阅
- 周 / 月 / 季 / 年 / 一次性周期
- 试用期、自动续费、结束日期与续费提醒
- 本月 / 年度支出按当前汇率统一换算为人民币（汇率每 12 小时自动刷新，离线时使用最近缓存）
- 支持 CNY、USD、TRY、ARS、INR、BRL 等常见币种与低价区货币
- Widget 小号 / 中号 / 大号分别显示最近到期的 2 / 4 / 6 个项目
- Widget 标题使用小号英文 `Due Date`
- SF Symbols 预设及自定义 Symbol 名称
- Widget 仅显示 SF Symbol、剩余天数和可自定义颜色进度条
- 所有子页面提供返回与关闭操作

## 数据

数据存储于 Scripting App Group：

```text
subscription_manager_v2/subscriptions.json
subscription_manager_v2/settings.json
```
