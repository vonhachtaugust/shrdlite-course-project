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

class PathNodeCandidates<Node> {
    /** List of possible path nodes. List of turples 
    of the a node and it's corresponding f value */
    list: [Node, number][];
}

function contains(node: Node, list: Node[]) : boolean
{
    if (node != null && list.length > 0) {
        for (let i = 0; i < list.length; i++) {
            if (list[i].isEqualNode(node)) {
                return true;
            }
        }
    }
    return false;
}

/**
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
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
    /* 
        The priority queue is the SearchResult<Node> list.
    */
    var result: SearchResult<Node> = {
        path: [start],
        cost: 0
    };

    /*
        MEMORY: (not accually necessary... )
        Almost constant list keeping track of the searced nodes 
        and their corresponding f value, such that they are not 
        needed to be recalculated for each new node search.
        Almost because only whenever a new set of not previously 
        seen nodes are found, they are added to the list.
    */
    var searchList: PathNodeCandidates<Node> = {
        list: []
    };

    /*  
        While prioQueue(n) != goal || ! index++ without adding a node.
        For each node in the frontier, calculate f(p).
        Choose node with lowest f(p) and traverse its edge.
        (Handle if go back situation)
        repeat.
    */

    /*
        What's missing? 
        Heuristic function -> how is the heuristics defined.
        Cost function -> how is the cost number defined.
    */

    //////////////////// Pseudo code: //////////////////////////

    /*  
        DEFINITION: Frontier.
        The priority queue index p gives which node to examine next.
        The nodes to consider next consist of not only the edges 
        from the node under consideration, but also the nodes which 
        got you TO the node under consideration and ITS connected 
        nodes. (see slides for clarification.)
     */

    /*  
        Position in queue under consideration, i.e.
        result.path[p] return the Node under consideration
    */
    let p = 0;

    /* 
       SOLUTION FOR GOING BACK: Predecessor. 
       Each node has a predecessor node so that if a path
       turned out to be false and we need to return, we follow
       the predecessor until we get to the "better" node.
    */

    /*
        DEFINITION: Predecessors.
        Node in SearchResult<Node> list with index smaller than
        yours.
        
        DEFINTION: Predecessor to a node at index.
        Node at index - 1.
    */

    // All outgoing edges from node[p], this (might) includes the
    // node where we came from.
    let outEdges: Edge<Node>[] = graph.outgoingEdges(result.path[p]);


    // Add them to memory with their f value:
    /*
    for (let i = 0; i < outEdges.length; i++)
    {
        let node: Node = outEdges[i].to;

        // Make sure we don't add node we came from twice:
        if ( !contains(node, result.path)) 
        {
            let f = 0; // cost(node) + h(node);
            searchList.list.push([node, f]);
        }

    }
    */

    // Pseudo example:
    while (!goal(result.path[p]) || p > result.path.length - 1) 
    {
    // Obtain all edges from p to its connected nodes:
    let edges: Edge<Node>[] = graph.outgoingEdges(result.path[p]);

        if (edges.length > 0) 
        {
        // Calculate f for each connected node:
        let fmin: number;
        let index: number = -1;
            for (let i = 0; i < edges.length; i++) 
            {
                let node: Node = edges[i].to;
                    /*
                    // Calculate cost plus heuristics: 
                    f = cost(node) + h(node);
                    if (f < fmin) 
                    {
                        fmin = f;
                        index = i; // reference to node with smallest f.
                    }
                    */
            }
        // Add minimum f node unless :
        result.path.push(edges[index].to);
        // Add corresponding cost:
        result.cost += edges[index].cost;
        p++;
        }    
    }
    /*
        Example:
        A dummy search result: it just picks (three times)
        the first possible neighbour.
    
    while (result.path.length < 3) {
        var edge : Edge<Node> = graph.outgoingEdges(start) [0];
        if (! edge) break;
        start = edge.to;
        result.path.push(start);
        result.cost += edge.cost;
    }
    */
    return result;
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
