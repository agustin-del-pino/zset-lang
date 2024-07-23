import {Byte, byte} from "./bytes";

export enum TokenType {
    EOF, IDENT, NUM, ASSIGN, ADD, SUB, MUL, POW, MOD, CONG,
    LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE, LEFT_CURVY, RIGHT_CURVY,
    LESS, GREATER, COMMA, COLON, NOT, EQUAL, NOT_EQUAL, LE, GE, IN,
    REM, CARDINAL, GCD, RES, DIRECTIVE, FORALL, COMPOSITION, LEFT_SYS, RIGHT_SYS, COMMENT
}

export const Keywords: Record<string, TokenType> = {
    "mod": TokenType.MOD,
    "cong": TokenType.CONG,
    "equal": TokenType.EQUAL,
    "not": TokenType.NOT,
    "in": TokenType.IN,
    "rem": TokenType.REM,
    "gcd": TokenType.GCD,
    "res": TokenType.RES,
    "forall": TokenType.FORALL,
}

export const Unitary: Record<byte, TokenType> = {
    [Byte("=")]: TokenType.ASSIGN,
    [Byte("+")]: TokenType.ADD,
    [Byte("-")]: TokenType.SUB,
    [Byte("*")]: TokenType.MUL,
    [Byte("^")]: TokenType.POW,
    [Byte("#")]: TokenType.CARDINAL,
    [Byte("(")]: TokenType.LEFT_PAREN,
    [Byte(")")]: TokenType.RIGHT_PAREN,
    [Byte("[")]: TokenType.LEFT_BRACE,
    [Byte("]")]: TokenType.RIGHT_BRACE,
    [Byte("{")]: TokenType.LEFT_CURVY,
    [Byte("}")]: TokenType.RIGHT_CURVY,
    [Byte("<")]: TokenType.LESS,
    [Byte(">")]: TokenType.GREATER,
    [Byte(",")]: TokenType.COMMA,
    [Byte(":")]: TokenType.COLON,
    [Byte("@")]: TokenType.DIRECTIVE,
    [Byte("|")]: TokenType.COMPOSITION,
}

/**
 * The minimal lexical expression.
 */
export interface token {
    type: TokenType;
    value: string;
}

/**
 * Creates a new token.
 * @param type is the token's type.
 * @param value is the token's value.
 */
export function Token(type: TokenType, value: string = ""): token {
    return {
        type: type,
        value: value,
    }
}