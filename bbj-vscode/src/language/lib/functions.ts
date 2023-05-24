export const builtinFunctions = `
library

ASC(param=string, ERR?=lineref): int

CHR(param=int, ERR?=lineref): string

/* The NULL() function returns a Java null value. It is typically used to check for a null value returned from a Java function. */
NULL():string

/*
 STR(objexpr{:mask}{,ERR=lineref})
 
 In BBj, the STR() function accepts arguments of any type. If the argument evaluates to a number, STR(num) is used, otherwise STR(str) is used.
 BBj STR() function supports the 'U' mask character.
*/
STR(objexpr=string, ERR?=lineref): string

`.trimLeft();