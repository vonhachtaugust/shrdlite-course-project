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
 * 
 */
class NodeMap<Node> {
    node : Node;
    map : any;
}

/**
 * Structure for mapping nodes to values, search as numbers or
 * other nodes.
 */
class NodeTable<Node> {
  nodes : NodeMap<Node>[];
  constructor(
      public defaultMap : any
  ) {
    this.nodes = [];
  }
  
  IsEmpty() : boolean {
    return (this.nodes.length == 0);
  }

  GetFVal(node : Node) : any {
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].node == node) {
        return this.nodes[i].map;
      }
    }
    // node has not been inserted, return default value
    return this.defaultMap;
  }

  Insert(node : Node, fVal : any) {
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].node == node) {
        this.nodes[i].map = fVal;
        return;
      }
    }
    this.nodes.push({
      node: node,
      map: fVal
    });
  }

  Member(node : Node) : boolean {
    return (this.GetFVal(node) != undefined);
  }
  // This function works only if the map is a number

  GetArgMinAmong(feasibleSet : Node[]) : Node {
    let minFNode : Node;
    let minF : number;
    for (let i = 0; i < feasibleSet.length; i++) {
      let thisNode = feasibleSet[i];
      let thisNodeFVal = this.GetFVal(thisNode);
      if (minF == null || thisNodeFVal < minF) {
        minFNode = thisNode;
        minF = thisNodeFVal;
      }
    }
    return minFNode;
  }
}

/**
* A\* search implementation, parameterised by a `Node` type.
*
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node>(
    graph: Graph<Node>,
    start: Node,
    goal: (n: Node) => boolean,
    heuristics: (n: Node) => number,
    timeout: number
    ): SearchResult<Node> {
    // A dummy search result: it just picks the first possible neighbour
    var result : SearchResult<Node>;
    
    let closedSet : Node[] = [];
    let openSet : Node[] = [start];
    
    let gScore : NodeTable<Node> = new NodeTable<Node>(Infinity);
    gScore.Insert(start,0);
    
    let fScore : NodeTable<Node> = new NodeTable<Node>(Infinity);
    fScore.Insert(start,heuristics(start));
    
    let cameFrom: NodeTable<Node> = new NodeTable<Node>(undefined);
    
    while (openSet.length > 0) {
      let current = fScore.GetArgMinAmong(openSet);
      if (goal(current)) {
            result = reconstructPath( 
                cameFrom, 
                current, 
                start);
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
        let tentative_gScore = gScore.GetFVal(current) + thisEdge.cost;
        
        if (openSet.indexOf(thisNeighbour) == -1) {
          // This neighbour has not yet been encountered
          openSet.push(thisNeighbour);
        } else if (tentative_gScore >= gScore.GetFVal(thisNeighbour)) {
          // This path is more costly
          continue;
        }
        
        cameFrom.Insert(thisNeighbour,current);
        gScore.Insert(thisNeighbour,tentative_gScore);
        fScore.Insert(thisNeighbour,fScore.GetFVal(thisNeighbour))
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
function reconstructPath<Node>(cameFrom: NodeTable<Node>, current : Node, start : Node) : SearchResult<Node> {
    let total_path: SearchResult<Node> = {path:[current],cost:0};

    /**
    *    Predecessor path from goal to start:
    */
    while  (current  != start) {
        current = cameFrom.GetFVal(current);
        total_path.path.push(current);
        total_path.cost += cameFrom.GetFVal(current);
    }

    /**
    *    Reverse path:
    */
    total_path.path.reverse();

    return total_path;
}

//////////////////////////////////////////////////////////////////////
// here is an example graph

interface Coordinate {
    x : number;
    y : number;
}


class GridNode {
    constructor(
        public pos : Coordinate
        ) {}

    add(delta : Coordinate) : GridNode {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    }

    compareTo(other : GridNode) : number {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    }

    toString() : string {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    }
}

/** Example Graph. */
class GridGraph implements Graph<GridNode> {
    private walls : collections.Set<GridNode>;

    constructor(
        public size : Coordinate,
        obstacles : Coordinate[]
        ) {
        this.walls = new collections.Set<GridNode>();
        for (var pos of obstacles) {
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({x:x, y:-1}));
            this.walls.add(new GridNode({x:x, y:size.y}));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({x:-1, y:y}));
            this.walls.add(new GridNode({x:size.x, y:y}));
        }
    }

    outgoingEdges(node : GridNode) : Edge<GridNode>[] {
        var outgoing : Edge<GridNode>[] = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (! (dx == 0 && dy == 0)) {
                    var next = node.add({x:dx, y:dy});
                    if (! this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: Math.sqrt(dx*dx + dy*dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    }

    compareNodes(a : GridNode, b : GridNode) : number {
        return a.compareTo(b);
    }

    toString() : string {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y-1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({x:x,y:y})) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0) str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    }
}
