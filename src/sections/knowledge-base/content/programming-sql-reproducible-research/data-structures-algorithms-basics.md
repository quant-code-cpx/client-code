数据结构决定数据怎样组织，算法决定怎样变换和查询；选择时要同时考虑语义、顺序、重复、更新方式和资源成本。本页按截至 2026-08-14 的 [Python 3.14.6 官方文档](https://docs.python.org/3.14/)讲解，不引入第三方库。语言保证与某个解释器的实现性能不是一回事，未来版本也应重新核对文档。

统一案例是一份完全虚构的成交明细。每条记录依次为“成交 ID、时间、证券、方向、数量、价格（分）、状态”：

    trades = [
        ("t1", "09:30", "A", "BUY",  100, 1000, "FILLED"),
        ("t2", "09:31", "B", "BUY",   10, 2000, "FILLED"),
        ("t3", "09:32", "A", "SELL",  40, 1050, "FILLED"),
        ("t4", "09:33", "A", "BUY",    0, 1080, "FILLED"),
        ("t2", "09:31", "B", "BUY",   10, 2000, "FILLED"),
        ("t5", "09:34", "B", "SELL",   3, 1950, "CANCELLED"),
        ("t6", "09:35", "A", "BUY",   50, 1100, "FILLED"),
    ]

约定同一 ID 首次出现优先，再保留状态为 FILLED 且数量、价格均大于零的记录。因此有效顺序是 t1、t2、t3、t6；名义金额（分）分别为 100,000、20,000、42,000、55,000。按方向计算净额，A 为

\[
100{,}000-42{,}000+55{,}000=113{,}000\text{ 分}=1{,}130\text{ 元},
\]

B 为 20,000 分＝200 元。数据、规则和金额都只为教学服务。

## 列表 {#list}

Python 的 list 是**有顺序、可变**的序列，允许重复，也能装入不同类型的对象；[官方内置类型文档](https://docs.python.org/3.14/library/stdtypes.html#lists)将其定义为可变序列。案例中的 trades 是列表，物理行顺序和重复的第 5 行都被保留：

    len(trades)       # 7
    trades[0][0]      # "t1"
    trades[-1][0]     # "t6"

append 在末尾加入记录，pop 默认从末尾移除；切片通常产生一个新列表，但只是浅层复制，嵌套的可变对象仍可能共享。list.sort 会原地改变列表并返回 None，sorted 则另建一个列表。

列表适合需要位置、顺序、重复和更新的记录流，却不适合把“是否存在某 ID”反复做成全表扫描。遍历列表时同时插入或删除元素还可能跳过或重复访问，因为迭代位置继续前进；稳妥做法是建立新列表或先冻结要修改的索引。

“有顺序”只表示序列位置明确，不表示已经按时间或证券排序。本例恰好按时间排列是输入事实，不能从 list 类型推导出来。

## 元组 {#tuple}

tuple 是有顺序、**不可变**的序列。本例每条成交用七元素元组表示，固定位置可作为轻量记录：

    first = trades[0]
    first[0]           # "t1"
    first[4]           # 100
    key = (first[2], first[1])   # ("A", "09:30")

元组不可替换、增加或删除其元素，适合表达字段集合或复合键；但不可变是浅层的：元组若包含列表，内部列表仍可修改。元组能否作为 dict 键或 set 元素，还取决于每个组成元素是否都可哈希。

元组不是“只读列表”的完整同义词。字段位置越多，r[5] 之类索引越难审计；真实研究可用带字段名的类、dataclass 或标准库 namedtuple 提高可读性。本页坚持普通元组，是为了把数据结构本身讲清，而不是推荐七个位置索引作为长期接口。

只因为元组不可变，也不能断言数据就可信：t2 的重复元组仍是重复经济记录，业务唯一性需要另行定义。

## 字典 {#dictionary}

dict 把唯一、可哈希的键映射到值，是 Python 的标准可变映射类型。可按 ID 建立索引：

    by_id = {}
    for row in trades:
        trade_id = row[0]
        if trade_id not in by_id:
            by_id[trade_id] = row

结果有 6 个键；t2 首次出现被保留。若改成

    by_id = {row[0]: row for row in trades}

相同键会被后值覆盖，语义变成“最后出现优先”。本例两条 t2 完全相同，所以金额暂时不变；遇到更正记录时两种政策会产生不同答案。

当前 Python 保证字典按插入顺序迭代，但更新已有键不改变位置，删除后重新插入会排到末尾；[官方文档](https://docs.python.org/3.14/library/stdtypes.html#mapping-types-dict)明确记录了这一保证。插入顺序不等于按键排序，也不应代替研究输出的显式排序。

字典查找在正常散列假设下通常是期望常数时间，构建索引却要时间和内存；散列碰撞或恶意键会破坏简单的“永远 O(1)”说法。访问不存在键时，方括号会抛出 KeyError；get 可给默认值，但把缺失默认为 0 可能掩盖数据问题。

## 集合 {#set}

set 是由不同、可哈希对象组成的**无序**集合，适合成员判断、集合运算和发现重复。[Python 官方文档](https://docs.python.org/3.14/library/stdtypes.html#set-types-set-frozenset)明确说明 set 不记录元素位置或插入顺序。

本例可用集合记录已经见过的 ID：

    seen = set()
    duplicate_ids = set()
    for row in trades:
        if row[0] in seen:
            duplicate_ids.add(row[0])
        else:
            seen.add(row[0])

最终 seen 含 6 个 ID，duplicate_ids 为 {"t2"}。空集合必须写成 set()；空花括号 {} 创建的是字典。

直接做 set(trades) 是按**完整元组相等**去重，而需求是按成交 ID 去重；两条 ID 相同但其他字段不同的冲突记录不会被合并。即使 set(ids) 得到唯一 ID，也不保证输出顺序，因此不能用它恢复“首次出现优先”的记录表。需要同时保存先后时，通常用 seen 集合负责快速判断、用列表负责输出顺序。

frozenset 是不可变且可哈希的集合，可用作字典键；普通 set 可变，不能作为字典键或另一个集合的元素。

## 数组 {#array}

“数组”在不同工具里含义不同，不能把它与 Python list 自动画等号。标准库 [array 模块](https://docs.python.org/3.14/library/array.html)提供同一机器基础类型的紧凑可变序列，并支持缓冲区接口；list 则保存 Python 对象的引用，可混放对象。

本例把四笔名义金额存为元素宽度至少 64 位的有符号整数数组：

    from array import array

    notional_cent = array("q", [100000, 20000, 42000, 55000])
    notional_cent.itemsize     # 实际元素字节数，应在环境中读取
    notional_cent[0]           # 100000

类型码 q 对应有符号 long long，官方表给出的最小元素尺寸为 8 字节；具体二进制交换还涉及平台、字节序和类型码，持久化时必须记录。数组限制元素类型，能比装箱对象更紧凑，但它本身不提供第三方数值库那样的全部向量化运算：

    notional_cent * 2

上式是把序列重复两遍，不是逐元素乘以 2。要计算每笔两倍金额，仍需显式迭代生成新数组。连续、同类型和紧凑也不保证业务单位正确；把“分”误当“元”，数组只会更高效地保存错误数值。

## 栈 {#stack}

栈是一种后进先出（LIFO）的抽象行为，不限定唯一底层类型。Python 列表用 append 压入、用无参数 pop 弹出末端，适合简单栈；[官方数据结构教程](https://docs.python.org/3.14/tutorial/datastructures.html#using-lists-as-stacks)也采用这一模式。

若把有效成交 ID 依次压入撤销操作栈：

    undo_stack = []
    for trade_id in ("t1", "t2", "t3", "t6"):
        undo_stack.append(trade_id)

    undo_stack.pop()     # "t6"
    undo_stack.pop()     # "t3"

最后进入的 t6 最先出来。末端 push/pop 在常见 Python 实现中高效；若从列表开头 pop，就需要移动后续元素，破坏这一选择的优势。

空栈 pop 会抛出 IndexError，应由调用协议决定是先检查、捕获异常，还是禁止空弹出。栈只规定访问次序，不自动提供事务回滚：真正撤销一笔汇总还要保存反向操作、依赖状态和失败恢复规则。

## 队列 {#queue}

队列通常指先进先出（FIFO）：先进入的任务先处理。本例若按物理到达次序解析记录，可以使用标准库 collections.deque：

    from collections import deque

    work_queue = deque(trades)
    work_queue.popleft()[0]    # "t1"
    work_queue.popleft()[0]    # "t2"

[deque 官方文档](https://docs.python.org/3.14/library/collections.html#collections.deque)说明，两端 append/pop 具有近似相同的 O(1) 性能；普通 list 从开头 pop(0) 会产生 O(n) 的元素移动。

FIFO 也不是“按事件时间排序”。迟到的 09:29 记录若最后入队，仍最后出队；若业务要按时间优先，需先定义事件时间、水位线和迟到政策，或改用优先队列。

有 maxlen 的 deque 满后继续追加会从另一端丢弃元素。这适合固定窗口，却可能让审计队列静默丢数据；只有业务明确允许时才应使用。多生产者任务还可能需要 queue 模块提供的同步语义，单凭 deque 不能概括整个并发协议。

## 映射 {#map-operation}

这里的“映射”是把函数应用到每个元素的**变换操作**，不要与前面的 mapping/dict 数据结构混淆。内置 map 返回惰性迭代器；[官方内置函数文档](https://docs.python.org/3.14/library/functions.html#map)规定它依次产生函数结果。

    def to_notional(row):
        return (row[0], row[4] * row[5])

    valid_rows = [trades[0], trades[1], trades[2], trades[6]]
    mapped = map(to_notional, valid_rows)
    list(mapped)
    # [("t1", 100000), ("t2", 20000), ("t3", 42000), ("t6", 55000)]
    list(mapped)
    # []

第二次为空，因为同一个 map 对象已被消费。列表推导

    [(row[0], row[4] * row[5]) for row in valid_rows]

立即生成列表，适合要重复读取或随机访问的结果。map 保留输入迭代次序，但不会排序，也不会校验乘数单位。函数若有写文件、修改全局变量等副作用，惰性求值会让副作用发生时点取决于消费方式，研究管道中应优先使用易推理的纯变换。

## 过滤 {#filter}

过滤从输入中保留满足谓词的元素；它不修改每个元素的内容。先按 ID 保留首次出现，再过滤有效成交：

    seen = set()
    unique_rows = []
    for row in trades:
        if row[0] not in seen:
            seen.add(row[0])
            unique_rows.append(row)

    def is_valid_filled(row):
        return row[6] == "FILLED" and row[4] > 0 and row[5] > 0

    valid_iter = filter(is_valid_filled, unique_rows)
    valid_rows = list(valid_iter)
    [row[0] for row in valid_rows]     # ["t1", "t2", "t3", "t6"]

内置 [filter](https://docs.python.org/3.14/library/functions.html#filter)返回迭代器，并按输入顺序产生谓词为真的元素。等价的生成器表达式通常更直观：

    (row for row in unique_rows if is_valid_filled(row))

filter(None, iterable) 会按 Python 真值规则删除所有假值，包括 0、空字符串、空容器、False 和 None；这些含义不同，金融数据中不应把“零”和“缺失”混为一谈，宜写显式谓词。

步骤次序也是口径：本例先去重、再过滤，所以“首次为无效、后续同 ID 为有效”仍整体不进入结果；若先过滤再去重，后续有效行可能被采用。两种算法都能运行，只有事前规则决定哪一种正确。

## 排序 {#sorting}

排序把元素按明确键形成次序。Python 的 sorted 接受任意可迭代对象并返回新列表；list.sort 原地修改列表并返回 None。[官方 Sorting HOWTO](https://docs.python.org/3.14/howto/sorting.html)说明，键函数对每个输入记录计算一次，并保证排序稳定。

按证券、时间排序有效成交：

    ordered = sorted(valid_rows, key=lambda row: (row[2], row[1]))
    [row[0] for row in ordered]        # ["t1", "t3", "t6", "t2"]

键相同的记录保持原相对顺序，这就是稳定性。它允许先按次键排序再按主键稳定排序，但更直接的复合元组键通常更易审计。reverse=True 也保持稳定。

“09:30”能按字符串正确排序，是因为本例固定为零填充的 24 小时 HH:MM；“9:30”和“10:00”直接按字符串就会错。键里混入 None 与字符串、不可比较对象或 NaN 也会产生异常或非预期顺序，应先规范化并定义缺失位置。

排序不是免费预处理。若只要一次最小值，线性扫描比全排序更合适；若业务不要求顺序，不应只为“看起来整齐”付出时间和额外内存。

## 查找 {#search}

查找方法必须匹配数据是否有序、查询次数和允许的索引成本：

- **线性查找**：依次比较，无需预处理；在含 \(v\) 项的 valid_rows 中找 t6 最多比较 4 次，时间为 \(\Theta(v)\)。
- **二分查找**：要求序列已按同一个键有序；每次把候选范围近似减半，比较次数为 \(\Theta(\log v)\)。
- **散列查找**：先建 dict 或 set 索引，正常散列假设下单次查询期望 \(\Theta(1)\)，但需建表时间和额外空间，最坏碰撞不能忽略。

线性查找可以写成：

    found = next((row for row in valid_rows if row[0] == "t6"), None)

二分查找 ID 时，必须另建按 ID 排序的键表，并在得到插入点后检查相等：

    from bisect import bisect_left

    rows_by_id = sorted(valid_rows, key=lambda row: row[0])
    ids = [row[0] for row in rows_by_id]
    i = bisect_left(ids, "t3")
    found = rows_by_id[i] if i < len(ids) and ids[i] == "t3" else None

[bisect 官方文档](https://docs.python.org/3.14/library/bisect.html)强调，它寻找的是插入点而不是自动确认相等；二分搜索是 O(log n)，但向 Python 列表保持有序地插入仍会被 O(n) 的移动成本主导。若数据按证券、时间排好，不能据此对成交 ID 做二分查找。

## 去重 {#deduplication}

去重必须先定义“谁算相同”和“冲突时谁胜出”。本例按 trade_id 首次出现优先、保留物理顺序：

    seen = set()
    unique_rows = []

    for row in trades:
        trade_id = row[0]
        if trade_id in seen:
            continue
        seen.add(trade_id)
        unique_rows.append(row)

结果 ID 是 t1、t2、t3、t4、t5、t6。该算法使用集合做期望快速成员判断，用列表保存顺序；在正常散列假设下，处理 \(n\) 行的期望时间为 \(\Theta(n)\)，额外空间为 \(\Theta(u)\)，其中 \(u\) 是唯一 ID 数。

以下写法语义不同：

- set(rows)：按完整、可哈希记录去重，顺序无保证；
- list(dict.fromkeys(ids))：对可哈希 ID 去重并保留首次 ID 顺序，但只剩 ID；
- {row[0]: row for row in rows}：相同 ID 最后记录覆盖先前记录；
- 相邻记录比较：只有重复已经聚在一起才可靠。

去重会丢信息，应输出重复数、冲突样本和保留政策。成交重发、订单更新和两个真实事件共享错误 ID 的处理不能由容器自动决定；如果 ID 冲突的字段不同，静默“首条胜出”可能比重复计算更危险。

## 迭代器 {#iterator}

可迭代对象能提供一个逐项读取的迭代器；迭代器本身表示数据流，next 每次给出下一项，耗尽后抛出 StopIteration。[Python 术语表](https://docs.python.org/3.14/glossary.html#term-iterator)还明确区分：列表每次 iter(list) 产生一个新迭代器，而同一个迭代器只供一趟消费。

    it = iter(valid_rows)
    next(it)[0]           # "t1"
    [row[0] for row in it]  # ["t2", "t3", "t6"]
    list(it)              # []

map、filter、zip、打开的文件和生成器对象都常以迭代方式工作。迭代器适合流式管道和单遍算法，但没有通用的长度、随机索引或倒带能力；若后面要第二次遍历，应重新创建数据源迭代器或明确物化为列表。

“调用 list(iterator) 得到空列表”可能只是它已经被上一步消费，不代表原始数据为空。调试时要记录消费位置，避免日志预览先把数据吃完。遍历可变列表时修改底层列表也可能产生难以推理的结果，宜把读流与写结果分开。

## 生成器 {#generator}

生成器函数含 yield，调用时返回一个生成器迭代器；每次 yield 暂停执行并保留局部状态，下次继续。[Python 语言参考](https://docs.python.org/3.14/reference/expressions.html#yield-expressions)规定了这种暂停与恢复语义。

把本例“首次出现＋有效过滤”写成生成器：

    def iter_valid_first(rows):
        seen = set()
        for row in rows:
            trade_id = row[0]
            if trade_id in seen:
                continue
            seen.add(trade_id)
            if row[6] == "FILLED" and row[4] > 0 and row[5] > 0:
                yield row

    stream = iter_valid_first(trades)
    [row[0] for row in stream]    # ["t1", "t2", "t3", "t6"]
    list(stream)                  # []

惰性意味着函数体、异常和副作用主要在消费时发生，而不是创建 stream 时全部发生。它可以避免一次性保存所有输出，却不保证常数空间：为按 ID 去重，seen 仍随唯一 ID 数增长到 \(\Theta(u)\)；若下游要全量排序，也最终需要存储数据或使用外部排序。

生成器函数可再次调用以产生新对象，但同一个生成器对象耗尽后不能复位。提前停止还可能让后续校验、计数或资源清理尚未执行；涉及文件或事务时，应使用清楚的上下文与完成协议。

## 时间复杂度 {#time-complexity}

时间复杂度研究操作数随输入规模增长的量级，不是某台机器上的秒数。令 \(n=7\) 为物理行数、\(u=6\) 为唯一 ID 数、\(v=4\) 为有效成交数、\(g=2\) 为证券组数。本例在正常散列假设下：

| 操作 | 本例工作量 | 渐近时间与前提 |
| --- | ---: | --- |
| 遍历、过滤 | 看 7 行 | \(\Theta(n)\) |
| 集合去重 | 7 次成员判断 | 期望 \(\Theta(n)\)，最坏不能写成保证 |
| 建 ID 字典 | 7 次处理 | 期望 \(\Theta(n)\) |
| 线性找 t6 | 至多看 4 个有效项 | \(\Theta(v)\) |
| 已排序表二分查找 | 约按半缩小范围 | \(\Theta(\log v)\)，不含建表 |
| 排序有效项 | 排 4 项 | 一般上界 \(O(v\log v)\)，已有顺序可更快 |
| list 末端追加/弹出 | 单次 push/pop | 常见 CPython 中追加均摊 \(\Theta(1)\)、末端弹出 \(\Theta(1)\) |
| list 头部删除 | 后续元素移动 | \(\Theta(n)\) |
| deque 两端操作 | 单次入队或出队 | 官方描述为近似 \(O(1)\) |

整体若先去重过滤再排序，可写成期望

\[
\Theta(n)+O(v\log v)=O(n+v\log v).
\]

如果不要求排序，单遍汇总就是期望 \(\Theta(n)\)。二分查询虽然快，但先排序要 \(O(v\log v)\)；只查一次时，线性扫描可能总成本更低，重复查询才可能摊薄索引成本。

[NIST big-O 词条](https://xlinux.nist.gov/dads/HTML/bigOnotation.html)说明 \(O\) 是渐近上界，不是“正好等于”；\(\Theta\) 才表示同阶上下界。还要区分：

- **最坏时间**：某一次操作或最不利输入的上界；
- **期望时间**：对随机化或输入/散列模型取期望；
- **均摊时间**：对一串操作平均，而不是对随机输入平均。

例如动态列表 append 常被称为均摊 \(O(1)\)：多数追加便宜，偶尔扩容的一次操作可能移动很多引用。[Tarjan（1985）](https://doi.org/10.1137/0606031)给出了均摊分析的经典系统论述。复杂度没有包含磁盘、网络、解析、缓存与对象分配常数，真实瓶颈仍需测量。

## 空间复杂度 {#space-complexity}

空间复杂度关注峰值额外存储随规模怎样增长，也要声明是否把输入和输出算入。若输入 trades 已在内存：

- 原始列表与记录占 \(\Theta(n)\) 个元素/引用量级；
- seen 集合占 \(\Theta(u)\)；
- unique_rows 或 valid_rows 若物化，分别占 \(\Theta(u)\) 或 \(\Theta(v)\) 个额外引用；
- ID 字典占 \(\Theta(u)\)，证券汇总占 \(\Theta(g)\)；
- sorted(valid_rows) 至少产生一个含 \(v\) 个引用的新列表，排序实现还可能使用临时空间；
- 生成器对象本身很小，但本例去重状态仍为 \(\Theta(u)\)，汇总状态为 \(\Theta(g)\)。

因此流式去重、过滤和汇总可避免保存全部有效输出，额外状态仍是 \(\Theta(u+g)\)，不能声称 \(O(1)\)。若业务允许不去重，或上游能证明 ID 唯一，才可能去掉随 \(u\) 增长的集合。

array("q") 的四个元素至少有 \(4\times8=32\) 字节的数值载荷，此外还有数组对象开销；普通列表则保存对象引用，整数对象本身可能另占内存。不能只用 32 字节与 len(list) 比较总内存，应该用一致环境测量并包含被引用对象。

时间与空间常互换：字典索引用 \(\Theta(u)\) 空间换取期望快速重复查询；每次线性扫描省去索引却多花时间；生成器省去中间列表，却失去随机访问和复用；精确全量排序通常需要保存或外部归并。最合适的结构取决于数据规模、查询模式、顺序要求、失败恢复和可审计性，而不是某个容器在一张复杂度表里最“快”。
