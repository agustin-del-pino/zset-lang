import {ZSEmpty, ZSFalse, ZSInfinite, ZSNumber, ZSObject, ZSTrue} from "./objects";

export default class Stack {
    private outer?: Stack;
    private readonly constants: Record<string, ZSObject>;
    private readonly objects: Record<string, ZSObject>;
    private readonly numbers: Record<number, ZSNumber>;

    constructor(outer?: Stack) {
        this.numbers = outer?.numbers || {};
        this.constants = outer?.constants || {};
        this.objects = {};
        this.outer = outer;
    }

    static default(): Stack {
        const stack: Stack = new Stack();
        stack.const("true", ZSTrue);
        stack.const("false", ZSFalse);
        stack.const("infinity", ZSInfinite);
        stack.const("empty", ZSEmpty);
        stack.numberOf(0);
        return stack;
    }

    store(n: string, o: ZSObject): ZSObject {
        this.objects[n] = o;
        return o;
    }

    static unique(p: string) : string {
        return `${p}${Date.now().toString()}`;
    }

    const(n: string, o: ZSObject): ZSObject {
        this.constants[n] = o;
        return o;
    }

    get(n: string): ZSObject | undefined {
        if (Object.hasOwn(this.constants, n)) {
            return this.constants[n];
        }
        if (!Object.hasOwn(this.objects, n)) {
            return this.outer?.get(n) ?? undefined;
        }
        return this.objects[n];
    }

    numberOf(n: number): ZSNumber {
        if (this.numbers[n] === undefined) {
            this.numbers[n] = ZSNumber(n);
        }
        return this.numbers[n];
    }
}