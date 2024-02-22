export function getIsomorphicSubgraphs(
    G: number[][],
    P: number[][],
    maxNum?: number,
    similarityCriteria?: (P: number[][], G: number[][], i: number, j: number) => boolean
): number[][][];