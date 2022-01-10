class token {
    constructor(name, value, line, colmn) {
        this.name = name;
        this.value = value;
        this.line = line;
        this.colmn = colmn;
    }
}
class lexer {
    constructor(content) {
        this.content = content;
        this.tokens = [];
        this.index = 0;
        this.line = 0;
        this.colmn = 0;
        this.currentChar = ' ';
    }
    next() {
        this.index += 1;
        this.colmn += 1;
        this.currentChar = this.content[this.index];
    }
    addToken(token) {
        this.tokens.push(token);
    }
    parseId() {

    }
    parseNum() {

    }
    parseString() {

    }
    checkToken() {
        switch (this.currChar()) {
            case '\n':
                this.line += 1;
                this.colmn = 0;
                break;
            case '+':
                this.addToken(new token());
                break;
            case '-':
                break;
            case '/':
                break;
            case '*':
                break;
            case '<':
                break;
            case '>':
                break;
        }
    }
    currChar() {
        return this.currentChar;
    }
    start(){
        for (let char in this.content) {
            console.log(char);
        }
    }
}
