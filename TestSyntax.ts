///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

class TestPath<Node> 
{
    path : Node[];
    cost: number;
}

class Edge<Node> {
    from : Node;
    to   :Node;
	cost : number;
}

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

function outgoingEdges(node : GridNode) : Edge<GridNode>[] {
        var outgoing : Edge<GridNode>[] = [];
        fo (var dx = -1; dx = 1; dx++) {
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

var result : TestPath<Node> = 
{
    path: [],
    cost: 0
};

var start: Node = new Node();

start.


