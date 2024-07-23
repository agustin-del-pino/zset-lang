import { AssigmentNode, BinaryNode, CongruenceClassNode, CongruenceNode, CongruenceSystemNode, DirectiveNode, ForAllNode, IdentNode, IndexNode, node, NodeType, NumNode, ParenthesisNode, SetNode, SourceNode, UnaryNode } from "./ast";
import { ZSBoolean, ZSCongruenceClass, ZSEmpty, ZSFalse, ZSFormula, ZSInfinite, ZSNull, ZSNumber, ZSObject, ZSObjectType, ZSSet, ZSSetElement, ZSSystem, ZSTrue, ZSUnknown } from "./objects";
import Parser from "./parser";
import Stack from "./stack";
import { TokenType } from "./tokens";

export default class ZSetEngine {
    private readonly parser: Parser;
    private stack: Stack;

    constructor() {
        this.parser = new Parser();
        this.stack = Stack.default();
    }

    private zsTypeOf(x: ZSObject): ZSObjectType {
        return x.type;
    }

    private zsSameType(a: ZSObject, b: ZSObject): boolean {
        return a.type === b.type;
    }

    private zsEqualType(a: ZSObject, t: ZSObjectType): boolean {
        return a.type === t
    }

    private zsEqualSameType(a: ZSObject, b: ZSObject, t: ZSObjectType): boolean {
        return this.zsSameType(a, b) && this.zsEqualType(a, t);
    }

    private zsIsType(a: ZSObject, ...t: ZSObjectType[]): boolean {
        return t.includes(a.type);
    }

    private zsNumberOf(stack: Stack, x: number): ZSNumber {
        return stack.numberOf(x);
    }

    private zsAddition(stack: Stack, a: ZSNumber, b: ZSNumber): ZSNumber {
        return this.zsNumberOf(stack, a.value + b.value);
    }

    private zsSubtraction(stack: Stack, a: ZSNumber, b: ZSNumber): ZSNumber {
        return this.zsNumberOf(stack, a.value - b.value);
    }

    private zsMultiplication(stack: Stack, a: ZSNumber, b: ZSNumber): ZSNumber {
        return this.zsNumberOf(stack, a.value * b.value);
    }

    private zsModulo(stack: Stack, a: ZSNumber, b: ZSNumber): ZSNumber {
        const x = a.value < 0 ? a.value + b.value : a.value;
        return this.zsNumberOf(stack, x % b.value);
    }

    private zsPower(stack: Stack, a: ZSNumber, b: ZSNumber): ZSNumber {
        return this.zsNumberOf(stack, a.value ** b.value);
    }

    private zsGCD(stack: Stack, a: ZSNumber, b: ZSNumber): ZSNumber {
        let zero = stack.numberOf(0);
        while (this.zsEqualObjects(b, zero) === ZSFalse) {
            let c = b;
            b = this.zsModulo(stack, a, b);
            a = c;
        }
        return a;
    }

    private zsCongruenceClass(stack: Stack, r: ZSNumber, m: ZSNumber): ZSCongruenceClass {
        return ZSCongruenceClass(this.zsModulo(stack, r as ZSNumber, m as ZSNumber), m as ZSNumber);
    }

    private zsAdditionCongruence(stack: Stack, a: ZSCongruenceClass, b: ZSCongruenceClass): ZSCongruenceClass {
        return this.zsCongruenceClass(stack, this.zsAddition(stack, a.remainder, b.remainder), a.modulus);
    }

    private zsSubtractionCongruence(stack: Stack, a: ZSCongruenceClass, b: ZSCongruenceClass): ZSCongruenceClass {
        return this.zsCongruenceClass(stack, this.zsSubtraction(stack, a.remainder, b.remainder), a.modulus);
    }

    private zsMultiplicationCongruence(stack: Stack, a: ZSCongruenceClass, b: ZSCongruenceClass): ZSCongruenceClass {
        return this.zsCongruenceClass(stack, this.zsMultiplication(stack, a.remainder, b.remainder), a.modulus);
    }

    private zsPowerCongruence(stack: Stack, a: ZSCongruenceClass, b: ZSCongruenceClass): ZSCongruenceClass {
        return this.zsCongruenceClass(stack, this.zsPower(stack, a.remainder, b.remainder), a.modulus);
    }

    private zsCompositionCongruence(stack: Stack, a: ZSCongruenceClass, b: ZSCongruenceClass): ZSCongruenceClass {
        return this.zsCongruenceClass(stack,
            this.zsAddition(stack, this.zsMultiplication(stack, b.remainder, a.modulus), a.remainder),
            this.zsMultiplication(stack, a.modulus, b.modulus)
        );
    }

    private zsNeg(stack: Stack, n: ZSNumber): ZSNumber {
        return this.zsNumberOf(stack, -1 * n.value);
    }

    private zsNot(stack: Stack, b: ZSBoolean): ZSBoolean {
        if (b === ZSTrue) {
            return ZSFalse;
        }
        return ZSTrue;
    }

    private zsCardinal(stack: Stack, s: ZSSet | ZSCongruenceClass): ZSNumber {
        if (this.zsEqualType(s, ZSObjectType.CONGRUENCE_CLASS)) {
            return ZSInfinite;
        }
        return this.zsNumberOf(stack, (s as ZSSet).cardinal);
    }

    private zsEqualObjects(a: ZSObject, b: ZSObject): ZSBoolean {
        return ZSBoolean(a.hash === b.hash);
    }

    private zsCongruence(stack: Stack, a: ZSNumber, b: ZSNumber, m: ZSNumber): ZSBoolean {
        return this.zsEqualObjects(this.zsModulo(stack, a, m), this.zsModulo(stack, b, m));
    }

    private zsSingleFindCongruence(stack: Stack, a: ZSUnknown, b: ZSNumber, m: ZSNumber, fn: () => ZSNumber): ZSSet {
        const cong: ZSCongruenceClass[] = [];

        for (let i = 0; i < m.value; i++) {
            const x = stack.store(a.value, this.zsNumberOf(stack, i)) as ZSNumber;
            const num = fn();
            if (this.zsCongruence(stack, num, b, m) === ZSTrue) {
                cong.push(ZSCongruenceClass(x, m));
            }
        }

        return ZSSet(cong);
    }

    private zsInCongruenceClass(stack: Stack, a: ZSNumber, b: ZSCongruenceClass): ZSBoolean {
        return this.zsCongruence(stack, a, b.remainder, b.modulus);
    }

    private zsInSet(stack: Stack, a: ZSObject, b: ZSSet): ZSBoolean {
        return ZSBoolean(Object.hasOwn(b.elements, a.hash));
    }

    private zsExtSet(stack: Stack, s: ZSSet): ZSObject[] {
        return Object.values(s.elements);
    }

    private zsIndexCongruenceClass(stack: Stack, i: ZSNumber, c: ZSCongruenceClass): ZSNumber {
        return this.zsAddition(stack, c.remainder, this.zsMultiplication(stack, c.modulus, i))
    }

    private zsIndexSet(stack: Stack, i: ZSNumber, s: ZSSet): ZSObject {
        return s.elements[s.hashes[i.value]] || ZSNull;
    }

    private zsResolveSystem(stack: Stack, c: ZSSystem): ZSObject {
        if (c.system.congruences.length === 0) {
            return ZSEmpty;
        }

        if (c.system.congruences.length === 1) {
            let ret = this.evalCongruence(stack, c.system.congruences[0]);
            if (this.zsEqualType(ret, ZSObjectType.BOOLEAN)) {
                throw new Error("there is no 'unknown' to resolve");
            }
            return ret as ZSSet;
        }
        
        const s = new Stack(stack);
        const tcr = this.zsTCR(s, c.system.congruences.map((cong) => {
            const mod = this.evaluate(s, cong.mod);
            if (!this.zsEqualType(mod, ZSObjectType.NUMBER)) {
                throw new Error("the modulus value must be a number")
            }
            return mod as ZSNumber;
        }));

        if (tcr === ZSFalse) {
            throw new Error("there is no unique solution because the modulus of the congruence aren't co-primes");
        }


        let u = c.system.unknown.value;
        const classes: ZSCongruenceClass[] = [];
        const zero = stack.numberOf(0);
        for (let i = 0; i < c.system.congruences.length; i++) {
            const ret = this.evalCongruence(s, c.system.congruences[i]);
            if (this.zsEqualType(ret, ZSObjectType.BOOLEAN)) {
                throw new Error("there is no 'unknown' to resolve");
            }

            if (this.zsEqualObjects(ret, ZSEmpty) === ZSTrue) {
                return ret as ZSSet;
            }

            const cong: ZSCongruenceClass = this.zsIndexSet(s, zero, ret as ZSSet) as ZSCongruenceClass;
            const cls = Stack.unique(c.system.unknown.value.toUpperCase())
            const id = u;
            u = Stack.unique(c.system.unknown.value);

            s.store(cls, cong);
            this.evaluate(s, this.parser.parse(`${id} = ((mod ${cls})*${u})+(rem ${cls})`));
            classes.push(cong);
        }

        return ZSSet([
            classes.slice(1)
                .reduce((a, b) => this.zsCompositionCongruence(s, a, b), classes[0])
        ]);
    }

    private zsForallSet(stack: Stack, a: ZSSet, fn: (s: Stack, e: ZSObject) => ZSBoolean): ZSBoolean {
        const s = new Stack(stack);
        for (const elm of this.zsExtSet(s, a)) {
            if (fn(s, elm) === ZSFalse) {
                return ZSFalse;
            }
        }
        return ZSTrue;
    }

    private zsForallSystem(stack: Stack, a: ZSSystem, fn: (s: Stack, sys: ZSSystem, i: number) => ZSBoolean): ZSBoolean {
        const s = new Stack(stack);
        for (let i = 0; i < a.system.congruences.length; i++) {
            if (fn(s, a, i) === ZSFalse) {
                return ZSFalse;
            }
        }
        return ZSTrue;
    }

    private zsTCR(stack: Stack, n: ZSNumber[]): ZSBoolean {
        const one = stack.numberOf(1);
        for (let i = 0; i < n.length; i++) {
            for (let j = i + 1; j < n.length; j++) {
                if (this.zsEqualObjects(this.zsGCD(stack, n[i], n[j]), one) === ZSFalse) {
                    return ZSFalse;
                }
            }
        }
        return ZSTrue;
    }

    private zsDirective(stack: Stack, n: string, args: ZSObject[]) {
        switch (n) {
            case "print":
                args.forEach(arg => {
                    console.log(arg.toString());
                });
                return;
            case "ext":
                args.forEach(arg => {
                    if (!this.zsEqualType(arg, ZSObjectType.SET)) {
                        throw new Error("ext directive only accepts sets");
                    }
                    console.log(`{${this.zsExtSet(stack, arg as ZSSet).map(o => o.toString()).join(", ")}}`);
                });
                return;
            case "tcr":
                console.log(this.zsTCR(stack, args.map(arg => {
                    if (!this.zsEqualType(arg, ZSObjectType.NUMBER)) {
                        throw new Error("tcr directive only accepts numbers");
                    }
                    return arg as ZSNumber;
                })).toString())
                return;
            default:
                throw new Error(`the "${n}" directive doesn't exist`);
        }
    }


    private evalIdent(stack: Stack, x: IdentNode): ZSObject {
        const obj = stack.get(x.value);
        if (obj === undefined) {
            return ZSFormula(x, ZSUnknown(x.value));
        }
        if (this.zsEqualType(obj, ZSObjectType.FORMULA)) {
            return this.evaluate(stack, (obj as ZSFormula).node);
        }
        return obj;
    }

    private evalNumber(stack: Stack, x: NumNode): ZSNumber {
        return this.zsNumberOf(stack, Number(x.value))
    }

    private evalParenthesis(stack: Stack, x: ParenthesisNode): ZSObject {
        return this.evaluate(stack, x.expr);
    }

    private evalUnary(stack: Stack, x: UnaryNode): ZSObject {
        const obj = this.evaluate(stack, x.expr);

        if (this.zsEqualType(obj, ZSObjectType.UNKNOWN)) {
            return ZSFormula(x, obj as ZSUnknown);
        }

        switch (x.op) {
            case TokenType.NOT:
                if (!this.zsEqualType(obj, ZSObjectType.BOOLEAN)) {
                    throw new Error(`the "not" operator is only allowed for booleans`);
                }
                return this.zsNot(stack, obj as ZSBoolean);
            case TokenType.CARDINAL:
                if (!this.zsIsType(obj, ZSObjectType.CONGRUENCE_CLASS, ZSObjectType.SET)) {
                    throw new Error(`the "#" operator is only allowed for set-like types`);
                }
                return this.zsCardinal(stack, obj as (ZSCongruenceClass | ZSSet))
            case TokenType.SUB:
                if (!this.zsEqualType(obj, ZSObjectType.NUMBER)) {
                    throw new Error(`the "-" operator is only allowed for numbers`);
                }
                return this.zsNeg(stack, obj as ZSNumber);
            case TokenType.MOD:
                if (!this.zsEqualType(obj, ZSObjectType.CONGRUENCE_CLASS)) {
                    throw new Error(`the "mod" operator is only allowed for congruence class types`);
                }
                return (obj as ZSCongruenceClass).modulus;
            case TokenType.REM:
                if (!this.zsEqualType(obj, ZSObjectType.CONGRUENCE_CLASS)) {
                    throw new Error(`the "rem" operator is only allowed for congruence class types`);
                }
                return (obj as ZSCongruenceClass).remainder;
            case TokenType.RES:
                if (!this.zsEqualType(obj, ZSObjectType.SYSTEM)) {
                    throw new Error(`the "res" operator is only allowed for system of congruence equations`);
                }
                return this.zsResolveSystem(stack, (obj as ZSSystem));
            default:
                throw new Error(`invalid operator: ${x.value}`);
        }
    }

    private evalBinary(stack: Stack, x: BinaryNode): ZSObject {
        const left = this.evaluate(stack, x.left);
        const right = this.evaluate(stack, x.right);

        if (x.op === TokenType.EQUAL) {
            return this.zsEqualObjects(left, right);
        }

        if (x.op === TokenType.IN) {
            switch (this.zsTypeOf(right)) {
                case ZSObjectType.SET:
                    return this.zsInSet(stack, left, right as ZSSet);
                case ZSObjectType.CONGRUENCE_CLASS:
                    if (!this.zsEqualType(left, ZSObjectType.NUMBER)) {
                        throw new Error(`the left side of 'in' operator for congruence class must have a number`);
                    }
                    return this.zsInCongruenceClass(stack, left as ZSNumber, right as ZSCongruenceClass);
                default:
                    throw new Error(`the right side of 'in' operator must be a set-like type`);
            }
        }

        if (this.zsEqualSameType(left, right, ZSObjectType.FORMULA)) {
            const z = { ...x };
            z.left = { ...(left as ZSFormula).node };
            z.right = { ...(right as ZSFormula).node };
            return ZSFormula(z, ...[...(left as ZSFormula).unknowns, ...(right as ZSFormula).unknowns]);
        } else if (this.zsEqualType(left, ZSObjectType.FORMULA) && this.zsEqualType(right, ZSObjectType.NUMBER)) {
            const z = { ...x };
            z.left = { ...(left as ZSFormula).node };
            return ZSFormula(z, ...(left as ZSFormula).unknowns);
        } else if (this.zsEqualType(right, ZSObjectType.FORMULA)) {
            const z = { ...x };
            z.right = { ...(right as ZSFormula).node };
            return ZSFormula(x, ...(right as ZSFormula).unknowns);
        }

        if (!this.zsSameType(left, right)) {
            throw new Error("both side of binary operation must have the same type");
        }

        if (this.zsEqualType(left, ZSObjectType.CONGRUENCE_CLASS)) {
            if (x.op === TokenType.COMPOSITION) {
                return this.zsCompositionCongruence(stack, (left as ZSCongruenceClass), (right as ZSCongruenceClass));
            }
            if (this.zsEqualObjects((left as ZSCongruenceClass).modulus, (right as ZSCongruenceClass).modulus) === ZSFalse) {
                throw new Error("both congruence class must have the same modulus");
            }
            switch (x.op) {
                case TokenType.ADD:
                    return this.zsAdditionCongruence(stack, (left as ZSCongruenceClass), (right as ZSCongruenceClass))
                case TokenType.SUB:
                    return this.zsSubtractionCongruence(stack, (left as ZSCongruenceClass), (right as ZSCongruenceClass))
                case TokenType.MUL:
                    return this.zsMultiplicationCongruence(stack, (left as ZSCongruenceClass), (right as ZSCongruenceClass))
                case TokenType.POW:
                    return this.zsPowerCongruence(stack, (left as ZSCongruenceClass), (right as ZSCongruenceClass))
                default:
                    throw new Error(`the ${x.value} is not a valid operation for congruence classes`);
            }
        }

        if (this.zsEqualType(left, ZSObjectType.NUMBER)) {
            switch (x.op) {
                case TokenType.ADD:
                    return this.zsAddition(stack, left as ZSNumber, right as ZSNumber)
                case TokenType.SUB:
                    return this.zsSubtraction(stack, left as ZSNumber, right as ZSNumber)
                case TokenType.MUL:
                    return this.zsMultiplication(stack, left as ZSNumber, right as ZSNumber)
                case TokenType.MOD:
                    return this.zsModulo(stack, left as ZSNumber, right as ZSNumber)
                case TokenType.POW:
                    return this.zsPower(stack, left as ZSNumber, right as ZSNumber)
                case TokenType.GCD:
                    return this.zsGCD(stack, left as ZSNumber, right as ZSNumber)
                default:
                    throw new Error(`the ${x.value} is not a valid operation for numbers`);
            }
        }

        throw new Error("invalid type for binary operation");
    }

    private evalAssignment(stack: Stack, x: AssigmentNode): ZSObject {
        return stack.store(x.name.value, this.evaluate(stack, x.assigned));
    }

    private evalCongruence(stack: Stack, x: CongruenceNode): ZSObject {
        const left = this.evaluate(stack, x.left);
        const right = this.evaluate(stack, x.right);

        const mod = this.evaluate(stack, x.mod);

        if (!this.zsEqualType(mod, ZSObjectType.NUMBER)) {
            throw new Error("the modulo value must be a number")
        }


        if (this.zsEqualSameType(left, right, ZSObjectType.NUMBER)) {
            return this.zsCongruence(stack, left as ZSNumber, right as ZSNumber, mod as ZSNumber);
        }

        const s = new Stack(stack);

        let formula: ZSFormula, known: ZSNumber;

        if (this.zsEqualType(left, ZSObjectType.FORMULA)) {
            formula = left as ZSFormula;
            known = right as ZSNumber;
        } else {
            formula = right as ZSFormula;
            known = left as ZSNumber;
        }

        const unknowns = Array.from(formula.unknowns);

        if (unknowns.length > 1) {
            throw new Error("cannot resolve congruence with more than one unknown")
        }

        if (formula.node.type === NodeType.IDENT) {
            return ZSSet([this.zsCongruenceClass(stack, known, mod as ZSNumber)]);
        }

        return this.zsSingleFindCongruence(s, unknowns[0], known, mod as ZSNumber, () => {
            const x = this.evaluate(s, formula.node);

            if (!this.zsEqualType(x, ZSObjectType.NUMBER)) {
                throw new Error("one side of the congruence cannot be result into a number");
            }

            return x as ZSNumber;
        });
    }

    private evalCongruenceClass(stack: Stack, x: CongruenceClassNode): ZSCongruenceClass {
        const r = this.evaluate(stack, x.remainder);

        if (!this.zsEqualType(r, ZSObjectType.NUMBER)) {
            throw new Error("the remainder value must be a number")
        }

        const m = this.evaluate(stack, x.modulus);

        if (!this.zsEqualType(m, ZSObjectType.NUMBER)) {
            throw new Error("the modulus value must be a number")
        }

        return this.zsCongruenceClass(stack, this.zsModulo(stack, r as ZSNumber, m as ZSNumber), m as ZSNumber);
    }

    private evalSet(stack: Stack, x: SetNode): ZSSet {
        if (x.elements.length === 0) {
            return ZSEmpty;
        }

        const e: ZSSetElement[] = [];

        for (const elm of x.elements) {
            const obj = this.evaluate(stack, elm);
            switch (obj.type) {
                case ZSObjectType.NUMBER:
                    e.push(obj as ZSNumber);
                    break;
                case ZSObjectType.CONGRUENCE_CLASS:
                    e.push(obj as ZSCongruenceClass);
                    break;
                case ZSObjectType.SET:
                    e.push(obj as ZSSet);
                    break;
                default:
                    throw new Error("invalid type set's element");
            }
        }

        return ZSSet(e);
    }

    private evalIndex(stack: Stack, x: IndexNode): ZSObject {
        const s = this.evaluate(stack, x.expr);
        const i = this.evaluate(stack, x.index);

        if (!this.zsEqualType(i, ZSObjectType.NUMBER)) {
            throw new Error("the index value must be a number");
        }

        if (!this.zsIsType(s, ZSObjectType.CONGRUENCE_CLASS, ZSObjectType.SET)) {
            throw new Error("only set-like types are allowed to access them with an index")
        }

        if (this.zsEqualType(s, ZSObjectType.CONGRUENCE_CLASS)) {
            return this.zsIndexCongruenceClass(stack, i as ZSNumber, s as ZSCongruenceClass);
        }

        return this.zsIndexSet(stack, i as ZSNumber, s as ZSSet);
    }

    private evalCongruenceSystem(stack: Stack, x: CongruenceSystemNode): ZSObject {
        return ZSSystem(x);
    }

    private evalForAll(stack: Stack, x: ForAllNode): ZSBoolean {
        const iter = this.evaluate(stack, x.iterator);

        if (this.zsEqualType(iter, ZSObjectType.SET)) {
            return this.zsForallSet(stack, iter as ZSSet, (s, e) => {
                s.store(x.variable.value, e);
                const ret = this.evaluate(s, x.verify[0]);
                if (!this.zsEqualType(ret, ZSObjectType.BOOLEAN)) {
                    throw new Error("only boolean results are allowed at forall verification");
                }
                return ret as ZSBoolean;
            })
        } else if (this.zsEqualType(iter, ZSObjectType.SYSTEM)) {
            return this.zsForallSystem(stack, iter as ZSSystem, (s, sys, i) => {
                s.store(x.variable.value, this.evalCongruence(s, sys.system.congruences[i]));
                const ret = this.evaluate(s, x.verify[0]);
                if (!this.zsEqualType(ret, ZSObjectType.BOOLEAN)) {
                    throw new Error("only boolean results are allowed at forall verification");
                }
                return ret as ZSBoolean;
            })
        }

        throw new Error("the object is not iterable");
    }

    private evalDirective(stack: Stack, x: DirectiveNode) {
        this.zsDirective(stack, x.name.value, x.args.map(arg => this.evaluate(stack, arg)));
    }

    private evalSource(stack: Stack, x: SourceNode): ZSObject {
        let ret: ZSObject = ZSNull;
        for (let e of x.expressions) {
            ret = this.evaluate(stack, e);
        }
        for (let e of x.directives) {
            this.evalDirective(stack, e);
        }
        return ret;
    }



    private evaluate(stack: Stack, node: node): ZSObject {
        switch (node.type) {
            case NodeType.IDENT:
                return this.evalIdent(stack, node as IdentNode);
            case NodeType.NUM:
                return this.evalNumber(stack, node as NumNode);
            case NodeType.PARENTHESIS:
                return this.evalParenthesis(stack, node as ParenthesisNode);
            case NodeType.UNARY:
                return this.evalUnary(stack, node as UnaryNode);
            case NodeType.BINARY:
                return this.evalBinary(stack, node as BinaryNode);
            case NodeType.ASSIGMENT:
                return this.evalAssignment(stack, node as AssigmentNode);
            case NodeType.CONGRUENCE:
                return this.evalCongruence(stack, node as CongruenceNode);
            case NodeType.CONGRUENCE_CLASS:
                return this.evalCongruenceClass(stack, node as CongruenceClassNode);
            case NodeType.SET:
                return this.evalSet(stack, node as SetNode);
            case NodeType.INDEX:
                return this.evalIndex(stack, node as IndexNode);
            case NodeType.CONGRUENCE_SYSTEM:
                return this.evalCongruenceSystem(stack, node as CongruenceSystemNode);
            case NodeType.FORALL:
                return this.evalForAll(stack, node as ForAllNode);
            case NodeType.DIRECTIVE:
                this.evalDirective(stack, node as DirectiveNode);
                return ZSNull;
            case NodeType.SOURCE:
                return this.evalSource(stack, node as SourceNode);
            default:
                throw new Error("invalid node");
        }
    }

    public clear() {
        this.stack = Stack.default();
    }
    public eval(code: string): ZSObject {
        const n = this.parser.parse(code);
        return this.evaluate(this.stack, n);
    }
    public exec(code: string): void {
        this.eval(code);
    }
}