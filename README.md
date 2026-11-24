# Module Language Specification
Module Language is a statically-typed procedural scripting language designed for metasystem programming or numerical computation. It emphasizes safety, readability, and performance by eliminating undefined behavior through compile-time analysis.
## Table of Contents
1. [Startup](#startup)
2. [Comment](#comment)
3. [Identifiers](#identifiers)
4. [Types](#types)
5. [Operators](#operators)
6. [Controls](#controls)
7. [Namespaces](#namespaces)
8. [Standard Library](#stdlibs)
9. [Appendix](#appendix)
## 1. Startup
<a id="startup"></a>
Download the startup package from the <a target="_blank" href="https://module-language.github.io/module-lang/">official website</a> and verify that the following files and directories are included:
- `PROGRAM /`
	- `main.mod`
	- `utils.mod`
- `STDLIB /`
	- `ALGORITHM.txt`
	- `GRAPH.txt`
	- `MATH.txt`
	- `NETWORK.txt`
	- `SYSTEM.txt`
	- `ERROR.txt`
- `modc.exe`
- `editor.exe`

and write a code in `editor.exe` (newlines separate statements, while indentation will be ignored):
```mod
print("Hello, Module!")
```
Run `c main.mod` from `modc.exe` or push `Run` button in `editor.exe`. The compiler reads files in following order:
1. required standard library (`./STDLIB/*.txt`)
2. declaration file (`./PROGRAM/*.mod` except `main.mod`)
3. definition file (`./PROGRAM/main.mod`)
and performs algorithmic code optimization (e.g. constant folding).

## 2. Comment
<a id="comment"></a>
`!` makes a comment until the end of line.
### 2-1. Syntax
```mod
! text
```
### 2-2. Example
```mod
! displays Hello, world on console
print("Hello, world")
```
## 3. Identifiers
<a id="identifiers"></a>
An identifier is a sequence of ASCII characters that begins with an alphabetic character or an underscore (`_`). It is case-sensitive and separated by whitespace or operators, while a keyword is a defined identifier as the following table:

|keyword|meaning|
|:---:|:---:|
|`and`|logical/bit-wise and|
|`or`|logical/bit-wise or|
|`not`|negation|
|`is`|equality|
|`ret`|function exit|
|`tef`|namespace definition|
|`if`|branch control|
|`end`|scope end|
|`loop`|loop control|
|`break`|loop end|
|`continue`|loop again|
|`new`|memory allocator|
|`def`|function definition|
|`import`|import declaration|

And there is also a predeclared identifier (short for preIdent) that treated as a 'simple' identifier:

|preIdent|meaning|
|:---:|:---:|
|`bool`|boolean type|
|`int`|integer type|
|`float`|floating type|
|`char`|character type|
|`wchar`|wide character type|

### Syntax
```mod
type identifier = expr
```
Every identifier must be initialized just once. Write `;` at the end of line to omit its initialization, enabling us to write it in a single line.
### Example
```mod
int age = 20

int x;

float s; char c;
```

|type|init value|
|:---:|:---:|
|bool|`0`|
|int|`0`|
|float|`0.0`|
|char|`"\0"`|
|wchar|`"\0"`|

and for allocating a memory on heap memory, use:
### Syntax
```mod
type identifier = new [size]{expr, expr, ...}
```
> This is called a new's expression.
If the size can be determined at compile time, allocation is performed in stack memory. Otherwise, heap memory is used.
### Example
```mod
int length = input()

! can be changed while execution
char buffer = new [length]{0}

! guaranteed as constant
int array = new [3]{0, 1, 2}
```
Use `ident[index]` (`index=0` for a head) to access its indexed expression, but be careful of out-of-bounds access that is buffer overrun. The relationship between some integer `n` is `ident[n] = ident[len(ident) + n]`.

|API|meaning|syntax|
|:---:|:---:|:---|
|`push`|append expressions|`ident:push(expr)`|
|`pop`|remove and get expressions|`expr = ident:pop()`|
|`free`|free up used memory|`ident:free()`|

The function `free()` returns `1` if memory deallocation is successful, and `0` if it fails.
## 4. Types
<a id="types"></a>

|class|identifier|size (bit)|range|
|:---:|:---:|:---:|:---:|
|logic|`bool`|1|0, 1|
|integer|`int`|8|-128 ~ 127 (0 ~ 255)|
|integer|`int`|16|-32768 ~ 32767 (0 ~ 65535)|
|integer|`int`|32|-2147483648 ~ 2147483647 (0 ~ 4294967295)|
|integer|`int`|64|-9223372036854775808 ~ 9223372036854775807 (0 ~ 18446744073709551615)|
|real|`float`|32|1.175*10^-38 ~ 3.402*10^38|
|real|`float`|64|2.225*10^-308 ~ 1.797*10^308|
|character|`char`|8|0 ~ 255|
|wide character|`wchar`|16|0 ~ 65535|
### 4-1. Logical Type
Values evaluated as false include:
- integer `0`
- empty strings
- `NaN`
- invalid memory addresses
All other values are considered true. In particular, `false` represents `0`, while `true` does `1`.
#### 4-1-1. Syntax
```mod
bool identifier = expr
```
#### 4-2. Example
```mod
bool x = 0
```
### 4-2. Integer Type
Integers are binary numbers, decimal numbers, and hexadecimal numbers. The default bit size is 16.
#### 4-2-1. Syntax
```mod
int identifier = expr
```
The following integer can be represented:

|kinds|notation|example|
|:---:|:---|:---|
|binary|starts with `0b` or `0B`|`0b0101`|
|decimal|starts with something other than `0`|`712`|
|hexadecimal|starts with `0x` or `0X`|`0x4E`|

#### 4-2-2. Example
```mod
int t = 60
```
### 4-3. Real Type
A floating-point numbers defined in IEEE754, which has single-precision 32-bit (sign 1bit, exponent 8bit, mantissa 23bit) or double-precision 64-bit (sign 1bit, exponent 11bit, mantissa 52bit). Please refer to the table below for other special values:

|value|sign|exponent|mantissa|
|:---|:---:|:---:|:---:|
|$infty;|`0`|`11111111`|`0`|
|-$infty;|`1`|`11111111`|`0`|
|`NaN`|any|`11111111`|any other than `0`|

#### 4-3-1. Syntax
```mod
float identifier = expr
```
#### 4-3-2. Example
```mod
float pi = 3.14
```
### 4-4. Character Type
The character type `char` handles ASCII codes (8 bit), while the wide character type `wchar` handles Unicode (16 bit). For surrogate pairs in Unicode, use `new`'s expression to be represented. Expressions can embed with `$(...)`. Only a transformation `wchar` to `char` is prohibited.
#### 4-4-1. Syntax
```mod
char identifier = expr
```
#### 4-4-2. Example
```mod
char c = "p"
```

|escaping character|meaning|
|:---:|:---|
|`\'`|single quotation mark|
|`\"`|double quotation mark|
|`\\`|backslash symbol|
|`\0`|terminating character|
|`\n`|line break|
|`\s`|blank space|
|`\t`|horizontal tabulation|
|`\u`|unicode prefix|

### 4-5. Wide Character Type
#### 4-5-1. Syntax
```mod
wchar identifier = expr
```
#### 4-5-2. Example
```mod
wchar w = "勝"
```
### 4-6. Reference Type
A reference type represents an alias to the address of a variable, constant, function, or array that allocates with `new`'s expression.
#### Syntax
```mod
type identifier = ref expr
```

|address operation|meaning|
|:---:|:---:|
|`p += n`|advance address by n bytes|
|`p + n = expr`|assign the expression to n bytes address|
> `n` is a signed integer.
#### Example
```mod
char g = new [2][6]{"Hello", "world"}

char p = ref g
```
### 4-7. Constant Type
#### Syntax
```mod
identifier := expr
```
#### Example
```mod
PI := 3.14	! implement as float<32>
```
### 4-8. Function Type
The following are provided by default:

|identifier|syntax|meaning|
|:---:|:---|:---|
|`input`|`input() -> new int`|a|
|`print`|`print(expr) -> int`|prints the result of the specified expression. No newline `\n` or `\r\n` are inserted at the end of the line.
|`len`|`len(expr) -> int`|returns the number of elements as an integer.|
|`sizeof`|`sizeof(expr) -> int`|returns the number of bytes of memory used by the expression type.|
|`typeof`|`typeof(expr) -> type`|returns the type of the expression.|
|`alignof`|`alignof(type) -> int`|returns the type alignment in bytes

#### Syntax
```mod
def ident (type, type, ...) -> type
```
`ident` must be unique (overloading is prohibited). Can be set up default values for type parameters.
#### Example
```mod
def mult (int, int) -> int
```
Define its body for every declared function:
#### Syntax
```mod
ident (ident, ident, ...)
  body
  ret expr
```
`ret` statement indicates the function exit with `expr`, and parameter types corresponds to parameter identifiers each.
#### Example
```mod
def div (int, int) -> int

div (x, y)
  if y is 0
    ret 0
  end
  ret x / y

print(div(4, 2))  ! div(4, 2) returns 2
```
## 5. Operators
<a id="operators"></a>
|precedence|operator|meaning|associativity|
|:---:|:---:|:---:|:---:|
|1|`:`|access|left|
|2|`()` `[]` `{}`|bracket|left|
|3|`ref`|reference|right|
|4|`<...>`|bit-width|left|
|5|`f()`|function call|left|
|6|`not`|logical/bit negate|right|
|7|`^`|math pow|left|
|8|`-`|minus|right|
|9|`%`|math mod.|left|
|10|`*`|math mult.|left|
|11|`/`|math div.|left|
|12|`+`|math add.|left|
|13|`-`|math sub.|left|
|14|`<<` `>>`|math shift|left|
|15|`<` `>` `<=` `>=`|math relation|left|
|16|`is`|math equality|left|
|17|`and`|logical/bit and|left|
|18|`or`|logical/bit or|left|
|19|`=`|assignment|right|
|20|`+=` `-=` `*=` `/=` `%=` `^=`|compond|right|
|21|`~`|overlay|right|
|22|`:=`|definition|right|

### 5-1. minus operation
#### 5-1-1. Syntax
```mod
- expr
```
#### 5-1-2. Example
```mod
int x = -1
```
### 5-2. addition operation
#### 5-2-1. Syntax
```mod
expr + expr
```
#### 5-2-2. Example
```mod
1 + 2
```
### 5-3. substitution operation
#### 5-3-1. Syntax
```mod
expr - expr
```
#### 5-3-2. Example
```mod
1 - 2
```
### 5-4. multiplication operation
#### 5-4-1. Syntax
```mod
expr * expr
```
#### 5-4-2. Example
```mod
1 * 2
```
### 5-5. division operation
#### 5-5-1. Syntax
```mod
expr / expr
```
#### 5-5-2. Example
```mod
1 / 2
```
### 5-6. modulo operation
#### 5-6-1. Syntax
```mod
expr % expr
```
#### 5-6-2. Example
```mod
1 % 2
```
### 5-7. pow operation
#### 5-7-1. Syntax
```mod
expr ^ expr
```
#### 5-7-2. Example
```mod
1 ^ 2
```
### 5-8. assignment operation
#### 5-8-1. Syntax
```mod
ident = expr
```
#### 5-8-2. Example
```mod
char c = "M"
```
### 5-9. compound operation
#### 5-9-1. Syntax
```mod
! ident = ident + expr
ident += expr

! ident = ident - expr
ident -= expr

! ident = ident * expr
ident *= expr

! ident = ident / expr
ident /= expr

! ident = ident % expr
ident %= expr

! ident = ident ^ expr
ident ^= expr
```
#### 5-9-2. Example
```mod
int x = 2

int y = (x += 1)  ! y = 3
```
### 5-10. bit-wise/logic and operation
|`A`|`B`|`A and B`|
|:---:|:---:|:---:|
|`0`|`0`|`0`|
|`0`|`1`|`0`|
|`1`|`0`|`0`|
|`1`|`1`|`1`|
|integer|integer|integer|
|logic|logic|logic|
#### 5-10-1. Syntax
```mod
expr and expr
```
#### 5-10-2. Example
```mod
bool x = 1 and 0  ! bool x = 0
```
### 5-11. bit-wise/logic or operation
|`A`|`B`|`A or B`|
|:---:|:---:|:---:|
|`0`|`0`|`0`|
|`0`|`1`|`1`|
|`1`|`0`|`1`|
|`1`|`1`|`1`|
|integer|integer|integer|
|logic|logic|logic|
#### 5-11-1. Syntax
```mod
expr or expr
```
#### 5-11-2. Example
```mod
int x = 15 or 31

bool y = 0 or 1
```
### 5-12. bit-wise/logic not operation
|`A`|`not A`|
|:---:|:---:|
|`0`|`1`|
|`1`|`0`|
|integer|integer|
|logic|logic|
#### 5-12-1. Syntax
```mod
not expr
```
#### 5-12-2. Example
```mod
int x = not 5  ! 0101 (= 5) -> 1010 (= 10)

bool y = not 1  ! 1 -> 0
```
### 5-13. equality operation
#### 5-13-1. Syntax
```mod
expr is expr
```
#### 5-13-2. Example
```mod
bool x = (typeof(1.2) is float)  ! bool x = 1
```
### 5-14. inequality operation
#### 5-14-1. Syntax
```mod
expr < expr

expr > expr

expr <= expr

expr >= expr
```
#### 5-14-2. Example
```mod
10 > 2
```
### 5-15. access operation
#### 5-15-1. Syntax
```mod
ident : ident
```
#### 5-15-2. Example
```mod
int s = new [5]{0}

s:push(69)
```
### 5-16. bit-width operation
|signed|unsigned|
|:---|:---|
|`8`|`u8`|
|`16`|`u16`|
|`32`|`u32`|
|`64`|`u64`|
|`A` (any)|`uA`|
`<15>` -> `<16>`, `<u53>` -> `<u64>`
#### 5-16-1. Syntax
```mod
type<expr>
```
> differs from `tef ident <ident>`.
#### 5-16-2. Example
```mod
int<32> value = 37
```
### 5-17. shift operation
#### 5-17-1. Syntax
```mod
expr << expr

expr >> expr
```
#### 5-17-2. Example
```mod
int result = 40 << 3  ! int result = 5
```
### 5-18. overlay operation
#### 5-18-1. Syntax
```mod
~ ident
```
#### 5-18-2. Example
```mod
int<16> x = 40000

int y = ~x
! y is a 32 bit integer
```
## 6. Controls
<a id="controls"></a>
a
### 6-1. Conditional branching
#### 6-1-1. Syntax
```mod
if expr
  body
end
```
#### 6-1-2. Example
```mod
bool x = 1
bool y = 0
if x and y is 1
  print("No")
end
if x or y is 1
  print("Yes")
end
```
### 6-2. Iteration control
It loops until `if-break` statement is logically true. `if-continue` statement is 
#### 6-2-1. Syntax
```mod
loop
  body
end
```
#### 6-2-2. Example
```mod
int i; int<u16> result;

int list1 = new [4]{1, 4, 3, 6}
int list2 = new [4]{2, 3, 7, 1}

loop
  if i > sizeof(list1)
    break
  end
  result += (list1[i] * list2[i])
  i += 1
end
```
## 7. Namespaces
<a id="namespaces"></a>
type definition (struct), namespace
### 7-1. Syntax
```mod
tef ident <ident, ident, ...>
  body
end
```
### 7-2. Example
```mod
tef Matrix<T>
  int rows = 0
  int cols = 0
  T data = new [rows][cols]{0}
  def transpose () -> Matrix<T>
end

Matrix<float> : transpose ()
  ret new [cols][rows]{0}
```
## 8. Standard Library
<a id="stdlibs"></a>
a
### 8-1. Syntax
```mod
import identifier
```
### 8-2. Example
```mod

```
## 9. Appendix
<a id="appendix"></a>
### 9-1. 
a
