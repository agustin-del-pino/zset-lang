import Scanner from "./scanner";
import {token, TokenType} from "./tokens";
import {
    AssigmentNode,
    BinaryNode,
    CongruenceClassNode,
    CongruenceNode,
    CongruenceSystemNode,
    DirectiveNode,
    expr,
    ForAllNode,
    IdentNode,
    IndexNode,
    node,
    NodeType,
    NumNode,
    ParenthesisNode,
    SetNode,
    SourceNode,
    UnaryNode,
} from "./ast";

export default class Parser {
    private scanner!: Scanner;
    private tok!: token;

    private readonly binaryLogic =
        new Set<TokenType>([TokenType.IN, TokenType.EQUAL, TokenType.NOT])
    private readonly binaryExpr =
        new Set<TokenType>([TokenType.COMPOSITION, TokenType.GCD])
    private readonly binaryTerm =
        new Set<TokenType>([TokenType.ADD, TokenType.SUB])
    private readonly binaryFactor = new Set<TokenType>([TokenType.MUL, TokenType.MOD]);
    private readonly binaryExponent = new Set<TokenType>([TokenType.POW]);
    private readonly unaryOperators =
        new Set<TokenType>([
            TokenType.SUB, TokenType.NOT, TokenType.CARDINAL,
            TokenType.REM, TokenType.MOD, TokenType.RES
        ]);

    constructor() {
        this.scanner = new Scanner("");
    }

    private assert(exp: string, ...t: TokenType[]) {
        if (t.includes(this.tok.type)) {
            return;
        }
        throw new Error(`invalid token, expected '${exp}' but got '${this.tok.value}'`);
    }

    private wrap<T extends node>(exp: string, t: [TokenType, TokenType], fn: () => T, take = 1): T {
        this.assert(exp.substring(0, take), t[0]);
        this.next()
        const ret = fn();
        this.assert(exp.substring(take), t[1]);
        this.next();
        return ret;
    }

    private next() {
        this.tok = this.scanner.getToken();
    }

    private token(): token {
        return {...this.tok};
    }

    private parseIdent(): IdentNode {
        this.assert("identifier", TokenType.IDENT);
        const n = IdentNode(this.tok.value);
        this.next();
        return n
    }

    private parseNum(): NumNode {
        this.assert("number", TokenType.NUM);
        const n = NumNode(this.tok.value);
        this.next()
        return n
    }

    private parseParenthesis(): ParenthesisNode {
        return this.wrap("()",
            [TokenType.LEFT_PAREN, TokenType.RIGHT_PAREN],
            () => ParenthesisNode(this.parseExpr()));
    }

    private parseCongruenceClass(): CongruenceClassNode {
        return this.wrap("<>",
            [TokenType.LESS, TokenType.GREATER],
            () => {
                const r = this.parseExpr();
                this.assert(",", TokenType.COMMA);
                this.next();
                return CongruenceClassNode(r, this.parseExpr())
            })
    }

    private parseSet(): SetNode {
        return this.wrap("{}",
            [TokenType.LEFT_CURVY, TokenType.RIGHT_CURVY],
            () => {
                if (this.tok.type === TokenType.RIGHT_CURVY) {
                    return SetNode([]);
                }

                const e = [this.parseExpr()];

                for (; this.tok.type === TokenType.COMMA;) {
                    this.next()
                    e.push(this.parseExpr());
                }

                return SetNode(e);
            })
    }

    private parseForall(): ForAllNode {
        this.assert("forall", TokenType.FORALL);
        this.next();
        const n = this.parseIdent();

        this.assert("in", TokenType.IN);
        this.next();

        const iter = this.parseExpr();

        this.assert(":", TokenType.COLON);
        this.next();

        const v = this.parseExpr();

        return ForAllNode(n, iter, v);
    }

    private parseIndex(i: IdentNode): IndexNode {
        return this.wrap<IndexNode>("[]", [TokenType.LEFT_BRACE, TokenType.RIGHT_BRACE],
            () => IndexNode(i, this.parseExpr()));
    }

    private parseSystem(): CongruenceSystemNode {
        return this.wrap("{[]}", [TokenType.LEFT_SYS, TokenType.RIGHT_SYS], () => {
            const u = this.parseIdent();

            this.assert(":", TokenType.COLON)
            this.next();

            if (this.tok.type === TokenType.RIGHT_SYS) {
                return CongruenceSystemNode(u, []);
            }
            const c: CongruenceNode[] = [this.parseExpr() as CongruenceNode];

            if (c[0].type !== NodeType.CONGRUENCE) {
                throw new Error("the expression inside of the system must be a congruence")
            }

            for (; this.tok.type === TokenType.COMMA;) {
                this.next();
                const e = this.parseExpr() as CongruenceNode;
                if (e.type !== NodeType.CONGRUENCE) {
                    throw new Error("the expression inside of the system must be a congruence")
                }
                c.push(e);
            }
            return CongruenceSystemNode(u, c);
        }, 2);
    }

    private parseMinimalExpr(): expr {
        switch (this.tok.type) {
            case TokenType.IDENT:
                const n = this.parseIdent();
                // @ts-ignore
                if (this.tok.type === TokenType.LEFT_BRACE) {
                    return this.parseIndex(n);
                }
                return n;
            case TokenType.LEFT_PAREN:
                return this.parseParenthesis();
            case TokenType.LESS:
                return this.parseCongruenceClass();
            case TokenType.LEFT_CURVY:
                return this.parseSet();
            case TokenType.LEFT_SYS:
                return this.parseSystem();
            case TokenType.FORALL:
                return this.parseForall();
            default:
                return this.parseNum();
        }
    }

    private parseUnary(): UnaryNode | expr {
        if (!this.unaryOperators.has(this.tok.type)) {
            return this.parseMinimalExpr()
        }
        const op = this.token();
        this.next();
        return UnaryNode(op, this.parseMinimalExpr());
    }

    private parseGenericBinary(op: Set<TokenType>, next: () => BinaryNode | expr): BinaryNode | expr {
        let n = next();
        for (; op.has(this.tok.type);) {
            const tok = this.token();
            this.next();
            n = BinaryNode(tok, n, next())

        }
        return n
    }

    private parseBinaryExponent(): BinaryNode | expr {
        return this.parseGenericBinary(this.binaryExponent, () => this.parseUnary());
    }

    private parseBinaryFactor(): BinaryNode | expr {
        return this.parseGenericBinary(this.binaryFactor, () => this.parseBinaryExponent());
    }

    private parseBinaryTerm(): BinaryNode | expr {
        return this.parseGenericBinary(this.binaryTerm, () => this.parseBinaryFactor());
    }

    private parseBinaryExpr(): BinaryNode | expr {
        return this.parseGenericBinary(this.binaryExpr, () => this.parseBinaryTerm());
    }

    private parserBinaryLogic(): BinaryNode | expr {
        let n = this.parseBinaryExpr();
        for (; this.binaryLogic.has(this.tok.type);) {
            const tok = this.token();
            this.next();

            if (tok.type === TokenType.NOT) {
                const op = this.token();
                this.next();
                n = UnaryNode(tok, BinaryNode(op, n, this.parseBinaryTerm()))
            } else {
                n = BinaryNode(tok, n, this.parseBinaryTerm());
            }
        }
        return n;
    }

    private parseBinary(): BinaryNode | expr {
        return this.parserBinaryLogic();
    }

    private parseAssignment(ident: IdentNode): AssigmentNode {
        this.assert("=", TokenType.ASSIGN);
        this.next()
        return AssigmentNode(ident, this.parseExpr());
    }

    private parseCongruence(n: expr): CongruenceNode {
        this.assert("cong", TokenType.CONG);
        this.next()
        return CongruenceNode(n, this.parseExpr(), this.parseParenthesis());
    }

    private parseDirective(): DirectiveNode {
        this.assert("@", TokenType.DIRECTIVE);
        this.next();
        const n = this.parseIdent();

        return this.wrap<DirectiveNode>("()", [TokenType.LEFT_PAREN, TokenType.RIGHT_PAREN], () => {
            if (this.tok.type === TokenType.RIGHT_PAREN) {
                return DirectiveNode(n, []);
            }

            const args: expr[] = [this.parseExpr()];

            for (; this.tok.type === TokenType.COMMA;) {
                this.next();
                args.push(this.parseExpr());
            }

            return DirectiveNode(n, args);
        });
    }

    private parseExpr(): expr {
        const n = this.parseBinary();

        if (this.tok.type === TokenType.CONG) {
            return this.parseCongruence(n);
        }
        return n;
    }

    public parse(s: string): node {
        this.scanner.reset(s);
        this.next();

        const n: expr[] = [];
        const d: DirectiveNode[] = [];
        const c: Record<number, string> = {};

        for (; this.tok.type !== TokenType.EOF;) {
            if (this.tok.type === TokenType.COMMENT) {
                c[n.length - 1] = this.tok.value;
                this.next();
            }

            if (this.tok.type === TokenType.DIRECTIVE) {
                d.push(this.parseDirective());
                continue
            }

            let expr = this.parseExpr();
            if (expr.type === NodeType.IDENT && this.tok.type === TokenType.ASSIGN) {
                expr = this.parseAssignment(expr as IdentNode);
            }
            n.push(expr);
        }

        if (n.length === 1 && d.length === 0) {
            return n[0];
        }

        if (d.length === 1 && n.length === 0) {
            return d[0];
        }

        return SourceNode(n, d, c);
    }
}