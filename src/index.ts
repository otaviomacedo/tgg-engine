import { getIsomorphicSubgraphs } from 'subgraph-isomorphism';

export enum Action {
  PRESERVE = 'preserve',
  CREATE = 'create',
}

export enum Domain {
  SOURCE = 'source',
  TARGET = 'target',
}

export interface Node {
  readonly id: number;
  readonly typeName: string;
  // We're not checking whether the data matches the type
  data: unknown;
  readonly action?: Action;
}

export interface CorrespondenceNode extends Node {
  readonly sourceNodes: Node[];
  readonly targetNodes: Node[];
}

class TripleGraph {
  public readonly source: Graph;
  public readonly target: Graph;
  private readonly correspondenceNodes: CorrespondenceNode[];

  constructor() {
    this.source = new Graph(20);
    this.target = new Graph(20);
    this.correspondenceNodes = [];
  }

  addNode(typeName: string, domain: Domain, action?: Action, data?: unknown): Node {
    switch (domain) {
      case Domain.SOURCE:
        return this.source.addNode(typeName, action, data);
      case Domain.TARGET:
        return this.target.addNode(typeName, action, data);
    }
  }


}

class Graph {
  protected readonly nodes: Node[] = [];
  private readonly _adjacencyMatrix: number[][] = [];

  constructor(capacity: number) {
    // TODO Increase capacity on demand
    for (let i = 0; i < capacity; i++) {
      this._adjacencyMatrix.push(new Array(capacity).fill(0));
    }
  }

  addEdge(src: Node, trg: Node): void {
    this._adjacencyMatrix[src.id][trg.id] = 1;
  }

  getNode(i: number) {
    return this.nodes[i];
  }

  get adjacencyMatrix(): number[][] {
    return this._adjacencyMatrix;
  }

  addNode(typeName: string, action?: Action, data?: unknown): Node {
    const node: Node = {
      id: this.nodes.length,
      typeName,
      data,
      action,
    };

    this.nodes.push(node);

    return node;
  }

  addCorrespondenceNode(typeName: string, sourceNodes: Node[], targetNodes: Node[], data?: unknown): CorrespondenceNode {
    // TODO Validate whether source nodes and target nodes are in the source and target, respectively
    const node: CorrespondenceNode = {
      id: this.nodes.length,
      typeName,
      data,
      sourceNodes: sourceNodes,
      targetNodes: targetNodes,
    };

    this.nodes.push(node);

    return node;
  }

}

class SubGraph extends Graph {
  constructor(private readonly graph: Graph, private readonly ids: number[]) {
    super(ids.length);
  }

  getNode(i: number): Node {
    return this.graph.getNode(this.ids[i]);
  }

  get adjacencyMatrix(): number[][] {
    // TODO memoize or pre-compute
    const result: number[][] = [];
    for (let i = 0; i < this.ids.length; i++) {
      result.push(Array(this.ids.length).fill(0));
    }

    const ids = this.ids;
    ids.forEach((row, subRow) => {
      ids.forEach((col, subCol) => {
        result[subRow][subCol] = this.graph.adjacencyMatrix[row][col];
      });
    });

    return result;
  }
}

export class Engine {
  constructor(private readonly rules: TripleGraph[]) {
  }

  public translateForward(graph: TripleGraph): TripleGraph {
    for (let rule of this.rules) {
      const match = this.findMatch(rule, graph);

      if (match != null) {
        // Apply the rule
      }
    }
  }

  public findMatch(rule: TripleGraph, graph: Graph): number[][] | undefined {
    const lhs = rule.source;
    const matches = getIsomorphicSubgraphs(graph.adjacencyMatrix, lhs.adjacencyMatrix);
    return matches.find(match => typesMatch(match, graph, lhs));

    function typesMatch(match: number[][], host: Graph, pattern: Graph): boolean {
      for (let i = 0; i < match.length; i++) {
        for (let j = 0; j < match[i].length; j++) {
          if (match[i][j] > 0) {
            if (pattern.getNode(i).typeName !== host.getNode(j).typeName) {
              return false;
            }
          }
        }
      }
      return true;
    }
  }

  public apply(match: number[][], rule: TripleGraph, graph: TripleGraph): HostGraph {
    // TODO Make domain a parameter to be able to translate in both directions
    const table: Map<RuleNode, Node> = new Map();
    for (let ruleNode of rule.getNodes(Domain.TARGET, Action.CREATE)) {
      table.set(ruleNode, graph.addNode(ruleNode.typeName));
    }

    for (let [frm, to] of rule.getEdges(Domain.TARGET)) {
      graph.addEdge(table.get(frm)!, table.get(to)!);
    }


    const corr = graph.addNode(rule.correspondenceNode.typeName);


  }
}

export class Hello {
  public sayHello() {
    const host = new HostGraph(5);
    const q1 = host.addNode('Queue');
    const q2 = host.addNode('Queue');
    const f = host.addNode('Function');
    const t1 = host.addNode('Triggers');
    const t2 = host.addNode('Triggers');

    host.addEdge(t1, q1);
    host.addEdge(t1, f);
    host.addEdge(t2, q2);
    host.addEdge(t2, f);

    // AXIOMS

    // Queue axiom
    const queueAxiom = new Rule(3);
    const q_a_s = queueAxiom.addDomainNode('Queue', Domain.SOURCE, Action.CREATE);
    const q_a_t = queueAxiom.addDomainNode('Queue', Domain.TARGET, Action.CREATE);
    queueAxiom.addCorrespondenceNode('QueueAxiom', [q_a_s], [q_a_t]);

    // Function axiom
    const functionAxiom = new Rule(20);
    const f_a_s = functionAxiom.addDomainNode('Function', Domain.SOURCE, Action.CREATE);
    const f_a_t = functionAxiom.addDomainNode('Function', Domain.TARGET, Action.CREATE);
    functionAxiom.addCorrespondenceNode('FunctionAxiom', [f_a_s], [f_a_t]);

    // ABSTRACTIONS

    // Triggers
    const queueTriggersFunction = new Rule(20);
    const q_s = queueTriggersFunction.addDomainNode('Queue', Domain.SOURCE, Action.PRESERVE);
    const f_s = queueTriggersFunction.addDomainNode('Function', Domain.SOURCE, Action.PRESERVE);
    const t_s = queueTriggersFunction.addDomainNode('Triggers', Domain.SOURCE, Action.PRESERVE);
    queueTriggersFunction.addEdge(t_s, q_s);
    queueTriggersFunction.addEdge(t_s, f_s);

    const q_t = queueTriggersFunction.addDomainNode('Queue', Domain.TARGET, Action.PRESERVE);
    const f_t = queueTriggersFunction.addDomainNode('Function', Domain.TARGET, Action.PRESERVE);
    const e = queueTriggersFunction.addDomainNode('EventSourceMapping', Domain.TARGET, Action.CREATE);
    const r = queueTriggersFunction.addDomainNode('Role', Domain.TARGET, Action.CREATE);
    queueTriggersFunction.addEdge(e, q_t);
    queueTriggersFunction.addEdge(e, f_t);
    queueTriggersFunction.addEdge(f, r);

    queueTriggersFunction.addCorrespondenceNode('TriggersCorr', [q_s, t_s, f_s], [q_t, f_t, e, r]);

    const engine = new Engine([queueAxiom, functionAxiom, queueTriggersFunction]);
    const result = engine.findMatch(host);

    if (result == null) {
      console.log('No matches found');
      return;
    }

    for (let i = 0; i < result.length; i++) {
      console.log(result[i]);
    }

    for (let i = 0; i < 5; i++) {
      console.log(`${JSON.stringify(host.getNode(i))}`);
    }
  }
}

new Hello().sayHello();