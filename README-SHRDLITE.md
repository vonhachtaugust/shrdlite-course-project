Synopsis
The Shrdlite project, Artificial Intelligence — LP4, VT 2016  written in Typescript.

Modules:

- Interpreter.ts
  - NEW: added some global variables to keep track on what information has been shown
         to the user, and to pass on some information about the possible objects to
         the Planner.
	- Functions:
	  - interpret: slight modifications for user interaction
		- systemPrint: function for outputting to the user, currently using 'alert'
		- interpretCommand:
		  - takes the command, quantifier, and state into account, and
		    returns the interpretation as a DNF formula
		- getCombinatedConjunctions:
		  - combines entity lists according to command of the form "put ALL ... in ALL ..."
		- promptIdentifyEntityTag:
		  - given an entity object, a list of possible entity tags, and the current state,
			  this function asks the user questions in an attempt to uniquely identify the
				tag for the entity
		- stringifyEntity:
		  - given an entity, it returns a human-friendly string describing the entity using
			  it's size, color, and form
		- arrayIntersection:
		  - returns the 'intersection' (elements in common) of the two input arrays
		- combination:
		  - given an array and an integer 'l', returns the list of all combinations of the
			  elements in the array of length 'l'
		- getFeatureValVsNumberMap:
		  - input: possibleTargetTags, thisFeature, state
			  returns: a map from possible values of features 'small', 'green' etc. to the
				         number of elements which has that value
		- getPossibleEntitieTags:
		  - input: entity, state
			- returns: a list of all entity tags which matches the properties of 'entity'
		- assertPhysicalLaws:
		  - input: combs (list of pairs of entity tags), relation, state
			- returns: sublist of combs, whose elements can be pair-wise related with
			           'relation' in the world 'state'
		- stackIndexOf:
		  - input: entity tag, state
			- returns: the index of tag in it's stack
		- stackIndex:
		  - input: entity tag, state
			- returns: the index of the stack that tag is in
		- isInSameStack:
		  - input: tag1, tag2, state
			- returns: true if tag1 and tag2 are in the same stack
		- filterFeatures:
		  - input: entity object, state
			- returns: list of tags whose objects match entity, with no respect to location
		- cartesianProd:
		  - input: l1, l2 (lists)
			- returns: the cartesian product of l1 and l2
		- count:
		  - input: x, xs
			- returns: the number of occurences of x in xs
		- checkRelation:
		  - input: relation, args (list), state
			- returns: true if the entities in args can be related with relation in world state
  - Interfaces:
	  - InterpretationResult:
		  - added 'targetTags' for passing on to Planner

- Interpreter.ts
	- Functions:
	  - pathToPlan
		  - input: list of states
			- returns: the list of world arm actions correspond to the state list
	  - insertActionDescriptionTexts
		  - input: list of arm actions
			- returns: list of arm actions and texts describing what move is being done
	  - stringifyEntity
		  - input: entity, state
			- returns: a human-friendly string describing entity, with as few properties listed
			           as possible.
	  - findUniqueIdCombs
		  - input: entity, state
			- returns: a list of combinations of entity properties that uniquely identifies
			           entity in state
	  - goal
		  - input: DNF formula, state
			- returns: determines if state is a goal state
	  - conjunctive
		  - input: interpretation (Literal), state
			- returns: determines if interpretation is true in state
	  - heuristicFunction
		  - input: state, DNF formula
			- returns: the heuristic for state
	  - estimatedPathLength
		  - input: state, interpretation (Literal)
			- returns: the estimated number of states in the path from state to a state where
			           the interpretation Literal is satisfied
	  - getReachableStates
		  - input: state
			- returns: list of states reachable from state in one move
	  - cloneObject
		  - input: x
			- returns: new object, identical to x
	  - argmin: performs a min-search on xs, starting in startPos, expanding circularly
		  - input: list xs, startPos
			- returns: index of the minimum element in xs
  - Classes:
	  - StateGraph:
		  - defines the graph class on which to use A*

- Shrdlite.ts
	- NEW: Added functionality for handling ambigious commands

Extensions:

- Quantifiers
    - separate interpretations of ‘any’, ‘the’, and ‘all’
    - ‘any’ will give you any object matching the description
    - if ‘the’ is used, and there are several matching objects, the script will ask the
      user questions about properties of the object, such as ‘color’, ‘size’ etc.
      The script will prioritize asking about properties which are most likely to
      uniquely identify the object, based on the current state.
    - ‘all’ will apply to all objects in the world which matches the description
	-examples:
		Complex World:   ’put all tables on the floor’
		Complex world:    ‘put the table on the floor’
		Complex World:    ‘take a table beside the table beside all bricks’
  
- Ambiguity resolution
    - If there are several interpretations, then the script will attempt to ask the user
      which object was intended to move/take in order to uniquely identify an
      interpretation. The user has the option to answer ‘any’, in which case an
      attempt to generate a plan for each of the interpretations will be made.
    - If several plans were found, the user is able to choose which plan perform,
      based on its required number of moves.
	-examples:
		Complex World: ‘put a ball in a box beside a yellow pyramid’
		Complex World: ‘put a brick under a box on the table ’
		Complex World: ‘put all yellow objects under a red object under an object’

- Fine-grained cost calculation
    - in the heuristic function, the estimated number of moves to reach the goal
      is calculated. This calculation takes the current state into account, e.g. the
      currently held object, the arm position, and how deep object are in their
      respective stacks (and thereby the height of the stacks), which gives a
      rough estimate of the length to the goal.
	-examples:
		Complex World: ‘put all yellow objects on the floor’
		Complex World: ‘put all yellow objects beside all red objects’
		Complex World: ‘put all red objects above a yellow object on the floor’

- Medium , complex world and impossible world
    - Due to the comprehensive heuristic function, most basic commands work
      well in the medium and complex world. The search time can be higher for
      more complex commands, which for example use several ‘all’-quantifiers.
      Commands work well in the impossible world as well.
	-examples:
		Impossible World: ‘put the blue brick on the green brick’

- Plan description
    - The planner will in natural language explain what move it is performing.
    - If there are several moves, it uses words like ‘First’ and ‘Finally’.
    - For moves between the first and last, it randomly selects between ‘Next, ‘
      and ‘Then, ‘ to initiate the description.
    - When describing objects in natural language, there are three properties that
      one can use; ‘form’, ‘color’, and ’size’. When describing the plan, the
      planner finds the shortest combination of properties that uniquely defines the
      object in question.
	-examples:
		Any of the above.

API Reference
http://chalmersgu-ai-course.github.io/shrdlite-course-project/doc/

Tests
There is an error "TS7017" with the complie command 'make all' on the Interpreter.ts
file in the line (513,47). Eventhough the type any was defined but the error did not go away.

We recommend to use the following command to complie the project.
tsc --out shrdlite-html.js shrdlite-html.ts

Contributors
Karl Bäckström, David Hansson, Mahmod Nazari, August von Hacht

License
Chalmers, AI, Sonnet Group.
