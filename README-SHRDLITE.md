Synopsis
The Shrdlite project, Artificial Intelligence — LP4, VT 2016  written in Typescript.

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
tsc --out shrdlite-html.js shrdlite-html.ts

Contributors
Karl Bäckström, David Hansson, Mahmod Nazari, August von Hacht

License
Chalmers, AI, Sonnet Group.









