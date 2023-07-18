export const builtinVariables = `
library

/@@
 ARGC returns the number of user-defined command line arguments passed to PRO/5.
@/
var ARGC: int

/@@
ERR Returns the most recent error value as an integer in the 0 to 255 range.
@/
var ERR: int

/@@
The OPTS variable returns a string containing the current PRO/5 options vector. The options vector is set by the SETOPTS verb. 
@/
var OPTS: string

/@@
The UNT variable returns an unused channel number. This variable is used in standard subroutines and public programs that need to open a file but do not know in advance which channels will be in use when they are called.
@/
var UNT: int

`