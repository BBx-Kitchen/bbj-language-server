// Monarch syntax highlighting for the bbj language.
export default {
    keywords: [
        'ADDR','AND','BREAK','BYE','CASE','CLASS','CLASSEND','CLIPFROMSTR','CLOSE','CONTINUE','DEFAULT','DIM','ELSE','END','ENDIF','ERR','EXIT','EXITTO','EXTENDS','EXTRACT','FI','FIELD','FIND','FOR','GOSUB','GOTO','IF','IMPLEMENTS','INPUT','INTERFACE','INTERFACEEND','LET','METHOD','METHODEND','METHODRET','MLTHEN','MODE','NEXT','OPEN','OR','PRINT','PRIVATE','PROCESS_EVENTS','PROTECTED','PUBLIC','READ','RECORD','RELEASE','RETURN','SETERR','SLTHEN','SQLCLOSE','SQLEXEC','SQLOPEN','SQLPREP','STATIC','STEP','SWEND','SWITCH','THROW','TO','WAIT','WEND','WHILE','WRITE','auto','declare','library','new','use','var'
    ],
    operators: [
        '!','#','*','+',',','-','.','/',':',';','<','<=','<>','=','>','>=','?','^'
    ],
    symbols:  /!|#|\(|\)|\*|\+|,|-|\.|\/|:|;|<|<=|<>|=|>|>=|\?|\[|\]|\^/,

    tokenizer: {
        initial: [
            { regex: /([rR][eE][mM])([ \t][^\n\r]*)?[\n\r]+/, action: {"token":"COMMENT"} },
            { regex: /_endline_print_comma/, action: {"token":"ENDLINE_PRINT_COMMA"} },
            { regex: /_next/, action: {"token":"NEXT_TOKEN"} },
            { regex: /_methodret_end/, action: {"token":"METHODRET_END"} },
            { regex: /::.*::/, action: {"token":"BBjFilePath"} },
            { regex: /[_a-zA-Z][\w_]*(!|\$|%)/, action: {"token":"ID_WITH_SUFFIX"} },
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { regex: /[0-9]+(\.[0-9]*)?/, action: {"token":"number"} },
            { regex: /"([^"]|"{2})*"/, action: {"token":"string"} },
            { regex: /\$[0-9a-fA-F]*\$/, action: {"token":"HEX_STRING"} },
            { regex: /'[0-9A-Z_]*'/, action: {"token":"MNEMONIC"} },
            { regex: /\/@@[\s\S]*?@\//, action: {"token":"DOCU"} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
        ],
        comment: [
        ],
    }
};
