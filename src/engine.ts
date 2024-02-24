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

  outNeighbors(node: Node): Node[] {
    const i = this.nodes.getKey(node)!;
    const result: Node[] = [];

    for (let j = 0; j < this.adjacencyMatrix.length; j++) {
      if (this.adjacencyMatrix[i][j] > 0) {
        result.push(this.nodes.getValue(j)!);
      }
    }

    return result;
  }

  correspondenceNodesTo(nodes: Set<Node>, domain: Domain): Node[] {
    const result: Node[] = [];
    for (let i = 0; i < this.adjacencyMatrix.length; i++) {
      const node = this.nodes.getValue(i)!;
      if (node.domain === Domain.CORRESPONDENCE) {
        const outNeighbors = new Set(this.outNeighbors(node).filter(n => n.domain === domain));

        if (isEqualSets(outNeighbors, filter(nodes, n => n.domain === domain))) {
          result.push(node);
        }
      }
    }
    return result;

    // const result: Node[] = [];
    // for (let i = 0; i < this.adjacencyMatrix.length; i++) {
    //   const foo = new Set(this.adjacencyMatrix[i]
    //     .filter((v, i) => v > 0)
    //     .map(j => this.nodes.getValue(j)!)
    //     .filter(node => node.domain === Domain.CORRESPONDENCE));
    //
    //   if (isEqualSets(foo, nodes)) {
    //     result.push(this.nodes.getValue(i)!);
    //   }
    // }
    // return result;
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
      const ruleTypes = new Set(rule
        .nodes
        .keyValueMap
        .toArray()
        .map(([_, node]) => node)
        .filter(node => node.domain === Domain.CORRESPONDENCE && node.action === Action.CREATE)
        .map(node => node.type));

      const thisTypes = new Set(this
        .correspondenceNodesTo(new Set(map.values()), domain)
        .map(node => node.type));

      return !isSubsetOf(ruleTypes, thisTypes);
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
    const nodesUsed = new Set(edges.flatMap(e => e.nodes));

    const graph = new Graph(edges);
    this.nodes
      .filter(([_, node]) => !nodesUsed.has(node))
      .filter(([_, node]) => node.domain === domain || node.action === Action.PRESERVE)
      .forEach(([_, node]) => graph.addNode(node));

    return graph;
  }

  /**
   * Every CREATE element. Needs an additional filter to decide what
   * to actually add to the host graph.
   */
  creators(): Graph {
    // FIXME This logic will skip any standalone node that is created.
    const edgeSet = new Set<Edge>();

    this.edges
      .forEach(edge => {
        if (edge.action === Action.CREATE) {
          edgeSet.add(edge);
        }
      });

    return new Graph([...edgeSet]);
  }

  toString(): string {
    const result: string[] = [];
    this.edges.forEach(edge => {
      // result.push(`${edge.nodes[0].type}_${this.nodes.getKey(edge.nodes[0])} -> ${edge.nodes[1].type}_${this.nodes.getKey(edge.nodes[1])}`);
      result.push(`${edge.nodes[0].type}_${edge.nodes[0].data} -> ${edge.nodes[1].type}_${edge.nodes[1].data}`);
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

  translate(host: Graph, frm: Domain, _to: Domain) {
    let matchFound = false;
    while (true) {
      matchFound = false;

      for (let rule of this.rules) {
        const match = host.findMatch(rule, frm);

        matchFound = match.size > 0;

        if (matchFound) {
          const creators = rule.creators();

          creators.nodes
            // Only add what has not been matched
            .filter(([_, node]) => !match.has(node))
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

function isEqualSets<A>(a: Set<A>, b: Set<A>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function isSubsetOf<A>(a: Set<A>, b: Set<A>): boolean {
  return [...a].every(x => b.has(x));
}

function filter<A>(set: Set<A>, predicate: (a: A) => boolean): Set<A> {
  return new Set([...set].filter(predicate));
}