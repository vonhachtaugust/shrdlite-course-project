The A* planner algorithm
=========================================================

### Files

The A* implementations is made in the following file

- `Graph.ts`

which requires imports from the base repository found at
the course repository

- <https://github.com/ChalmersGU-AI-course/shrdlite-course-project/>

=========================================================
### Data structures and classes

Implemented classes used by the algorithm,

- the class `NodeMap` in the file `Graph.ts`.
- the class `NodeTable` in the file `Graph.ts`.

Descriptions & motivations:------------------------------

`NodeMap`: Extension of the node data structure such that it 
can hold either a number (evaluation function value) or a 
predecessor node.

---------------------------------------------------------

`NodeTable`: Class containing a list of NodeMaps and
functions for necessary operations on the list such that:

GetFVal, returns the evaluation function value of node.
Insert, insert node with an evaluation function value into the list.
GetArgMinAmong, get minimum evaluation function value among nodes in list.

These operations a necessary in order to update and 
evaluate the frontier used by our A* planner.

=========================================================
### Functions

Implemented functions used by the algorithm,

- the function `aStarSearch(...)` in the file `Graph.ts`.
- the function `reconstructPath(...)` in the file `Graph.ts`.
- the function `equal(...)` in the file `Graph.ts`.
- the function `contains(...)` in the file `Graph.ts`.

function arguments and returns can be found in `Graph.ts`.

Descriptions & motivations:------------------------------

`aStarSearch(...)`: Keep evaluating nodes in openSet until
this list is empty or the goal was found. ClosetSet keeps 
track of already evaluated nodes. Returns the shortest path
if such a path exists, this since admissible heuristics is 
used (Euclidean distance, however defined in the test file) 
which makes the evaluation function admissible. 

---------------------------------------------------------

`reconstructPath(...)`: Follows the predecessor path back
to start. Start is not included in the A* planner result 
path and this path is from start to goal. This we have 
seen as a definition of the resulting path.

---------------------------------------------------------

`equal(...)`: The standard `==` operation is undefined 
between Nodes in Typescript, this is our own implementation
of this operator. 

---------------------------------------------------------

`contains(...)`: Uses `equal(...)` to check if openSet contains
node. Used to avoid evaluating the same node in the frontier
multiple times if such an occurrence exists.

---------------------------------------------------------
