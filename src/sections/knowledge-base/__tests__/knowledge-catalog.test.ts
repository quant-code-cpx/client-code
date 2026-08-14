import { knowledgeMajors } from '../content/knowledge-catalog';
import { parseKnowledgeArticle } from '../parse-knowledge-article';

describe('知识库目录与专业校对门禁', () => {
  it('大专题和小专题 slug、编号、顺序保持唯一', () => {
    const majorSlugs = knowledgeMajors.map((major) => major.slug);
    const majorCodes = knowledgeMajors.map((major) => major.code);
    const topics = knowledgeMajors.flatMap((major) => major.topics);

    expect(knowledgeMajors).toHaveLength(36);
    expect(topics).toHaveLength(434);
    expect(topics.reduce((total, topic) => total + topic.knowledgePointIds.length, 0)).toBe(6078);
    expect(new Set(majorSlugs).size).toBe(majorSlugs.length);
    expect(new Set(majorCodes).size).toBe(majorCodes.length);

    knowledgeMajors.forEach((major) => {
      const topicSlugs = major.topics.map((topic) => topic.slug);
      const topicCodes = major.topics.map((topic) => topic.code);

      expect(new Set(topicSlugs).size, major.code).toBe(topicSlugs.length);
      expect(new Set(topicCodes).size, major.code).toBe(topicCodes.length);
      expect(major.topics, major.code).toHaveLength(major.plannedTopicCount);
      expect(
        major.topics.map((topic) => topic.order),
        major.code
      ).toEqual(major.topics.map((_, index) => index + 1));
    });
  });

  it('434 个已发布小专题均可加载且正文知识点与目录一致', async () => {
    const topics = knowledgeMajors.flatMap((major) => major.topics);
    const loadedArticles = await Promise.all(
      topics.map(async (topic) => ({
        topic,
        article: parseKnowledgeArticle(await topic.loadContent()),
      }))
    );

    const mismatches = loadedArticles.flatMap(({ topic, article }) => {
      const articlePointIds = article.points.map((point) => point.id);

      return JSON.stringify(articlePointIds) === JSON.stringify(topic.knowledgePointIds)
        ? []
        : [
            `${topic.code}: 正文=${articlePointIds.join(',')}；目录=${topic.knowledgePointIds.join(',')}`,
          ];
    });

    expect(mismatches).toEqual([]);
  });

  it('01.1 正文完整覆盖规划知识点，顺序与注册表一致', async () => {
    const topic = knowledgeMajors[0].topics[0];
    const article = parseKnowledgeArticle(await topic.loadContent());

    expect(article.points.map((point) => point.id)).toEqual(topic.knowledgePointIds);
    expect(article.points.map((point) => point.title)).toEqual([
      '稀缺',
      '选择',
      '机会成本',
      '货币',
      '收入',
      '支出',
      '储蓄',
      '资产',
      '负债',
      '净资产',
      '现金流',
      '财富存量与收入流量',
    ]);
  });

  it('01.1 明确区分收入、借款、现金流、资产转换和净资产', async () => {
    const content = await knowledgeMajors[0].topics[0].loadContent();

    expect(content).toContain('借款会增加现金，同时增加负债；它是现金流入，不是收入');
    expect(content).toContain('买入股票不是“又花掉一次储蓄”');
    expect(content).toContain('现金净流入为正不一定代表变富');
    expect(content).toContain('净资产}=\\text{资产总额}-\\text{负债总额}');
    expect(content).toContain('财富是**某一时点**持有的净经济资源，属于存量');
  });

  it('01.2 正文完整覆盖规划知识点，顺序与注册表一致', async () => {
    const topic = knowledgeMajors[0].topics[1];
    const article = parseKnowledgeArticle(await topic.loadContent());

    expect(topic.code).toBe('01.2');
    expect(article.points.map((point) => point.id)).toEqual(topic.knowledgePointIds);
    expect(article.points.map((point) => point.title)).toEqual([
      '流动资产',
      '投资资产',
      '自用资产',
      '短期负债',
      '长期负债',
      '净资产',
      '收入稳定性',
      '固定支出',
      '可变支出',
      '偿债率',
      '储蓄率',
      '家庭财务脆弱性',
    ]);
  });

  it('01.2 不把信用额度、单一比率或经验阈值冒充家庭财务结论', async () => {
    const content = await knowledgeMajors[0].topics[1].loadContent();

    expect(content).toContain('信用卡总额度不是负债，已经使用且尚未偿还的金额才是负债');
    expect(content).toContain('主表应把它只放在一个主分类中，再用标签记录流动性和风险');
    expect(content).toContain('不同贷款产品、机构和法域采用的限额并不相同');
    expect(content).toContain('储蓄不是银行存款余额');
    expect(content).toContain('高净资产但缺少流动资产的家庭可能脆弱');
    expect(content).toContain('“三个月”只是特定统计指标或情景假设');
    expect(content).toContain('当可支配收入为零或负数时，储蓄率会失去通常的比较意义');
  });

  it('01.3 正文完整覆盖规划知识点，顺序与注册表一致', async () => {
    const topic = knowledgeMajors[0].topics[2];
    const article = parseKnowledgeArticle(await topic.loadContent());

    expect(topic.code).toBe('01.3');
    expect(article.points.map((point) => point.id)).toEqual(topic.knowledgePointIds);
    expect(article.points.map((point) => point.title)).toEqual([
      '延迟消费',
      '储蓄目标',
      '资本形成',
      '生产性投资',
      '金融投资',
      '投机',
      '赌博',
      '正和与零和',
      '正期望与负期望',
      '可验证优势',
      '不可验证下注',
    ]);
  });

  it('01.3 不用产品名称、一次盈亏或未经验证的概率冒充行为性质和优势', async () => {
    const content = await knowledgeMajors[0].topics[2].loadContent();

    expect(content).toContain('在二级市场买入股票通常是既有金融资产所有权的转移');
    expect(content).toContain('投机不因最终亏损就自动变成赌博');
    expect(content).toContain('具体什么构成法律意义上的博彩、投注或游戏，因法域');
    expect(content).toContain('零和要先写清参与者边界、时间范围和是否扣除成本');
    expect(content).toContain('正期望不保证单次或短期盈利');
    expect(content).toContain('未知概率不是正期望');
    expect(content).toContain('回测结果是证据，不是优势已经存在且会延续的证明');
  });

  it('01.4 正文完整覆盖规划知识点，顺序与注册表一致', async () => {
    const topic = knowledgeMajors[0].topics[3];
    const article = parseKnowledgeArticle(await topic.loadContent());

    expect(topic.code).toBe('01.4');
    expect(article.points.map((point) => point.id)).toEqual(topic.knowledgePointIds);
    expect(article.points.map((point) => point.title)).toEqual([
      '应急资金',
      '刚性支出',
      '短期目标资金',
      '长期投资资金',
      '风险资本',
      '投资期限',
      '流动性需求',
      '收入中断',
      '保险保障',
      '不可承受损失',
      '不借生活费交易',
    ]);
  });

  it('01.4 不把统一月数、信用额度、长期标签或借款冒充安全资金', async () => {
    const content = await knowledgeMajors[0].topics[3].loadContent();

    expect(content).toContain('这是一项经验目标，不是所有家庭的统一安全线');
    expect(content).toContain('信用卡额度和未获批贷款不是应急资金');
    expect(content).toContain('这个例示不能解释为“五年以上就不会亏”');
    expect(content).toContain('长期投资资金不等于风险资本');
    expect(content).toContain('结果为零或负数，表示当前没有可用于高风险交易的风险资本');
    expect(content).toContain('保险与应急资金互补而非替代');
    expect(content).toContain('借来的本金也不是风险资本，因为全损后债务不会消失');
  });

  it('01.5 正文完整覆盖规划知识点，顺序与注册表一致', async () => {
    const topic = knowledgeMajors[0].topics[4];
    const article = parseKnowledgeArticle(await topic.loadContent());

    expect(topic.code).toBe('01.5');
    expect(article.points.map((point) => point.id)).toEqual(topic.knowledgePointIds);
    expect(article.points.map((point) => point.title)).toEqual([
      '消费债务',
      '住房贷款',
      '经营债务',
      '本金',
      '利率',
      '期限',
      '等额本息',
      '等额本金',
      '提前还款',
      '逾期',
      '信用记录',
      '债务服务比率',
      '债务滚动',
      '杠杆',
      '债务重组',
      '破产边界',
    ]);
  });

  it('01.5 不把授信、还款方式、特殊征信政策或地方破产制度泛化', async () => {
    const content = await knowledgeMajors[0].topics[4].loadContent();

    expect(content).toContain('信用卡授信额度不是债务，已经使用且尚未清偿的余额才形成债务');
    expect(content).toContain('等额本息不是“先还利息、后还本金”');
    expect(content).toContain('只有在本金、周期利率、期限和其他合同条件相同的情况下');
    expect(content).toContain('“除当事人另有约定”意味着必须继续查合同');
    expect(content).toContain('信用报告只作客观记录，不是征信中心给出的信用好坏结论');
    expect(content).toContain('个人不良信息自不良行为或事件终止之日起保存五年');
    expect(content).toContain('2020 年 1 月 1 日至 2025 年 12 月 31 日期间');
    expect(content).toContain('单笔金额不超过 1 万元');
    expect(content).toContain('2026 年 3 月 31 日前足额偿还');
    expect(content).toContain('结清截止日已经过去');
    expect(content).toContain('不存在适用于所有家庭、产品和法域的单一“安全债务服务比率”');
    expect(content).toContain('债务重组不是债务已经消失');
    expect(content).toContain('《中华人民共和国企业破产法》第二条');
    expect(content).toContain('自 2021 年 3 月 1 日施行的经济特区个人破产条例');
    expect(content).toContain('自然人不能据此推断在全国任何地方都能申请同一程序或获得免责');
  });

  it('每个已发布小专题均带校对日期和多源权威依据', () => {
    knowledgeMajors
      .flatMap((major) => major.topics)
      .forEach((topic) => {
        expect(topic.review.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(topic.review.sources.length, topic.code).toBeGreaterThanOrEqual(3);
        topic.review.sources.forEach((source) => {
          expect(source.url, source.title).toMatch(/^https:\/\//);
          expect(source.publisher.trim(), source.title).not.toBe('');
          expect(source.coverage.trim(), source.title).not.toBe('');
        });
      });
  });

  it('01.1 的来源覆盖中国统计口径、国际核算、中央银行和经济教育', () => {
    const publishers = new Set(
      knowledgeMajors[0].topics[0].review.sources.map((source) => source.publisher)
    );

    expect(publishers).toEqual(
      new Set(['国家统计局', 'OECD', 'European Central Bank', 'Federal Reserve Education'])
    );
  });

  it('01.2 的来源覆盖中国统计、家庭财富、消费者保护、收入波动和脆弱性框架', () => {
    const publishers = new Set(
      knowledgeMajors[0].topics[1].review.sources.map((source) => source.publisher)
    );

    expect(publishers).toEqual(
      new Set([
        '国家统计局',
        'OECD',
        'Consumer Financial Protection Bureau',
        'Federal Reserve Board',
        'International Monetary Fund',
      ])
    );
  });

  it('01.3 的来源覆盖储蓄、资本形成、投机、赌博、期望值、零和边界与回测', () => {
    const publishers = new Set(
      knowledgeMajors[0].topics[2].review.sources.map((source) => source.publisher)
    );

    expect(publishers).toEqual(
      new Set([
        'OECD',
        '国家统计局',
        'U.S. Securities and Exchange Commission',
        'Commodity Futures Trading Commission',
        'Gambling Commission',
        'OpenStax',
        'Stanford University',
      ])
    );
  });

  it('01.4 的来源覆盖应急储备、期限流动性、收入中断、保险、风险资本和配资边界', () => {
    const publishers = new Set(
      knowledgeMajors[0].topics[3].review.sources.map((source) => source.publisher)
    );

    expect(publishers).toEqual(
      new Set([
        'Consumer Financial Protection Bureau',
        'Financial Industry Regulatory Authority',
        'Commodity Futures Trading Commission',
        'U.S. Securities and Exchange Commission',
        'Federal Reserve Board',
        'National Association of Insurance Commissioners',
        '中国证券监督管理委员会',
      ])
    );
  });

  it('01.5 的来源覆盖贷款成本、合同、征信、债务管理、杠杆和破产边界', () => {
    const publishers = new Set(
      knowledgeMajors[0].topics[4].review.sources.map((source) => source.publisher)
    );

    expect(publishers).toEqual(
      new Set([
        '中国人民银行',
        '最高人民法院',
        '中国人民银行征信中心',
        '国家市场监督管理总局',
        'Consumer Financial Protection Bureau',
        'U.S. Small Business Administration',
        'International Monetary Fund',
        'Financial Industry Regulatory Authority',
        '全国人民代表大会',
        '深圳市司法局',
      ])
    );
  });
});
