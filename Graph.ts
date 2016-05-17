///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/

/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}

/**
 * Structure to save nodes, with corresponding score
 */
class NodeScore {
    node : any;
    score : number;
}

/**
 * function for comparing NodeScore objects
 */
var comperator : collections.ICompareFunction<NodeScore> = 
    function(a : NodeScore, b : NodeScore) {
        if (a.score < b.score) {
            return -1;
        } else if (a.node === b.node && a.score === b.score) {
            return 0;
        } else {
            return 1;
        }
    }

/**
* A\* search implementation, parameterised by a `Node` type.
*
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node>(
    graph: Graph<Node>,
    start: Node,
    goal: (n: Node) => boolean,
    heuristics: (n: Node) => number,
    timeout: number
    ): SearchResult<Node> {
    var result : SearchResult<Node>;
    
    let closedSet : Node[] = [];
    let openSet : Node[] = [start];
    
    let gScore : collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    gScore.setValue(start,0);
    
    let fScoreOpenHeap : collections.Heap<NodeScore> = new collections.Heap<NodeScore>(comperator);
    fScoreOpenHeap.add({
        node: start,
        score: heuristics(start)
    });
    
    let cameFrom : collections.Dictionary<Node, Node> = new collections.Dictionary<Node, Node>();
    
    let t : number = 0;
    while (openSet.length > 0 && t < timeout) {
      let rootNode = fScoreOpenHeap.removeRoot();
      let current = rootNode.node;


      if (goal(current)) {
        result = reconstructPath(
          cameFrom,
          current,
          start,
          rootNode.score  
                );
            break;    
      }

      // Remove current from open set
      openSet.splice(openSet.indexOf(current),1);
      // Add current to closed set
      closedSet.push(current);
      
      let currentNeighbourEdges : Edge<Node>[] = graph.outgoingEdges(current);
      
      // For each neighbour
      for (let i = 0; i < currentNeighbourEdges.length; i++) {
        let thisEdge : Edge<Node> = currentNeighbourEdges[i];
        let thisNeighbour = thisEdge.to;
        
        // If this neighbour is in closed set, then skip
        if (closedSet.indexOf(thisNeighbour) > -1) {
          continue;
        }
        
        // The cost from start to this neighbour
        let tentative_gScore = gScore.getValue(current) + thisEdge.cost;

        if (tentative_gScore >= gScore.getValue(thisNeighbour)) {
          // This path is more costly
          continue;
        }
        
        // This neighbour cost is less coslty therefore add it
        openSet.push(thisNeighbour);

        // save new g-score
        gScore.setValue(thisNeighbour, tentative_gScore);

        // update predecessor map
        cameFrom.setValue(thisNeighbour, current);
        
        fScoreOpenHeap.add({
          node: thisNeighbour,
          score: tentative_gScore + heuristics(thisNeighbour)
        });
        
        // milli-loops
        t = t + 0.001;
      }
    }
    // if no path exists, result is undefined
    return result;
}

/**
 * function for reconstructing the best path from start to goal
 * @param cameFrom table mapping nodes to the predecessors
 * @param current the node from which to begin generating path backwards
 */
function reconstructPath<Node>(cameFrom: collections.Dictionary<Node, Node>, current : Node, start : Node, totalCost: number): SearchResult<Node> {
    let total_path: SearchResult<Node> = {path:[current],cost:totalCost};
    
    // Predecessor path from goal to start:
    while (current != start) {
        current = cameFrom.getValue(current);
        total_path.path.push(current);
    }
    // Remove start from list:
    total_path.path.splice(total_path.path.length - 1, 1);
    
    total_path.path.reverse();
    return total_path;
}