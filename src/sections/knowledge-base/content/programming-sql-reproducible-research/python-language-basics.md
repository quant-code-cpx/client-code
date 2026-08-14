Python 不是“把每一行翻译成机器指令”的记号表，而是一套围绕对象、名称绑定、控制流和异常传播的语言语义。下面用一份完全在内存中处理的虚构研究数据贯穿全页：每行依次是证券代码、价格和数量；清洗器规范代码、精确解析十进制价格、过滤业务上不接受的记录，并把格式错误留在拒绝清单。示例只依赖 Python 标准库，不读取或写入真实文件。

```python
from collections.abc import Iterable
from decimal import Decimal, InvalidOperation, localcontext

CleanRow = tuple[str, Decimal, int]

RAW_LINES = (
    "alpha,10.50,3",
    " beta ,7.25,4",
    "bad-price,missing,2",
    "gamma,12.00,0",
)


def parse_row(text: str, *, allow_zero: bool = False) -> CleanRow | None:
    parts = [part.strip() for part in text.split(",")]
    if len(parts) != 3:
        raise ValueError(f"expected 3 fields: {text!r}")

    symbol, price_text, quantity_text = parts
    try:
        price = Decimal(price_text)
        quantity = int(quantity_text)
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"invalid numeric field: {text!r}") from exc

    if not symbol or not price.is_finite():
        raise ValueError(f"invalid symbol or price: {text!r}")
    if price < 0 or quantity < 0:
        return None
    if quantity == 0 and not allow_zero:
        return None
    return symbol.upper(), price, quantity


def clean_rows(lines: Iterable[str]) -> tuple[list[CleanRow], list[str]]:
    cleaned: list[CleanRow] = []
    rejected: list[str] = []
    for line_number, line in enumerate(lines, start=1):
        try:
            row = parse_row(line)
        except ValueError as exc:
            rejected.append(f"line {line_number}: {exc}")
            continue
        if row is not None:
            cleaned.append(row)
    return cleaned, rejected


def total_value(rows: Iterable[CleanRow]) -> Decimal:
    with localcontext() as context:
        context.prec = 12
        return sum(
            (price * quantity for _, price, quantity in rows),
            Decimal("0"),
        )
```

按默认十进制上下文调用 `clean_rows(RAW_LINES)`，可接受记录是 `ALPHA` 与 `BETA` 两行，格式错误一行，零数量行按当前政策过滤；`total_value(...)` 得到 `Decimal("60.50")`。这只是语义教学结果，不代表真实证券数据格式：正式 CSV 还要处理引号、转义、编码、缺失值和数据字典。

## 变量 {#variables}

Python 的变量更准确地说是**名称到对象的绑定**。执行 `price = Decimal("10.50")` 时，先产生或取得一个对象，再把名称 `price` 绑定到它；赋值不是声明一块只能容纳某种类型的盒子。同一名称可以被重新绑定，不同名称也可指向同一对象：

```python
first = ["alpha"]
alias = first
alias.append("beta")
# first 和 alias 指向同一列表，所以 first 也变成两项

copy = first.copy()
copy.append("gamma")
# 浅复制得到新的外层列表；first 不随这次 append 改变
```

要区分“重新绑定名称”和“修改对象”。`alias = []` 只让 `alias` 改指新列表，不会清空 `first`；`alias.append(...)` 则修改两者共同指向的可变列表。浅复制也不是递归复制：若列表元素仍是可变对象，内层对象可能继续共享。

示例中的 `RAW_LINES`、`CleanRow`、函数名和形参都是名称。全大写只是“调用者不应修改”的社区约定，不会让对象获得语言级常量保护；这里用不可变元组减少误改，但元组若包含可变元素，元素本身仍可变。未绑定名称在求值时触发 `NameError`。官方[执行模型](https://docs.python.org/3.14/reference/executionmodel.html#naming-and-binding)给出了名称绑定的正式规则。

## 数值 {#numbers}

内置数值类型至少包括 `int`、`float`、`complex`，`bool` 还是 `int` 的子类；标准库 `decimal.Decimal` 提供十进制浮点。选择类型要由数据含义决定，而非“哪种精度总是更高”。

- `int` 表示整数，Python 语言允许其精度随需要增长，实际上仍受可用内存以及部分字符串转换安全限制约束。
- `float` 通常适合科学计算、统计和容许误差的连续量，但十进制小数一般不能被二进制浮点精确表示。因此 `0.1 + 0.2 == 0.3` 通常为 `False`；比较近似量应选有业务依据的绝对或相对容差，而不是随意四舍五入。
- `Decimal("10.50")` 精确保留这个十进制输入及尾随零，适合需要明确十进制舍入规则的金额。`Decimal(0.1)` 会精确接收那个已有误差的二进制浮点值，并不等于 `Decimal("0.1")`。构造自字符串可避免这层意外。

`Decimal` 也不是“无限精度且永不舍入”：除法、乘法等运算受当前 `Context` 的精度、舍入、指数范围和信号设置影响。它通常不能直接与 `float` 做算术混合，且 `NaN`、正负无穷也属于可构造值，所以清洗器显式调用 `price.is_finite()`。本例数量用 `int`，价格用 `Decimal`，总值以 `Decimal("0")` 作为 `sum` 起点，避免默认整数起点掩盖口径。

还要分清 `/` 与 `//`：`5 / 2` 得到浮点 `2.5`，整数的 `5 // 2` 得到 `2`；地板除向负无穷取整，`-5 // 2 == -3`，不是简单向零截断。除零、溢出、无效十进制等边界可能产生异常或特殊值，不能把所有“算不出”统一替成零。Python 官方的[内置数值类型](https://docs.python.org/3.14/library/stdtypes.html#numeric-types-int-float-complex)与 [`decimal` 文档](https://docs.python.org/3.14/library/decimal.html)说明了这些语义。

## 字符串 {#strings}

`str` 是不可变的 Unicode 码点序列。`line.strip()`、`symbol.upper()` 和 `text.split(",")` 都返回新对象，不会原地修改原字符串；因此本例用列表推导式接住每个清洗结果。索引产生长度为 1 的字符串，切片产生新字符串；没有独立的“字符”类型。

```python
raw = " beta "
clean = raw.strip().upper()
# raw 仍是 " beta "，clean 是 "BETA"

message = f"expected 3 fields: {raw!r}"
# !r 使用 repr 风格，空格、换行等边界更容易辨认
```

不可变不等于任何字符串操作都便宜：循环中反复 `result += fragment` 可能不断创建新对象，大量片段通常用 `"".join(parts)`。Unicode 码点也不总等于用户看到的字形；例如一个字母和组合重音可能占两个码点。需要人类语言边界时，不能把 `len(text)` 自动解释为“字符数”或显示宽度。

本例的 `split(",")` 只适合刻意简化、字段不含逗号的教学格式；真实 CSV 的引号字段可能包含逗号和换行，应使用标准库 `csv` 并冻结方言、编码与空值规则。把文件内容当普通字符串拆分，不能替代格式规范。[内置 `str` 文档](https://docs.python.org/3.14/library/stdtypes.html#text-sequence-type-str)是字符串语义基线。

## 布尔值 {#booleans}

`bool` 只有 `True` 与 `False` 两个实例，但条件并不要求表达式已经是 `bool`。对象会接受真值测试：`None`、数值零和空字符串、空元组、空列表、空字典等通常为假；其他对象通常为真，除非类型通过 `__bool__()` 或 `__len__()` 定义不同规则。

这让简洁代码成为可能，也容易混淆业务状态：

```python
quantity = 0
if not quantity:
    pass  # 会执行，但无法说明 quantity 是缺失、零，还是其他假值

if quantity == 0:
    pass  # 本例真正要表达的业务条件
```

字符串 `"0"` 和 `"False"` 都非空，因此为真；`bool("False")` 不是文本布尔解析器。缺失值若以 `None` 表示，应使用 `value is None`，而不是 `not value`，否则合法的 `0`、`Decimal("0")` 或空集合会被误判。`bool` 虽是 `int` 子类，`True + True == 2`，但研究代码应显式转换或计数，避免把逻辑标记不经说明地当金额或数量。官方[真值测试](https://docs.python.org/3.14/library/stdtypes.html#truth-value-testing)列出了完整边界。

## 运算符 {#operators}

运算符既包括算术 `+ - * / // % **`，也包括比较、成员测试、身份测试和布尔运算。含义可由对象类型实现：`+` 对整数是加法，对字符串和列表是拼接；这不意味着不同类型可随意混算。优先级不确定时应加括号表达研究意图，不靠记忆压缩代码。

本例这行同时展示短路和边界保护：

```python
if not symbol or not price.is_finite():
    raise ValueError("invalid symbol or price")
```

`or` 从左到右求值，遇到真值就返回该操作数；`and` 遇到假值就返回该操作数。两者返回的未必是 `bool`，例如 `"" or "UNKNOWN"` 返回字符串 `"UNKNOWN"`。短路可避免不必要或不安全的右侧计算，但把带副作用的函数塞进长布尔链会使执行路径难以审计。

比较可链写：`0 <= quantity <= limit` 等价于逻辑上的两个比较，且中间表达式只求值一次。`==` 比较值是否相等，`is` 比较是否是同一个对象；`is None` 是正确的哨兵判断，不能用 `is` 比较两个价格或字符串的内容。`in` 测试成员关系，复杂度与容器实现有关；不要因小样例中列表够快就假设大数据仍适合。官方[表达式参考](https://docs.python.org/3.14/reference/expressions.html)定义了求值次序、短路和优先级。

## 条件分支 {#conditional-branches}

`if`、`elif`、`else` 按顺序测试，执行第一个真值条件对应的分支，之后不再检查同链的其他条件。分支应体现互斥的业务分类，并优先处理使后续计算无定义的边界。

```python
if not symbol or not price.is_finite():
    raise ValueError("malformed row")
elif price < 0 or quantity < 0:
    return None
elif quantity == 0 and not allow_zero:
    return None
else:
    return symbol.upper(), price, quantity
```

本页实际函数用多个“守卫式” `if` 提前返回，减少缩进，但语义等价地表达了三类结果：格式错误抛异常、格式正确但违反纳入政策返回 `None`、接受则返回规范记录。异常和 `None` 不是可互换的风格：前者表示调用约定无法正常满足，后者是函数契约明示的可预期过滤结果。

分支顺序会改变结果。若先做 `price < 0` 再排除 `Decimal("NaN")`，十进制上下文可能在比较时发出 `InvalidOperation`；先检查有限性更清晰。`match` 是 Python 3.10 起的结构模式匹配，适合按数据形状解构，但不会比两个清晰分支天然更安全。正式语义见[复合语句参考](https://docs.python.org/3.14/reference/compound_stmts.html#if)。

## 循环 {#loops}

`for` 从可迭代对象取得迭代器并逐项消费，不要求按数字索引。`enumerate(lines, start=1)` 同时产生从 1 开始的行号和数据行，避免手工维护计数器。`continue` 跳到下一轮，`break` 结束最内层循环，`return` 则结束整个函数。

```python
for line_number, line in enumerate(lines, start=1):
    try:
        row = parse_row(line)
    except ValueError as exc:
        rejected.append(f"line {line_number}: {exc}")
        continue
    if row is not None:
        cleaned.append(row)
```

`for ... else` 的 `else` 仅在循环未被 `break` 结束时执行，不是“最后一轮”的分支；初学阶段若读者容易误解，可用函数返回或显式标志表达。`while` 在条件为真时重复，适合迭代次数未知的流程，但必须设计状态推进和停止条件。`range(stop)` 不包含 `stop`。

迭代列表时同时插入或删除元素会改变后续遍历位置；需要筛选时可构造新列表，或在确有必要时遍历副本。生成器与迭代器还可能只能消费一次，第二次循环未必有数据。循环体中的异常不会自动变成“跳过坏行”：只有像本例一样明确捕获并 `continue` 才会继续，而捕获范围过大又可能隐藏程序错误。

## 函数 {#functions}

执行 `def` 语句会创建函数对象并把函数名绑定到它；函数体到调用时才执行。函数是一等对象，可以赋给名称、放入容器、作为参数传递或作为返回值。函数签名应把输入、输出和失败方式变成稳定契约，而不是只把若干行包起来。

本例分成三个职责：`parse_row` 处理一行的语法与政策，`clean_rows` 编排多行并收集错误，`total_value` 聚合金额。这样可以单独推理每层：改变“零数量能否纳入”不应重写求和；改变错误呈现也不应改变十进制解析。

“纯函数”在实务中指同样显式输入产生同样输出，且不修改外部可观察状态。`clean_rows` 会修改自己新建的局部列表，但不改调用者传入的数据，因此这种局部可变实现不等于外部副作用。打印、写文件、修改模块全局列表、请求网络和修改传入列表则是副作用，应在边界层显式出现。`Decimal` 运算还可能依赖环境上下文，所以 `total_value` 用 `localcontext()` 把精度依赖局部化；真正严格复现还需冻结舍入模式和输入规范。

函数不保证“短就正确”。应明确单位、空输入、重复行、异常、可变输入和复杂度。`total_value([])` 因显式起点返回 `Decimal("0")`；若省略起点，空生成式会返回整数 `0`，数值相等但类型和金额语义变了。

## 参数 {#parameters}

**形参**是函数定义中的名称，**实参**是调用时提供的对象。Python 调用可理解为“把对象引用赋给形参”（也称 call by sharing）：函数内重新绑定形参不会改变调用者的名称，但通过形参修改同一个可变对象，会被调用者观察到。

```python
def add_error(errors: list[str], message: str) -> None:
    errors.append(message)  # 修改调用者与形参共同指向的列表


def rebind(errors: list[str]) -> None:
    errors = []  # 只重新绑定局部名称，不会清空调用者列表
```

`parse_row(text, *, allow_zero=False)` 中 `*` 后的 `allow_zero` 是仅限关键字形参，调用者必须写 `allow_zero=True`，政策含义比位置参数 `True` 更清楚。`/` 可把其前形参限定为仅位置；普通形参可按位置或关键字传递；`*args` 收集额外位置实参为元组，`**kwargs` 收集额外关键字实参为字典。灵活签名会弱化拼写错误检查，不应无目的地接受任意参数。

默认值在执行 `def` 时只求值一次，不是每次调用重新创建。下面的可变默认列表会跨调用共享，通常是错误：

```python
def bad_collect(value: str, bucket: list[str] = []) -> list[str]:
    bucket.append(value)
    return bucket
```

需要每次新容器时用 `None` 作哨兵，并在函数内创建。默认值还会捕获定义当时的对象；之后重新绑定同名全局变量不会更新它。官方教程的[函数参数说明](https://docs.python.org/3.14/tutorial/controlflow.html#more-on-defining-functions)覆盖这些规则。

## 返回值 {#return-values}

`return expression` 先求值，再结束当前函数并把对象交给调用者。没有 `return`、执行到函数末尾或使用裸 `return`，都会返回 `None`；Python 不存在语言级“无返回值过程”。多个逗号分隔值实际组成一个元组：

```python
cleaned, rejected = clean_rows(RAW_LINES)
# clean_rows 的 return cleaned, rejected 返回二元组，再由调用方解包
```

`parse_row` 的返回类型是 `CleanRow | None`，所以调用者必须区分接受记录与政策过滤；它不能把 `None` 当空记录继续求和。`clean_rows` 始终返回两个列表，即使均为空，避免有时返回列表、有时返回错误文本的形状漂移。返回可变对象不会自动复制：调用者后来修改 `cleaned` 会修改那一个返回列表，但不会倒改已退出函数中的其他隐藏副本，因为本例没有保留一个。

`total_value` 从 `with` 块中 `return` 时，返回表达式先在局部十进制上下文中计算，然后上下文管理器执行退出逻辑，最后调用者取得结果。`return` 放在 `finally` 中可能覆盖原返回值或待传播异常；Python 3.14 按 [PEP 765](https://peps.python.org/pep-0765/) 对 `finally` 中离开该块的 `return`、`break`、`continue` 发出 `SyntaxWarning`，研究代码不应依靠这种难审计路径。

## 作用域 {#scope}

名称查找常用 LEGB 记忆：当前函数局部（Local）、外层函数（Enclosing）、模块全局（Global）、内置名称（Builtins）。它是有用起点，但正式执行模型还包含类体、推导式和 Python 3.12 起的注解作用域等特殊规则。

```python
policy = "strict"              # 模块全局


def make_filter(minimum: int):  # minimum 位于外层函数作用域
    def accept(quantity: int) -> bool:
        return quantity >= minimum and policy == "strict"
    return accept
```

在函数体任何位置给名称赋值，通常会使它在整个函数代码块中被判定为局部名称；若赋值前读取，会触发 `UnboundLocalError`，而不是自动读取同名全局变量。`global` 允许绑定模块级名称，`nonlocal` 允许绑定最近的外层函数名称，但研究逻辑通常更适合把状态作为参数传入并返回新结果，依赖更可见。

`if`、`for` 和 `with` 不创建新的词法作用域，因此循环目标和 `with ... as` 名称在块后仍可能可见；函数、类和模块会创建代码块，推导式变量按语言语义不会泄漏到外围。闭包捕获的是名称绑定而非把当时值自动复制一份，循环中创建函数时可能出现“晚绑定”；可通过显式参数或定义时默认值冻结所需对象。不要把 LEGB 简写当因果隔离：可变全局对象即使只读取名称，仍可能被方法调用修改。

## 模块 {#modules}

模块通常是一个独立命名空间，`.py` 文件只是最常见来源。`from decimal import Decimal` 把模块中的对象绑定到当前模块名称 `Decimal`；`import decimal` 则绑定模块对象，之后用 `decimal.Decimal` 访问。前者更短，后者在名称来源多时更清楚。标准库与第三方包都通过导入系统进入，但“能 import”不表示来源、版本或依赖已经可复现。

导入会先检查 `sys.modules` 缓存，再通过查找器和加载器定位模块；首次加载通常执行模块顶层代码，成功后模块对象留在缓存中，同一解释器后续普通导入通常复用它。缓存不是永久磁盘缓存，也不是“顶层代码全球只执行一次”的绝对保证：显式重载、删除缓存项、不同解释器进程、导入失败或自定义加载器都会改变行为。

因此模块顶层应主要放定义和廉价、确定的初始化，避免导入时写文件、请求网络或启动长任务。可执行入口通常放入函数，并由 `if __name__ == "__main__":` 守卫，使直接运行与被导入具有不同、明确的行为。循环导入会遇到尚未初始化完成的模块，不能靠调整导入顺序掩盖职责耦合。官方[导入系统参考](https://docs.python.org/3.14/reference/import.html)说明了缓存、查找、加载与绑定的区别。

## 异常 {#exceptions}

异常把正常返回路径与无法满足调用约定的路径分开。内置异常最终继承自 `BaseException`；日常程序错误大多继承自 `Exception`，而 `KeyboardInterrupt`、`SystemExit` 等直接位于另一支。裸 `except:` 会连用户中断和进程退出意图一起截获，通常不应使用；`except Exception:` 虽较窄，仍可能隐藏编程错误，优先捕获预期的具体类型。

```python
try:
    price = Decimal(price_text)
    quantity = int(quantity_text)
except (InvalidOperation, ValueError) as exc:
    raise ValueError(f"invalid numeric field: {text!r}") from exc
```

这里捕获的异常与两项解析操作相邻，并用 `raise ... from exc` 保留因果链，再向上层提供统一的行格式契约。外层只捕获 `ValueError`，记录该行并继续；它不会误吞 `MemoryError`、拼写导致的 `NameError` 或其他非预期缺陷。实际系统还应控制错误文本是否含敏感原文。

`try` 的 `else` 在主体未抛异常且未以 `return`、`break`、`continue` 离开时执行，适合缩小捕获范围；`finally` 通常无论正常、异常或提前返回都会执行，适合恢复状态，但其自身异常可能替代原异常。异常对象不等于错误处理已经完成：必须决定重试、过滤、升级、回滚或终止，不能只打印后继续。官方[内置异常层级](https://docs.python.org/3.14/library/exceptions.html)与 [`try` 语句参考](https://docs.python.org/3.14/reference/compound_stmts.html#the-try-statement)是语义依据。

## 上下文管理 {#context-management}

`with` 把“进入—执行—退出”协议结构化。上下文表达式先产生上下文管理器；成功调用 `__enter__()` 后执行块，离开块时调用 `__exit__(exc_type, exc_value, traceback)`。这包括正常结束、异常以及块内 `return`、`break` 等控制流。若 `__enter__()` 本身失败，则尚未进入，不会按已进入资源调用对应退出逻辑。

```python
def total_value(rows: Iterable[CleanRow]) -> Decimal:
    with localcontext() as context:
        context.prec = 12
        return sum(
            (price * quantity for _, price, quantity in rows),
            Decimal("0"),
        )
```

`localcontext()` 创建当前十进制上下文的局部副本，并在退出时恢复先前上下文，所以精度变更不会永久泄漏到调用者。若需要固定金额口径，还应显式设置舍入方式，而不是只设 `prec`。这个例子展示资源/状态管理而不操作真实文件；文件对象、锁和数据库事务也常实现相同协议，但各自的提交、回滚与异常抑制规则必须查具体类型。

`__exit__()` 返回真值可以抑制块内异常，返回假值则继续传播；通用上下文管理器不应无意吞错。`with` 也不创建词法作用域，块后名称 `context` 仍可能绑定，只是它不再代表当前已激活的局部上下文。协议的正式展开见 [`with` 语句参考](https://docs.python.org/3.14/reference/compound_stmts.html#the-with-statement)与 [PEP 343](https://peps.python.org/pep-0343/)。

## 类型标注 {#type-annotations}

类型标注描述预期接口，默认不会在运行时强制检查。下面的别名和签名能让读者或静态分析工具知道每条清洗记录的结构，但调用 `parse_row(123)` 时，Python 不会先因标注阻止调用；函数随后在 `123.split(...)` 处按正常运行时语义失败。

```python
CleanRow = tuple[str, Decimal, int]


def parse_row(text: str, *, allow_zero: bool = False) -> CleanRow | None:
    ...


def clean_rows(
    lines: Iterable[str],
) -> tuple[list[CleanRow], list[str]]:
    ...
```

`list[CleanRow]` 表示元素预期为 `CleanRow`，`A | None` 表示两种返回可能；它们是类型表达，不替代 `len(parts) == 3`、有限价格、非负数量等运行时数据校验。参数标为 `Iterable[str]` 说明函数只依赖逐项读取，既不承诺可索引，也不承诺能重复遍历。`CleanRow = ...` 是兼容且直观的别名写法；Python 3.12 起还可用 `type CleanRow = ...` 声明显式类型别名。

Python 3.14 默认惰性求值多数注解，运行时读取注解的行为与早期版本不同；库若用 `annotationlib`、`typing.get_type_hints()` 或框架反射注解，仍要考虑名称是否可解析及求值副作用。类型标注也不是运行时泛型容器验证：`isinstance(value, list[str])` 会因参数化泛型不适合作第二实参而失败，若需要数据验证必须编写明确逻辑或采用另行选择的工具。

好的标注应与真实返回和异常契约一致，而非为了“通过检查”写 `object` 或任意强制转换。静态工具在不同配置下结论可能不同，语言本身只定义注解的存储与求值语义。[类型标注库文档](https://docs.python.org/3.14/library/typing.html)、[注解语句参考](https://docs.python.org/3.14/reference/compound_stmts.html#annotations)与 [PEP 484](https://peps.python.org/pep-0484/)明确说明类型提示不由 Python 运行时强制。

**版本与来源边界（核对至 2026-08-14）：**本文以 Python 3.14 系列现行官方文档为语言语义基线，主要依据《Language Reference》的执行模型、表达式、简单/复合语句和导入系统，以及标准库的内置类型、异常、`decimal`、`typing` 文档；上下文管理和类型提示分别交叉核对 PEP 343、PEP 484。版本敏感点已单独标明，尤其是 Python 3.14 的惰性注解与 `finally` 控制流警告；示例未依赖第三方库，也未进行真实 I/O。
