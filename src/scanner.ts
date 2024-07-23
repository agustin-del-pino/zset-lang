import {
    LEFT_B,
    LEFT_C,
    LOW_A,
    LOW_Z,
    MINUS,
    NINE,
    NWL,
    ONE,
    RIGHT_B,
    RIGHT_C,
    SPC,
    StringBytes,
    UND_S,
    UP_A,
    UP_Z,
    ZERO
} from "./bytes";
import {Keywords, Token, token, TokenType, Unitary} from "./tokens";

/**
 * Provides a tokenizer for create the tokens.
 */
export default class Scanner {
    private src!: StringBytes;
    private pos: number = 0;

    constructor(src: string) {
        this.reset(src);
    }

    /**
     * Resets the Scanner with a new source.
     * @param src
     */
    public reset(src: string) {
        this.pos = 0;
        this.src = new StringBytes(src);
    }

    /**
     * Returns the next token.
     * @throws {Error} whenever the scanned char is unexpected.
     */
    public getToken(): token {
        for (; this.src.is(this.pos, SPC) || this.src.is(this.pos, NWL); this.pos++) {
        }

        if (this.src.isEOF(this.pos)) {
            return Token(TokenType.EOF, "\x00")
        }

        if (this.src.is(this.pos, ZERO)) {
            this.pos++;
            return Token(TokenType.NUM, "0")
        }

        if (this.src.rangeOf(this.pos, ONE, NINE)) {
            const tok = Token(TokenType.NUM)

            for (; this.src.rangeOf(this.pos, ZERO, NINE); this.pos++) {
                tok.value += this.src.toChar(this.pos)
            }

            return tok;
        }

        if (this.src.rangeOf(this.pos, UP_A, UP_Z) ||
            this.src.rangeOf(this.pos, LOW_A, LOW_Z) ||
            this.src.is(this.pos, UND_S)) {
            const tok = Token(TokenType.IDENT)

            for (; this.src.rangeOf(this.pos, UP_A, UP_Z) ||
                   this.src.rangeOf(this.pos, LOW_A, LOW_Z) ||
                   this.src.is(this.pos, UND_S) ||
                   this.src.rangeOf(this.pos, ZERO, NINE); this.pos++) {
                tok.value += this.src.toChar(this.pos)
            }

            if (Object.hasOwn(Keywords, tok.value)) {
                tok.type = Keywords[tok.value];
            }

            return tok
        }

        if (this.src.is(this.pos, MINUS) &&
            this.src.is(this.pos + 1, MINUS) &&
            this.src.is(this.pos + 2, MINUS)) {

            this.pos += 3;

            for (; this.src.is(this.pos, SPC) || this.src.is(this.pos, NWL); this.pos++) {
            }

            const tok = Token(TokenType.COMMENT);

            for (; !(this.src.isEOF(this.pos) ||
                (this.src.is(this.pos, MINUS) &&
                this.src.is(this.pos + 1, MINUS) &&
                this.src.is(this.pos + 2, MINUS))); this.pos++) {
                tok.value += this.src.toChar(this.pos);
            }

            if (this.src.isEOF(this.pos)) {
                throw new Error("the comment was never closed");
            }

            this.pos += 3;

            return tok;
        }

        if (this.src.is(this.pos, LEFT_C) && this.src.is(this.pos + 1, LEFT_B)) {
            this.pos += 2
            return Token(TokenType.LEFT_SYS, "{[");
        }

        if (this.src.is(this.pos, RIGHT_B) && this.src.is(this.pos + 1, RIGHT_C)) {
            this.pos += 2;
            return Token(TokenType.RIGHT_SYS, "]}");
        }

        if (Object.hasOwn(Unitary, this.src.at(this.pos))) {
            this.pos++;
            return Token(Unitary[this.src.at(this.pos - 1)], this.src.toChar(this.pos - 1));
        }

        throw new Error(`unexpected char: ${this.src.toChar(this.pos)}`);
    }
}