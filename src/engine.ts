import { BiMap } from '@rimbu/bimap';
import { getIsomorphicSubgraphs } from 'subgraph-isomorphism';

export enum Action {
  PRESERVE = 'preserve',
  CREATE = 'create',
}

export enum Domain {
  SOURCE = 'source',
  TARGET = 'target',
  CORRESPONDENCE = 'correspondence',
}

export interface Node {
  type: string;
  domain: Domain;
  action?: Action;
  data?: unknown;
}

export interface Edge {
  type?: string;
  action?: Action;
  nodes: [Node, Node];
}

export class Nodes {
  private static idCounter = 0;
  static newNode(type: string, domain: Domain, action?: Action): Node {
    return {
      type, domain, action, data: Nodes.idCounter++,
    };
  }
}

export class Graph {
  private readonly adjacencyMatrix: number[][];
  public nodes: BiMap<number, Node>;

  constructor(
    public readonly edges: Edge[],
  ) {
    this.adjacencyMatrix = [];
    const nodesBuilder = BiMap.builder<number, Node>();

    this.edges.forEach(edge => {
      const frm = edge.nodes[0];
      if (!nodesBuilder.hasValue(frm)) {
        nodesBuilder.set(nodesBuilder.size, frm);
      }

      const to = edge.nodes[1];
      if (!nodesBuilder.hasValue(to)) {
        nodesBuilder.set(nodesBuilder.size, to);
      }
    });

    this.nodes = nodesBuilder.build();

    for (let i = 0; i < this.nodes.size; i++) {
      this.adjacencyMatrix.push(Array(this.nodes.size).fill(0));
    }

    this.edges.forEach(edge => {
      const frm = edge.nodes[0];
      const to = edge.nodes[1];

      this.adjacencyMatrix[this.nodes.getKey(frm)!][this.nodes.getKey(to)!] = 1;
    });
  }

  correspondenceNodesAdjacentTo(node: Node): Node[] {
    const j = this.nodes.getKey(node)!;

    const result: Node[] = [];
    this.adjacencyMatrix.forEach((row, i) => {
      if (row[j] > 0) {
        const n = this.nodes.getValue(i)!;
        if (n.domain === Domain.CORRESPONDENCE) {
          result.push(n);
        }
      }
    });

    return result;
  }

  addNode(node: Node) {
    this.nodes = this.nodes.addEntry([this.nodes.size, node]);

    this.adjacencyMatrix.push(Array(this.adjacencyMatrix.length).fill(0));
    for (let i = 0; i < this.adjacencyMatrix.length; i++) {
      this.adjacencyMatrix[i].push(0);
    }
  }

  addEdge(edge: Edge) {
    this.edges.push(edge);
    const i = this.nodes.getKey(edge.nodes[0])!;
    const j = this.nodes.getKey(edge.nodes[1])!;
    this.adjacencyMatrix[i][j] = 1;
  }

  findMatch(rule: Graph, domain: Domain): Map<Node, Node> {
    const pattern = rule.context(domain);

    const typesMatch = (match: number[][]): boolean => {
      for (let i = 0; i < match.length; i++) {
        for (let j = 0; j < match[i].length; j++) {
          if (match[i][j] > 0 &&
            (this.nodes.getValue(j)?.type !== pattern.nodes.getValue(i)?.type ||
              this.nodes.getValue(j)?.domain !== pattern.nodes.getValue(i)?.domain)) {
            return false;
          }
        }
      }
      return true;
    };

    // Mapping of nodes from pattern to host
    const makeMapping = (match: number[][]): Map<Node, Node> => {
      const result = new Map<Node, Node>();
      for (let i = 0; i < match.length; i++) {
        for (let j = 0; j < match[i].length; j++) {
          if (match[i][j] > 0) {
            result.set(pattern.nodes.getValue(i)!, this.nodes.getValue(j)!);
          }
        }
      }
      return result;
    };


    // Whether this map contains a correspondence node that would be created again
    // (i.e., with the same type and pointing to the same nodes in the matching domain)
    const correspondenceDuplicateFree = (map: Map<Node, Node>): boolean => {
      for (let [p, h] of map.entries()) {
        if (p.domain === domain) {
          const patternCorrNodes = rule
            .correspondenceNodesAdjacentTo(p)
            .filter(n => n.action == Action.CREATE)
            .map(n => n.type);

          const hostCorrNodes = this
            .correspondenceNodesAdjacentTo(h)
            .map(n => n.type);

          if (patternCorrNodes.some(t => hostCorrNodes.includes(t))) {
            return false;
          }
        }
      }
      return true;
    };

    const matches = getIsomorphicSubgraphs(this.adjacencyMatrix, pattern.adjacencyMatrix);

    return matches
      .filter(typesMatch)
      .map(makeMapping)
      .find(correspondenceDuplicateFree) ?? new Map();
  }


  /**
   * Subgraph with elements to be preserved
   */
  context(domain: Domain): Graph {
    const edges = this.edges.filter(edge => edge.action === Action.PRESERVE);

    const nodesUsed = edges.flatMap(e => e.nodes);
    const graph = new Graph(edges);


    this.nodes.forEach(([_, node]) => {
      if (node.domain === domain || node.action === Action.PRESERVE) {
        graph.addNode(node);
      }
    });
    return graph;
  }

  creators(domain: Domain): Graph {
    // FIXME This logic will skip any standalone node that is created.
    const edgeSet = new Set<Edge>();

    this.edges
      .forEach(edge => {
        if (edge.action === Action.CREATE && zee(edge)) {
          edgeSet.add(edge);
        }
      });

    function bar(node: Node): boolean {
      return node.domain === Domain.CORRESPONDENCE || node.domain === domain;
    }

    function zee(edge: Edge): boolean {
      return bar(edge.nodes[0]) || bar(edge.nodes[1]);
    }

    const nodeBuilder = BiMap.builder<number, Node>();
    let idx = 0;
    const edges = [...edgeSet];
    edges
      .flatMap(e => e.nodes)
      .forEach(n => nodeBuilder.addEntry([idx++, n]));


    return new Graph(edges);
  }

  toString(): string {
    const result: string[] = [];
    this.edges.forEach(edge => {
      // result.push(`${this.nodes.getKey(edge.nodes[0])} (${edge.nodes[0].type}) -> ${this.nodes.getKey(edge.nodes[1])} (${edge.nodes[1].type})`);
      result.push(`${edge.nodes[0].type}_${this.nodes.getKey(edge.nodes[0])} -> ${edge.nodes[1].type}_${this.nodes.getKey(edge.nodes[1])}`);
    });

    return result.join('\n');
  }


}

export class Engine {
  constructor(private readonly rules: Graph[]) {
  }

  translateForward(host: Graph) {
    return this.translate(host, Domain.SOURCE, Domain.TARGET);
  }

  translateBackward(host: Graph) {
    return this.translate(host, Domain.TARGET, Domain.SOURCE);
  }

  translate(host: Graph, frm: Domain, to: Domain) {
    let matchFound = false;
    while (true) {
      matchFound = false;

      for (let rule of this.rules) {
        // console.log(rule.context(frm).toString());
        // console.log(host.toString());
        // console.log('-----------------------------------');
        const match = host.findMatch(rule, frm);

        matchFound = match.size > 0;

        if (matchFound) {
          const creators = rule.creators(to);

          creators.nodes
            .filter(([_, node]) => node.domain !== frm)
            .forEach(([_, node]) => {
              const newNode = Nodes.newNode(node.type, node.domain);
              host.addNode(newNode);
              match.set(node, newNode);
            });

          creators.edges.forEach(edge => {
            const newEdge: Edge = {
              type: edge.type,
              action: undefined,
              nodes: [match.get(edge.nodes[0])!, match.get(edge.nodes[1])!],
            };
            host.addEdge(newEdge);
          });

          break;
        }
      }

      if (!matchFound) return;
    }
  }
}
