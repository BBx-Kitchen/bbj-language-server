export const builtinFunctions = `
library

/@@
#### Syntax
\`ASC(string{,ERR=lineref})\`

#### Description

The **ASC()** function returns the ASCII numeric value of the first character in a string.
@/
ASC(param=string, ERR?=lineref): int

/@@
\`CHR(int{,ERR=lineref})\`

The CHR() function returns the ASCII value of an integer.
@/
CHR(param=int, ERR?=lineref): string

/@@
The NULL() function returns a Java null value. It is typically used to check for a null value returned from a Java function.
@/
NULL():string

/@@
\`STR(objexpr{:mask}{,ERR=lineref})\`
 
 In BBj, the STR() function accepts arguments of any type. If the argument evaluates to a number, STR(num) is used, otherwise STR(str) is used.
 BBj STR() function supports the 'U' mask character.
@/
STR(objexpr=string, ERR?=lineref): string
`.trimLeft();