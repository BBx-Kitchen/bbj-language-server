export const builtinVariables = `
library

/@@
ARGC returns the number of user-defined command line arguments passed to PRO/5.
@/
var ARGC: int

/@@
The CHN variable returns a string of 2-byte binary values corresponding to the channels currently opened by the PRO/5 task. The channel numbers are returned in numeric order.
@/
var CHN: string

/@@
The CTL variable returns a value depending on the field terminator most recently encountered during input from a device or file. The CTL variable is for application programs designed for user-specified action through simple keystrokes.
Each field terminator maps to a particular CTL value, and the developer can modify the recognized terminators and their CTL values. The following table lists the default CTL values. PRO/5 recognizes various field terminators. See the READ verb for additional information.
@/
var CTL: int

/@@
The DAY variable returns the 8-byte string last used in a SETDAY statement or the current system date, if no SETDAY verb was used.
@/
var DAY: int

/@@
The DSZ variable returns the number of unused bytes remaining in the workspace.
@/
var DSZ: int

/@@
ERR Returns the most recent error value as an integer in the 0 to 255 range.
@/
var ERR: int

/@@
The OPTS variable returns a string containing the current PRO/5 options vector. The options vector is set by the SETOPTS verb.
@/
var OPTS: string

/@@
The PFX variable returns the current value set by the PREFIX verb. The string returned will not necessarily be byte-for-byte identical to the string given in a prior PREFIX statement because PRO/5 may remove redundant spaces.
@/
var PFX: string

/@@
The PSZ variable returns the size, in bytes, of the current workspace program (even if executed from a public program).
In BBj 4.0 and higher, PSZ returns the number of lines in the public program.
@/
var PSZ: int

/@@
The REV variable returns a string indicating the language revision level.
@/
var REV: string

/@@
The SQLCHN verb returns a sorted list of the SQL channels currently in use by the PRO/5 process, each as a 2-byte binary string, sorted in ascending order.
@/
var SQLCHN: string

/@@
The SQLUNT verb returns the first available SQL channel not currently in use by the application. This is for standard subroutines and public programs that need to open an SQL channel but do not know in advance which channels are in use when they are called.
The SQLUNT variable is similar to the UNT Variable.
@/
var SQLUNT: int

/@@
The SSN variable returns the system serial number in a 20-byte string.
@/
var SSN: string

/@@
The SYS variable returns an 11-byte string to indicate the current level of the language.
@/
var SYS: string

/@@
The TIM variable returns the system time in hours and fractional hours.
@/
var TIM: num

/@@
The UNT variable returns an unused channel number. This variable is used in standard subroutines and public programs that need to open a file but do not know in advance which channels will be in use when they are called.
@/
var UNT: int

`