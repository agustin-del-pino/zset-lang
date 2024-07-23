import {token, TokenType} from "./tokens";

export enum NodeType {
    SOURCE, IDENT, NUM, UNARY, BINARY, CONGRUENCE, ASSIGMENT, PARENTHESIS,
    CONGRUENCE_CLASS, SET, INDEX, CONGRUENCE_SYSTEM, FORALL, DIRECTIVE
}

export interface node {
    type: NodeType;

    toString(): string;
}

export interface expr extends node {
    value: string;
}

export type UnaryNode = {
    op: TokenType,
    expr: expr,
} & expr;

export type BinaryNode = {
    op: TokenType,
    left: expr,
    right: expr
} & expr;

export type AssigmentNode = {
    name: IdentNode,
    assigned: expr
} & expr

export type ParenthesisNode = {
    expr: expr
} & expr;

export type CongruenceNode = {
    left: expr,
    right: expr,
    mod: ParenthesisNode
} & expr;

export type IdentNode = {
    type: typeof NodeType.IDENT
} & expr;

export type NumNode = {
    type: typeof NodeType.NUM
} & expr;

export type CongruenceClassNode = {
    type: typeof NodeType.CONGRUENCE_CLASS,
    remainder: expr,
    modulus: expr
} & expr;

export type SetNode = {
    type: typeof NodeType.SET,
    elements: expr[]
} & expr;

export type IndexNode = {
    type: typeof NodeType.INDEX,
    expr: expr,
    index: expr,
} & expr;

export type CongruenceSystemNode = {
    type: typeof NodeType.CONGRUENCE_SYSTEM,
    unknown: IdentNode,
    congruences: CongruenceNode[]
} & expr;

export type ForAllNode = {
    type: typeof NodeType.FORALL,
    variable: IdentNode,
    iterator: expr,
    verify: expr[]
} & expr;

export type DirectiveNode = {
    type: typeof NodeType.DIRECTIVE,
    name: IdentNode,
    args: expr[]
} & node;


export type SourceNode = {
    expressions: expr[],
    comments: Record<number, string>,
    directives: DirectiveNode[]
} & node;

export function IdentNode(v: string): IdentNode {
    return {
        type: NodeType.IDENT,
        value: v,
        toString() {
            return this.value;
        }
    }
}

export function NumNode(v: string): NumNode {
    return {
        type: NodeType.NUM,
        value: v,
        toString() {
            return this.value;
        }
    }
}

export function UnaryNode(t: token, x: expr): UnaryNode {
    return {
        type: NodeType.UNARY,
        value: t.value,
        op: t.type,
        expr: x,
        toString() {
            return `${this.value}${this.expr}`;
        }
    }
}

export function BinaryNode(t: token, l: expr, r: expr): BinaryNode {
    return {
        type: NodeType.BINARY,
        value: t.value,
        op: t.type,
        left: l,
        right: r,
        toString() {
            return `${this.left} ${t.value} ${this.right}`;
        }
    }
}

export function AssigmentNode(n: IdentNode, a: expr): AssigmentNode {
    return {
        type: NodeType.ASSIGMENT,
        value: "=",
        name: n,
        assigned: a,
        toString() {
            return `${this.name} = ${this.assigned}`;
        }
    }
}

export function ParenthesisNode(expr: expr): ParenthesisNode {
    return {
        type: NodeType.PARENTHESIS,
        value: "()",
        expr,
        toString() {
            return `(${this.expr})`;
        }
    }
}

export function CongruenceNode(x: expr, y: expr, m: ParenthesisNode): CongruenceNode {
    return {
        type: NodeType.CONGRUENCE,
        value: "cong",
        left: x,
        right: y,
        mod: m,
        toString() {
            return `${this.left} cong ${this.right} ${this.mod}`;
        }
    }
}

export function CongruenceClassNode(r: expr, m: expr): CongruenceClassNode {
    return {
        type: NodeType.CONGRUENCE_CLASS,
        value: "<>",
        remainder: r,
        modulus: m,
        toString: function () {
            return `<${this.remainder}, ${this.modulus}>`;
        }
    }
}

export function SetNode(e: expr[]): SetNode {
    return {
        type: NodeType.SET,
        elements: e,
        value: "{}",
        toString(): string {
            return `{${this.elements.map(e => e.toString()).join(", ")}}`;
        }
    }
}

export function IndexNode(e: expr, i: expr): IndexNode {
    return {
        type: NodeType.INDEX,
        index: i,
        expr: e,
        value: "[]",
        toString(): string {
            return `${this.expr}[${this.index}]`;
        }
    }
}

export function CongruenceSystemNode(u: IdentNode, c: CongruenceNode[]): CongruenceSystemNode {
    return {
        type: NodeType.CONGRUENCE_SYSTEM,
        unknown: u,
        congruences: c,
        value: "{[]}",
        toString(): string {
            return `{[${this.unknown.value}: ${this.congruences.map(e => e.toString()).join(", ")}]}`;
        }
    }
}

export function ForAllNode(n: IdentNode, i: expr, v: expr): ForAllNode {
    return {
        type: NodeType.FORALL,
        variable: n,
        iterator: i,
        value: "forall",
        verify: [v],
        toString(): string {
            return `forall ${this.variable} in ${this.iterator}: ${this.verify[0]}`;
        }

    }
}

export function DirectiveNode(n: IdentNode, a: expr[]): DirectiveNode {
    return {
        type: NodeType.DIRECTIVE,
        name: n,
        args: a,
        toString(): string {
            return `@${this.name} ${this.args.map(v => v.toString()).join(", ")}`;
        }
    }
}

export function SourceNode(x: expr[], d: DirectiveNode[], c: Record<number, string>): SourceNode {
    return {
        type: NodeType.SOURCE,
        expressions: x,
        comments: c,
        directives: d,
        toString() {
            return x.reduce((s, expr,) => `${s}${expr}\n`, "");
        }
    }
}