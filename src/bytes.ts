export type byte = number

export const
    EOF: byte = 0x00,
    SPC: byte = Byte(" "),
    NWL: byte = Byte("\n"),
    ZERO: byte = 0x30,
    ONE: byte = ZERO + 1,
    NINE: byte = ZERO + 9,
    UP_A = Byte("A"),
    UP_Z = Byte("Z"),
    LOW_A = Byte("a"),
    LOW_Z = Byte("z"),
    UND_S = Byte("_"),
    MINUS = Byte("-"),
    LEFT_C = Byte("{"),
    RIGHT_C = Byte("}"),
    LEFT_B = Byte("["),
    RIGHT_B = Byte("]");

/**
 * Converts ch into byte.
 * @param ch a single char string.
 */
export function Byte(ch: string): byte {
    return ch.charCodeAt(0);
}

/**
 * Byte array.
 */
class Bytes {
    private readonly buffer: Uint8Array;

    constructor(s: string) {
        this.buffer = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) {
            this.buffer[i] = Byte(s[i]);
        }
    }

    /**
     * Checks if the byte at p position is the b byte.
     * @param p is the position of the byte.
     * @param b is the byte.
     */
    is(p: number, b: byte): boolean {
        return this.buffer[p] === b;
    }

    /**
     * Returns the byte at p. When p < 0, starts from the end of the array.
     * @param p is the position.
     */
    at(p: number): byte {
        if (p < 0) {
            return this.buffer[this.buffer.length + p];
        }
        return this.buffer[p];
    }

    /**
     * Check if the byte at p position is in range of s byte and e byte (both, included).
     * @param p is the position.
     * @param s is the start byte of the range.
     * @param e is the end byte of the range.
     */
    rangeOf(p: number, s: byte, e: byte): boolean {
        return this.buffer[p] >= s && this.buffer[p] <= e;
    }
}

/**
 * Represents a string as byte array with null termination.
 */
export class StringBytes extends Bytes {
    constructor(s: string) {
        super(s + "\x00");
    }

    /**
     * Checks if the byte at p position is EOF.
     * @param p is the byte position.
     */
    isEOF(p: number): boolean {
        return this.is(p, EOF);
    }

    /**
     * Returns the byte at p position as string.
     * @param p
     */
    toChar(p: number): string {
        return String.fromCharCode(this.at(p))
    }
}