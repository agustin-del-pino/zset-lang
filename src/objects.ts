import {CongruenceSystemNode, expr, NumNode} from "./ast";

export enum ZSObjectType {
    NULL,
    NUMBER,
    BOOLEAN,
    CONGRUENCE_CLASS,
    UNKNOWN,
    FORMULA,
    SET,
    SYSTEM
}

export interface ZSObject {
    type: ZSObjectType;
    hash: string;

    toString(): string;
}

export type ZSNumber = {
    type: typeof ZSObjectType.NUMBER,
    value: number
} & ZSObject;

export type ZSBoolean = {
    type: typeof ZSObjectType.BOOLEAN,
    value: boolean
} & ZSObject;

export type ZSCongruenceClass = {
    type: typeof ZSObjectType.CONGRUENCE_CLASS,
    remainder: ZSNumber,
    modulus: ZSNumber
} & ZSObject;

export type ZSUnknown = {
    type: typeof ZSObjectType.UNKNOWN,
    value: string,
} & ZSObject

export type ZSFormula = {
    type: typeof ZSObjectType.FORMULA,
    unknowns: Set<ZSUnknown>,
    node: expr,
} & ZSObject;

export type ZSSet = {
    type: typeof ZSObjectType.SET,
    elements: Record<string, ZSObject>
    cardinal: number
    hashes: string[];
} & ZSObject;

export type ZSSystem = {
    type: typeof ZSObjectType.SYSTEM,
    system: CongruenceSystemNode,
} & ZSObject;

export type ZSSetElement = ZSNumber | ZSSet | ZSCongruenceClass

export const ZSTrue: ZSBoolean = {
    type: ZSObjectType.BOOLEAN,
    value: true,
    hash: "T1",
    toString(): string {
        return String(this.value);
    }
}

export const ZSFalse: ZSBoolean = {
    type: ZSObjectType.BOOLEAN,
    value: false,
    hash: "T0",
    toString(): string {
        return String(this.value);
    }
}

export const ZSEmpty: ZSSet = ZSSet([]);
export const ZSInfinite: ZSNumber = ZSNumber(Infinity);
export const ZSNull: ZSObject = {
    type: ZSObjectType.NULL,
    hash: "Z0",
    toString(): string {
        return "null";
    }
}

export function ZSNumber(n: number): ZSNumber;
export function ZSNumber(n: NumNode): ZSNumber;
export function ZSNumber(n: any): ZSNumber {
    const obj: ZSNumber = {
        type: ZSObjectType.NUMBER,
        hash: "",
        value: typeof n === typeof 0 ? n as number : Number((n as NumNode).value),
        toString(): string {
            return String(this.value);
        }
    }
    obj.hash = hashObject(obj)
    return obj;
}

export function ZSBoolean(v: boolean): ZSBoolean {
    return v ? ZSTrue : ZSFalse;
}

export function ZSCongruenceClass(r: ZSNumber, m: ZSNumber): ZSCongruenceClass {
    const obj: ZSCongruenceClass = {
        type: ZSObjectType.CONGRUENCE_CLASS,
        remainder: r,
        modulus: m,
        hash: "",
        toString(): string {
            return `[${this.remainder}] (mod ${m})`;
        }
    }
    obj.hash = hashObject(obj)
    return obj;
}

export function ZSUnknown(v: string): ZSUnknown {
    const obj: ZSUnknown = {
        type: ZSObjectType.UNKNOWN,
        value: v,
        hash: "",
        toString(): string {
            return this.value;
        }
    }
    obj.hash = hashObject(obj);
    return obj
}

export function ZSFormula(e: expr, ...u: ZSUnknown[]): ZSFormula {
    const obj: ZSFormula = {
        type: ZSObjectType.FORMULA,
        hash: "",
        unknowns: new Set<ZSUnknown>(u),
        node: e,
        toString(): string {
            return `f(${Array.from(this.unknowns).map(u=>u.toString()).join(", ")}): ${this.node}`;
        }
    }

    obj.hash = hashObject(obj);
    return obj;

}

export function ZSSet(e: ZSSetElement[]): ZSSet {
    const obj: ZSSet = {
        type: ZSObjectType.SET,
        elements: e.reduce((p, c) => ({...p, [c.hash]: c}), {}),
        cardinal: e.length,
        hash: "",
        hashes: [],
        toString(): string {
            return `{Set: ${this.cardinal}}`;
        }
    }

    obj.hash = hashObject(obj);
    obj.hashes = Object.keys(obj.elements);
    return obj;
}

export function ZSSystem(s: CongruenceSystemNode): ZSSystem {
    const obj: ZSSystem = {
        type: ZSObjectType.SYSTEM,
        hash: "",
        system: s,
        toString(): string {
            return `{[${this.system.unknown.value}: ${s.congruences.length}]}`;
        }
    }

    obj.hash = hashObject(obj);
    return obj;
}

function hashObject(n: ZSObject): string {
    switch (n.type) {
        case ZSObjectType.NULL:
            return "Z0";
        case ZSObjectType.NUMBER:
            return `N${(n as ZSNumber).value}`;
        case ZSObjectType.BOOLEAN:
            return n === ZSTrue ? "B1" : "B0";
        case ZSObjectType.SET:
            return `S${(n as ZSSet).cardinal}${Object.keys((n as ZSSet).elements).join("|")}`
        case ZSObjectType.CONGRUENCE_CLASS:
            return `C${hashObject((n as ZSCongruenceClass).remainder)}M${hashObject((n as ZSCongruenceClass).modulus)}`;
        case ZSObjectType.UNKNOWN:
            return `U${(n as ZSUnknown).value}`
        case ZSObjectType.SYSTEM:
            return `Y${(n as ZSSystem).system.unknown.value}`
        case ZSObjectType.FORMULA:
            return `F${(n as ZSFormula).unknowns.size}${Array.from((n as ZSFormula).unknowns).map(e => e.toString()).join("")}`;
    }
}
