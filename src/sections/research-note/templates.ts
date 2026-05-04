import type { IconifyName } from 'src/components/iconify';

// 研究笔记模板（前端常量；后期可由后端 /api/research-note/templates 提供）

export type NoteTemplate = {
  id: string;
  name: string;
  description: string;
  icon: IconifyName;
  content: string;
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: '空白笔记',
    description: '从空白开始',
    icon: 'solar:document-bold',
    content: '',
  },
  {
    id: 'event',
    name: '事件研究',
    description: '聚焦突发事件 / 公告对个股或行业的影响',
    icon: 'solar:fire-bold',
    content: `# 事件标题

## 背景
- 事件来源：
- 发生时间：
- 涉及标的：

## 关键时点
- 

## 个股 / 行业影响
- 短期：
- 中期：

## 我的判断
> 

## 仓位计划
- [ ] 
`,
  },
  {
    id: 'earnings',
    name: '财报点评',
    description: '季度 / 年度财报核心数据 + 估值变动',
    icon: 'solar:chart-2-bold',
    content: `# 财报点评 — {公司名}

## 核心数据
| 指标 | 本期 | 同比 | 环比 |
| --- | --- | --- | --- |
| 营收 |  |  |  |
| 净利润 |  |  |  |
| 毛利率 |  |  |  |

## 业绩亮点 / 风险点
- 亮点：
- 风险：

## 估值变动
- 

## 一句话结论
> 
`,
  },
  {
    id: 'technical',
    name: '技术复盘',
    description: 'K 线形态 + 历史相似 + 信号',
    icon: 'solar:graph-up-bold',
    content: `# 技术复盘 — {标的}

## 当前形态
- 周期：
- 关键位：

## 历史相似情景
- 

## 信号 / 触发条件
- [ ] 

## 止损 / 止盈
- 止损：
- 止盈：
`,
  },
  {
    id: 'strategy',
    name: '策略立项',
    description: '量化策略假设 → 因子 → 回测计划',
    icon: 'solar:test-tube-bold',
    content: `# 策略立项 — {名称}

## 核心假设
> 

## 因子定义
- 

## 选股 / 择时规则
- 入场：
- 出场：

## 回测计划
- 时间窗口：
- 基准：
- 关键指标：

## 风险点
- 
`,
  },
];
