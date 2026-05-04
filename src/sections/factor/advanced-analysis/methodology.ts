// 因子高级分析 - 方法论 Tooltip 文案池
// 资深量化研究员视角；每段三件套：一句话 / 简化公式 / 输入输出口径

export type MethodologyEntry = {
  title: string;
  oneLiner: string;
  formula: string;
  io: string;
};

export const METHODOLOGY: Record<string, MethodologyEntry> = {
  orthogonalize: {
    title: '因子正交化',
    oneLiner:
      '把多个高度相关的因子线性变换为相互正交（相关性≈0）的新因子，识别冗余、保留独立信息。',
    formula:
      '回归正交：F̂ᵢ = Fᵢ − Σⱼ<ᵢ βⱼ·Fⱼ；对称正交：F̂ = F·(FᵀF)⁻¹ᐟ²；Gram-Schmidt 按因子顺序逐项剔除前序解释力。',
    io: '输入：≥2 个因子 + 单个交易日 + Universe；输出：正交化前后两个相关性矩阵 + 残差方差占比。',
  },
  famaMacBeth: {
    title: 'Fama-MacBeth 截面回归',
    oneLiner:
      '逐期对截面收益做多因子回归，把每期回归系数当作"风险溢价"，再对时间序列求均值与 t 统计量。',
    formula:
      'Step1 每期截面：rₜ = α + Σ βⱼ·Fⱼ,ₜ + εₜ；Step2 时序：t = mean(βⱼ) / stderr(βⱼ)（Newey-West 修正自相关）。',
    io: '输入：因子集 + 起止日期 + Universe + forwardDays（持有期）；输出：每个因子平均系数 / t / p / 显著性，可附每期 R² 与系数序列。',
  },
  optimization: {
    title: '组合优化',
    oneLiner:
      '在协方差矩阵 + 单只权重约束下，按指定目标（MVO / 最小方差 / 风险平价 / 最大分散化）求权重。',
    formula:
      'MVO: max wᵀμ − λ·wᵀΣw；MinVar: min wᵀΣw；RP: 各只 MRC 相等；MaxDiv: max (Σ wᵢσᵢ)/√(wᵀΣw)。',
    io: '输入：股票池 ≥ 2 + 模式 + 回望 + 单只上下限；输出：权重表 + 预期收益/波动/夏普 + 行业暴露 + 边际风险贡献。',
  },
  newey_west: {
    title: 'Newey-West 调整 t 值',
    oneLiner: '当时间序列存在自相关时，OLS-t 会高估显著性；NW 修正使用滞后协方差给出更稳健的 t。',
    formula: 'Var_NW(β) = γ₀ + 2·Σₗ wₗ γₗ，其中 wₗ = 1 − l/(L+1)，L 为 lag。',
    io: 'lag 一般取 forwardDays；lag = 0 时退化为 OLS。',
  },
  cov_method: {
    title: '协方差估计方式',
    oneLiner:
      '样本协方差噪声大；Ledoit-Wolf 收缩到对角阵降噪；EWMA 给近期更高权重，更敏感于波动率变化。',
    formula: 'Σ_LW = ρ·F + (1−ρ)·S；Σ_EWMA(t) = (1−λ)·xₜxₜᵀ + λ·Σ_EWMA(t−1)。',
    io: '回望天数越短越偏好 LW / EWMA；250 日以上样本协方差更稳。',
  },
};
