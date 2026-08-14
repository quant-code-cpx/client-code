关系型数据工作的核心，不是背诵 SQL 关键字，而是先把“每行代表什么、哪些关系必须成立、查询结果处于什么粒度”说清，再让数据库执行约束、组合与计算。本文示例采用 PostgreSQL 18 当前文档（核对至 2026-08-14）所述方言；基础查询尽量使用标准 SQL，`MATERIALIZED`、`NOT MATERIALIZED`、`EXPLAIN (ANALYZE, BUFFERS)` 等 PostgreSQL 特性会单独标明。全部证券与成交数据均为虚构。

统一案例由三张表组成：`security` 保存证券主数据，`trading_calendar` 保存日历，`trade_execution` 的一行代表一次已经成交的执行，而不是一张订单。最小可复现定义如下：

```sql
CREATE TABLE security (
    security_id  BIGINT PRIMARY KEY,
    ticker       VARCHAR(16) NOT NULL UNIQUE,
    currency     VARCHAR(3) NOT NULL CHECK (char_length(currency) = 3),
    listing_date DATE NOT NULL
);

CREATE TABLE trading_calendar (
    trade_date DATE PRIMARY KEY,
    is_open    BOOLEAN NOT NULL
);

CREATE TABLE trade_execution (
    trade_id     BIGINT PRIMARY KEY,
    security_id  BIGINT NOT NULL REFERENCES security (security_id),
    trade_date   DATE NOT NULL REFERENCES trading_calendar (trade_date),
    side         VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity     NUMERIC(20, 4) NOT NULL CHECK (quantity > 0),
    price        NUMERIC(20, 4) NOT NULL CHECK (price > 0),
    fee          NUMERIC(20, 2),
    executed_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
```

固定样本如下。`fee` 的空值表示“尚未取得费用”，不是费用为零。

| `security_id` | `ticker` | `currency` | `listing_date` |
| ---: | --- | --- | --- |
| 1 | AAA | CNY | 2025-12-01 |
| 2 | BBB | CNY | 2025-12-01 |

| `trade_date` | `is_open` |
| --- | --- |
| 2026-01-05 | true |
| 2026-01-06 | true |
| 2026-01-07 | false |
| 2026-01-08 | true |

| `trade_id` | 证券 | 日期 | 方向 | 数量 | 价格 | 费用 | 成交时刻（+08:00） |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 1001 | AAA | 2026-01-05 | BUY | 100 | 10.00 | 1.50 | 09:31 |
| 1002 | AAA | 2026-01-05 | SELL | 40 | 10.50 | NULL | 10:00 |
| 1003 | BBB | 2026-01-05 | BUY | 10 | 20.00 | 0.80 | 10:30 |
| 1004 | AAA | 2026-01-06 | BUY | 50 | 11.00 | 1.20 | 09:35 |
| 1005 | BBB | 2026-01-06 | SELL | 5 | 21.00 | 0.60 | 14:00 |

## 数据库 {#database}

数据库是有名称、受统一权限和事务规则管理的数据对象集合；数据库管理系统（DBMS）才是负责存储、查询、并发控制、恢复与权限执行的软件。SQL 是与 DBMS 交互的语言，也不等同于数据库本身。把 CSV 放进目录，不会自动得到主外键、事务隔离、访问控制或可恢复性。

PostgreSQL 的层级是“数据库集群 → 数据库 → 模式（schema）→ 表、视图、函数等对象”。一个连接直接连入一个数据库，再通过模式组织对象。示例三张表若位于 `research` 模式，完整名称可写作 `research.trade_execution`。模式名属于命名与权限边界，不会自动形成独立备份、独立算力或跨数据库事务边界。

研究数据库至少要同时记录：数据值、结构与约束、来源和时间戳、修订版本、权限、备份恢复方案。数据库能确保已声明的规则，却不知道“该成交是否经济上真实”“供应商字段是否定义一致”；这些仍需数据治理与业务验证。

## 表 {#table}

表用固定的列定义容纳数量可变的行。关系模型中的关系是元组集合；实际 SQL 表允许 `NULL`，没有键时也可能出现完全相同的行，查询结果通常按“多重集”语义保留重复。因此，“关系型”不等于“每张 SQL 表天然无重复”。

先写表的粒度，再写字段：

| 表 | 一行代表什么 | 本例行数 |
| --- | --- | ---: |
| `security` | 一个证券主数据对象 | 2 |
| `trading_calendar` | 一个日历日期及其是否开市 | 4 |
| `trade_execution` | 一次成交执行 | 5 |

同一订单若分三次成交，在 `trade_execution` 应有三行；把它误当“一行一订单”，成交笔数、均价和费用都会算错。表也没有天然行序：物理存放顺序、导入顺序或某次查询碰巧出现的顺序，都不是数据契约。基础表、视图、CTE 和子查询结果都可表现为行列结构，但持久性、可更新性与计算时点不同，不能只因“看起来像表”就混为一谈。

## 行 {#row}

行是一组在同一粒度下共同描述一个对象或事件的列值。本例 `trade_id = 1002` 的整行共同表达：证券 AAA 在 2026-01-05 以 10.50 成交 40 单位、费用尚未知。不能把每个单元格当成互不相关的事实，也不能把两张不同粒度表逐行对齐。

SQL 不自动给行永久编号。PostgreSQL 的 `ctid` 是行版本的物理位置，更新或整理后可变，不能当业务主键；`row_number()` 只是某次查询在指定窗口排序下计算的序号。若没有键或唯一约束，两行可以完全一样，数据库也无法知道它们是两次真实成交还是一次重复导入。

实务检查先问：

- 一行是订单、成交、日汇总，还是证券日？
- 一次业务事件能否产生多行？一行能否混入多个事件？
- 修订原记录时覆盖、追加新版本，还是建立有效期？

粒度没锁定前，行数没有稳定业务含义。

## 列 {#column}

列描述同一属性，并由名称、数据类型、默认值和约束共同定义。`quantity` 是成交数量，`price` 是每单位价格；二者相乘得到成交金额，但 `quantity * price AS gross_notional` 是查询表达式，不因取了别名就成为基础表中已存列。

列名不能替代口径文档。`price` 还需说明币种、含税与否、复权与否、报价单位；`trade_date` 需说明市场日历；`fee` 需说明覆盖哪些费用。`NULL` 是“无已知值”的标记，不能细分“未采集、不可适用、待结算、源系统缺失”，若这些原因重要，应另设状态列。

`SELECT *` 适合探索，不宜成为长期数据契约：加列、重排列或同名列会改变输出。生产查询宜显式选择和命名列，并在边界处统一单位。例如：

```sql
SELECT trade_id,
       security_id,
       quantity,
       price,
       quantity * price AS gross_notional
FROM trade_execution;
```

## 主键 {#primary-key}

主键是表内识别一行的列或列组，要求组合值唯一且每列非空。一张表至多声明一个主键，但主键可由多列组成，也可另有多个 `UNIQUE` 约束。PostgreSQL 为主键自动建立唯一 B-tree 索引。

本例用 `trade_id` 识别成交、`security_id` 识别证券、`trade_date` 识别日历行。主键值唯一不等于连续，也不承诺按主键输出、按时间递增或没有业务重复。两个不同 `trade_id` 若实际来自同一笔被重复投递的成交，主键照样通过；还需源系统成交号、来源和版本等业务唯一性设计。

代理键也不能取代自然业务判断。`ticker` 可能改名、跨市场重复或被重新使用，因此真实证券主数据通常以稳定内部 ID 为主键，并另建带市场和有效期的代码关系。本例 `ticker UNIQUE` 只是简化假设，不可直接平移到跨市场历史库。

## 外键 {#foreign-key}

外键要求引用列的非空值能在被引用表的主键、唯一约束或合格唯一索引中找到，从而维持引用完整性。`trade_execution.security_id` 防止引用不存在的证券；`trade_date` 防止引用日历表没有的日期。引用列若未声明 `NOT NULL`，空值通常可以绕开匹配要求。

外键只证明“有对应行”，不证明业务条件成立。2026-01-07 在日历表中存在但 `is_open = false`，本例外键仍不能阻止该日成交；“必须开市”需要重新设计可引用键、受控写入流程或能持续维护跨表规则的机制。PostgreSQL 的 `CHECK` 不适合引用其他表数据。

删除或更新被引用行还要明确 `NO ACTION`、`RESTRICT`、`CASCADE`、`SET NULL` 等动作。对证券主数据盲用 `CASCADE` 可能连带删除历史成交。PostgreSQL 会为被引用键提供索引，但声明外键不会自动给引用端建索引；是否建立 `trade_execution(security_id)` 要依据删除检查和查询负载决定。

## 数据类型 {#data-types}

数据类型同时约束可存值、运算语义、精度、排序和存储。类型选择不是“能塞进去即可”：

- `BIGINT` 适合整数 ID，但范围、生成方式和跨系统映射仍需设计。
- `NUMERIC(20, 4)` 是精确十进制定点口径，精度 20 指总有效位数，标度 4 指小数位；超出标度会按 PostgreSQL 规则舍入，整数位超限会报错。金额与数量常需要精确十进制；`REAL`、`DOUBLE PRECISION` 是二进制近似数，不宜直接依赖精确相等。
- `DATE` 表示日历日，`TIMESTAMP WITH TIME ZONE` 表示时间线上的时点并按会话时区显示。市场交易日不能仅从 UTC 日期截取，故本例同时保存权威 `trade_date`。
- `VARCHAR` 保存代码不代表代码格式正确，所以还需长度、枚举、正则或参考表约束。
- 未写 `NOT NULL` 的列默认可空。`BOOLEAN` 因可空也可能出现 true、false、unknown 三种状态。

必须把单位放进数据契约：`quantity = 100` 究竟是股、手、张还是合约；`price = 10` 是元/股还是指数点。类型能防止把文字写入数值列，却无法发现“把分当成元”。跨数据库移植时还要核对类型名、范围、舍入、时区和隐式转换，不能把 PostgreSQL 扩展当通用 SQL。

## 查询 {#query}

查询从一个或多个关系输入构造新的结果关系。最常用的 `SELECT` 可选择列、计算表达式、连接、过滤、分组、开窗和排序；除非使用写入语句，查询结果本身不会把计算列永久保存回基础表。

下面查询把五笔成交压成“日期 × 证券”四行：

```sql
SELECT t.trade_date,
       s.ticker,
       COUNT(*) AS trade_count,
       SUM(t.quantity * t.price) AS gross_notional,
       SUM(CASE WHEN t.side = 'BUY'
                THEN t.quantity * t.price
                ELSE -t.quantity * t.price
           END) AS net_notional
FROM trade_execution AS t
JOIN security AS s
  ON s.security_id = t.security_id
WHERE t.trade_date BETWEEN DATE '2026-01-05' AND DATE '2026-01-06'
GROUP BY t.trade_date, s.security_id, s.ticker
HAVING COUNT(*) >= 1
ORDER BY t.trade_date, s.ticker;
```

可复算结果为：AAA 在 1 月 5 日有 2 笔、总额 1,420、方向净额 580；BBB 为 1 笔、200、200；1 月 6 日 AAA 为 1 笔、550、550，BBB 为 1 笔、105、−105。

理解 SQL 要区分逻辑处理与物理执行。便于推理的逻辑顺序大致是 `WITH → FROM/JOIN → WHERE → GROUP BY/聚合 → HAVING → 窗口计算 → SELECT/DISTINCT → ORDER BY → LIMIT`；优化器可在保持语义的前提下改写物理顺序。不能因 SQL 文本先写 `SELECT`，就认为表达式先于 `WHERE` 计算，也不能从语法顺序猜性能。

## 筛选 {#filtering}

`WHERE` 在分组前逐行筛选；条件只有求值为 true 的行会保留，false 与 unknown（SQL 中以 `NULL` 表示）都会被剔除。因而：

```sql
WHERE fee = 0       -- 不会选中 fee 为 NULL 的行
WHERE fee IS NULL   -- 选中“费用未知”
```

`NULL = NULL` 的结果是 unknown，不是 true；判断空值用 `IS NULL`，需要把两个空值视作“不相异”时可明确使用 `IS NOT DISTINCT FROM`。不要随意用 `COALESCE(fee, 0)` 掩盖缺失，除非业务定义确实规定缺失等于零。

`HAVING` 在分组和聚合后筛选组，例如 `HAVING SUM(quantity * price) >= 500`；把相同条件放进 `WHERE` 通常含义不同，因为单行金额与组总额不是同一粒度。外连接也需留意条件位置：

```sql
FROM trading_calendar AS c
LEFT JOIN trade_execution AS t
  ON t.trade_date = c.trade_date
 AND t.security_id = 1
WHERE c.is_open
```

若把 `t.security_id = 1` 移到 `WHERE`，没有成交的开市日会因右表值为 `NULL` 被删除，结果在效果上不再保留全部左表日期。另一个常见陷阱是 `NOT IN`：只要候选集合含 `NULL` 且没有相等项，结果可能是 unknown；反连接通常应按所需空值语义写成 `NOT EXISTS`。

## 排序 {#ordering}

只有最外层显式 `ORDER BY` 才保证最终结果顺序。表的物理顺序、索引顺序、子查询中的排序、窗口函数的排序或上一次相同查询的显示顺序，都不能替代输出契约。

稳定的成交时间序列应补足并列项：

```sql
SELECT trade_id, executed_at, price, quantity
FROM trade_execution
ORDER BY executed_at ASC, trade_id ASC;
```

只按 `trade_date` 排序时，同日多笔之间的顺序未定义；`LIMIT 1` 可能因此返回不同成交。排序还受数据类型、排序规则和空值位置影响。PostgreSQL 默认升序把 `NULL` 放最后、降序放最前，但可移植查询应显式写 `NULLS FIRST` 或 `NULLS LAST`。文本代码的排序规则可能不是业务需要的市场代码顺序。

`ORDER BY` 有成本，索引有时可帮助，优化器也可能选择排序。无论计划是否使用索引，最终语义只由查询中的排序项决定；若排序键不唯一，结果仍可能在并列组内变化。

## 聚合 {#aggregation}

聚合把一组输入值压成一个结果。对固定样本：

```sql
SELECT COUNT(*)                    AS rows_all,
       COUNT(fee)                  AS rows_with_fee,
       SUM(fee)                    AS known_fee_sum,
       AVG(fee)                    AS known_fee_avg,
       SUM(quantity * price)       AS gross_notional,
       COUNT(DISTINCT security_id) AS securities
FROM trade_execution;
```

结果分别为 5、4、4.10、1.025、2,275 和 2。`COUNT(*)` 数行；`COUNT(fee)` 只数非空费用；`SUM`、`AVG`、`MIN`、`MAX` 等常见聚合忽略空输入值。除 `COUNT` 外，PostgreSQL 聚合在没有输入行时通常返回 `NULL`，所以“零笔成交的成交额”若业务上定义为 0，可在最终展示处用 `COALESCE(SUM(...), 0)`，但要保留“无行”与“有行且数值为零”的区别。

把未知费用先替成零会改变问题：`AVG(fee)` 是已知四笔的平均 1.025；`AVG(COALESCE(fee, 0))` 是五笔平均 0.82。两者都可计算，但含义不同。方向净额需显式编码符号；总成交额则不应带买卖正负。某些聚合（如字符串或数组拼接）依赖输入次序，必须在聚合调用内明确排序，不能依赖上游偶然顺序。

## 分组 {#grouping}

`GROUP BY` 定义输出粒度：分组键相同的输入行组成一组，每组通常输出一行。前述查询以 `(trade_date, security_id, ticker)` 为键，所以粒度是“证券日”；只按日期分组会变成“全市场日”，AAA 与 BBB 的差异被合并。

样本的证券日结果可复算为：

| 日期 | 证券 | 笔数 | 总成交额 | 方向净额 |
| --- | --- | ---: | ---: | ---: |
| 2026-01-05 | AAA | 2 | 1,420 | 580 |
| 2026-01-05 | BBB | 1 | 200 | 200 |
| 2026-01-06 | AAA | 1 | 550 | 550 |
| 2026-01-06 | BBB | 1 | 105 | −105 |

校验分组查询可用三步：先写预期粒度和候选键；再核对输入行数、输出组数与每组行数；最后抽样回算。所有非聚合输出都应由分组键决定，不能随手从组内挑一个值。PostgreSQL 在能证明函数依赖时允许部分简写，但显式列齐粒度更利于审阅和跨数据库移植。

分组会丢失组内明细，不能在汇总结果上恢复原成交顺序。先连接再分组还可能因一对多关系放大输入；需要时先把每侧聚合到可连接键，再连接汇总结果。

## 连接 {#joins}

连接按条件组合两侧行。`INNER JOIN` 只保留匹配；`LEFT JOIN` 保留左侧全部行，并给未匹配右侧列补 `NULL`；`CROSS JOIN` 形成笛卡尔积。连接不是“替每行查一个值”：右侧若有多个匹配，左侧行会重复。

日历补零可先构造“3 个开市日 × 2 个证券 = 6 行”骨架，再左连 4 行证券日汇总：

```sql
WITH daily AS (
    SELECT trade_date,
           security_id,
           COUNT(*) AS trade_count,
           SUM(quantity * price) AS gross_notional
    FROM trade_execution
    GROUP BY trade_date, security_id
)
SELECT c.trade_date,
       s.ticker,
       COALESCE(d.trade_count, 0) AS trade_count,
       COALESCE(d.gross_notional, 0) AS gross_notional
FROM trading_calendar AS c
CROSS JOIN security AS s
LEFT JOIN daily AS d
  ON d.trade_date = c.trade_date
 AND d.security_id = s.security_id
WHERE c.is_open
ORDER BY c.trade_date, s.ticker;
```

1 月 8 日两只证券各得到一行零成交；1 月 7 日因休市不进入骨架。这里将 `NULL` 改成 0 有明确理由：骨架已证明该“证券日”存在，且没有匹配成交行。

连接膨胀可直接复算。把成交表按 `security_id` 自连接，AAA 有 3 行会产生 3 × 3 = 9 对，BBB 有 2 行会产生 2 × 2 = 4 对，总计 13 行，不是原来的 5 行。若目的是两两配对，这没问题；若再求成交额就会重复计数。每次连接前应写出两侧键的唯一性与预期基数，连接后核对行数和金额控制总额。`DISTINCT` 只能掩掉相同结果行，不能修复错误连接逻辑。

## 子查询 {#subqueries}

子查询是在另一条语句内部产生行列结果的查询。非相关子查询不引用外层列，例如找出价格高于全样本平均价格的成交：

```sql
SELECT trade_id, price
FROM trade_execution
WHERE price > (SELECT AVG(price) FROM trade_execution);
```

括号内是标量子查询：必须返回一列，超过一行会报错，零行则产生 `NULL`。相关子查询引用外层当前行，例如找出 1 月 6 日有成交的证券：

```sql
SELECT s.security_id, s.ticker
FROM security AS s
WHERE EXISTS (
    SELECT 1
    FROM trade_execution AS t
    WHERE t.security_id = s.security_id
      AND t.trade_date = DATE '2026-01-06'
);
```

`EXISTS` 只关心至少有一行，不会因同一证券有多笔成交而复制外层证券行。逻辑上可把相关子查询理解为依赖外层行，但优化器可能把它改写成连接、半连接或其他计划，不能据语法断言一定“逐行跑一次”。选择连接还是子查询，应先按所需基数和空值语义表达正确，再看实际计划。

`IN` 与 `NOT IN` 遵守三值逻辑；候选中有 `NULL` 时尤其要审计。`EXISTS`、标量子查询和连接并非总能机械互换，重复、空值和多行结果会改变语义。

## 公共表表达式 {#common-table-expressions}

公共表表达式（CTE）用 `WITH` 给当前语句内的子结果命名，便于把“清洗 → 汇总 → 最终展示”拆成可审阅步骤。它不是会话临时表，也不会因命名就持久保存：

```sql
WITH daily AS (
    SELECT trade_date,
           security_id,
           SUM(CASE WHEN side = 'BUY'
                    THEN quantity * price
                    ELSE -quantity * price
               END) AS net_notional
    FROM trade_execution
    GROUP BY trade_date, security_id
)
SELECT *
FROM daily
WHERE ABS(net_notional) >= 100
ORDER BY trade_date, security_id;
```

普通 CTE 也不必然物化。在 PostgreSQL 18 中，非递归、无副作用、只引用一次的 CTE 默认可能折叠进父查询；多次引用通常会单独计算。PostgreSQL 专有的 `MATERIALIZED` 可强制分开计算，`NOT MATERIALIZED` 可允许合并优化，但可能重复工作。它们是性能与执行语义选择，不改变应先验证的结果逻辑，也不能泛化为所有数据库规则。

递归 CTE 由初始项和递归项迭代生成结果，适合层级或图遍历；必须定义终止条件、去重和循环处理。写 CTE 的主要收益是表达边界与可复核性，不是天然更快。数据修改型 CTE 还有执行一次、快照与副作用规则，不能用只读 CTE 的直觉推断。

## 窗口函数 {#window-functions}

窗口函数在相关行集合上计算，但保留每个输入行，不像普通聚合那样把一组压成一行。先得到 4 行证券日净额，再计算各证券累计净额：

```sql
WITH daily AS (
    SELECT trade_date,
           security_id,
           SUM(CASE WHEN side = 'BUY'
                    THEN quantity * price
                    ELSE -quantity * price
               END) AS net_notional
    FROM trade_execution
    GROUP BY trade_date, security_id
)
SELECT trade_date,
       security_id,
       net_notional,
       SUM(net_notional) OVER (
           PARTITION BY security_id
           ORDER BY trade_date
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS cumulative_net_notional
FROM daily
ORDER BY security_id, trade_date;
```

AAA 两日累计为 580、1,130；BBB 为 200、95。`PARTITION BY` 划分证券，窗口内 `ORDER BY` 定义计算次序，显式 `ROWS` 窗口帧定义从首行到当前物理行。若省略帧，PostgreSQL 带窗口排序时默认 `RANGE` 语义会把当前排序键的同值行（peers）一起纳入，重复日期时可能与逐行累计不同。

窗口函数在 `WHERE`、分组、聚合和 `HAVING` 后逻辑执行，不能在同一查询层的 `WHERE` 直接引用窗口别名；应外包一层子查询或 CTE 后再筛选。窗口内排序只影响计算，不保证最终显示顺序，仍需最外层 `ORDER BY`。`row_number()`、`rank()`、滚动均值也都依赖明确的分区、排序、并列项和窗口帧；“没有减少行数”不代表没有改变粒度，因为前置分组可能已经减少了行。

## 索引 {#indexes}

索引是数据库维护的辅助访问结构，可减少特定等值、范围、连接或排序查询需检查的数据。针对常见的“某证券一段日期”查询，可考虑：

```sql
CREATE INDEX trade_execution_security_date_idx
    ON trade_execution (security_id, trade_date);
```

对 PostgreSQL B-tree，多列索引通常在前导列有约束时最有效；因此它适合 `security_id = ? AND trade_date BETWEEN ? AND ?`，不保证只按日期查询也高效。PostgreSQL 18 可能在特定分布下采用 skip scan，但是否使用取决于统计、选择性、表大小、缓存和成本参数。

索引不是免费的：每次插入、删除和相关列更新都要维护索引，增加存储、写入、WAL、缓存与清理负担；低选择性字段的单列索引可能收益很小。主键会自动生成唯一 B-tree 索引，外键引用端不会自动生成。表达式索引、部分索引和其他索引类型是 PostgreSQL 能力，需与真实谓词完全匹配并记录方言依赖。

存在索引不代表优化器必用；小表全表扫描常更便宜。索引也不保证查询输出顺序，仍须写 `ORDER BY`。索引设计应从高频、重要查询及写入成本出发，用实际计划验证，而不是给每列都加索引。

## 事务 {#transactions}

事务把多条语句作为一个工作单元提交或回滚。本例若新增一个日历日和当天成交，两步应同成同败：

```sql
BEGIN;

INSERT INTO trading_calendar (trade_date, is_open)
VALUES (DATE '2026-01-09', true);

INSERT INTO trade_execution (
    trade_id, security_id, trade_date, side,
    quantity, price, fee, executed_at
)
VALUES (
    1006, 1, DATE '2026-01-09', 'BUY',
    20, 11.20, 0.50,
    TIMESTAMP WITH TIME ZONE '2026-01-09 09:32:00+08'
);

COMMIT;
-- 任一步失败或决定取消时，应 ROLLBACK。
```

ACID 可作四个检查面：原子性保证事务效果全有或全无；一致性要求提交后仍满足数据库约束与事务逻辑所维护的不变量，但系统只能执行已经正确声明的部分；隔离性限制并发事务相互观察的异常；持久性表示成功提交按系统配置和故障模型持久记录。它们不保证来源真实、业务规则完整，也不自动回滚数据库外已发送的消息或不可事务化副作用。

PostgreSQL 默认隔离级别是 `READ COMMITTED`，每条语句取得自己的已提交数据快照，同一事务中两次查询可能看到不同已提交状态；请求 `READ UNCOMMITTED` 在 PostgreSQL 中仍按 `READ COMMITTED` 运行。`REPEATABLE READ` 提供事务级稳定快照，但仍可能出现序列化异常；`SERIALIZABLE` 只让成功提交的并发结果等价于某种串行顺序，并可能主动中止事务。应用必须能从头重试整个失败事务，不能只重跑最后一条语句。隔离级别、锁和约束要按不变量选择，不能把“用了事务”理解成并发一定正确。

## 查询计划 {#query-plans}

查询计划是优化器选择的物理执行树，包括扫描、连接、聚合、排序等节点。PostgreSQL 的普通 `EXPLAIN` 展示计划及估计：`cost` 是基于成本参数的任意单位，不是毫秒；`rows` 是预计由节点输出的行数；`width` 是预计平均行宽。它不执行查询，也不给实际耗时：

```sql
EXPLAIN
SELECT *
FROM trade_execution
WHERE security_id = 1
  AND trade_date BETWEEN DATE '2026-01-05' AND DATE '2026-01-06';
```

`EXPLAIN (ANALYZE, BUFFERS)` 会真正执行语句，补充实际时间、行数、循环和缓冲信息。对 `INSERT`、`UPDATE`、`DELETE`、`MERGE` 等写语句，它会真的产生副作用；即使放进事务后回滚，序列、外部函数等也未必按预期撤销，所以只能在受控环境使用。

判断计划先比较每个节点的估计行数与实际行数，再看循环次数、过滤掉的行、连接算法、排序/哈希是否溢出以及缓冲读写。若估计 1 行、实际 1,000 行，数量级误差可能让优化器选错连接方式；根因常是统计陈旧、数据倾斜、列间相关、表达式或参数选择性，而不只是“缺索引”。`ANALYZE` 更新统计，但统计仍是抽样与模型估计。

计划会随数据分布、参数、统计、配置和 PostgreSQL 版本变化；本页五行样本的计划没有生产性能代表性。`EXPLAIN ANALYZE` 显示实际执行，不证明 SQL 业务逻辑正确；先核对行粒度、连接基数和控制总额，再优化成本，才能避免把一个快速的错误查询投入生产。
