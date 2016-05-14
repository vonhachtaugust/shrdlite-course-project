Synopsis
The interpretation part (module Interpreter) of the Shrdlite project, Artificial Intelligence — LP4, VT 2016  written in Typescript.

Code 

Private functions of the module Interpreter:

@param cmd The actual command.
@param state The current state of the world. 
@returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). 
function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula
 make decision based on the different command “Take”/“Move” and return [{polarity: true, relation: cmd.location.relation, args: [comb[0],comb[1]]}] as the DNFFormula


@combs A list of all combination of the considered tags in the Example world/“objects": 
@relation The relationship between the tags
@param state The current state of the world. 
function assertPhysicalLaws(combs,relation,state) 
 Imply the physical laws in the project simulation
  

@entity The entity from the actual command
@state The current state of the world. 
@return a list of tags in the Example world/“objects" 
function getPossibleEntitieTags(entity ,state ) 
 a recursive function which returns the match tags ( “a”,”b”,”c”,..) within all entities based on the ‘state’ in ‘entity’  with their property and locations in the world.


@thisPossibleTargetTag Tags in the Example world/“objects"
@state The state of the world. 
@return  the index of 'thisPossibleTargetTag' in it's respective stack
function stackIndexOf(thisPossibleTargetTag, state )


@thisPossibleTargetTag a tag in the Example world/“objects"
@state The state of the world.
@return  the stack index of 'thisPossibleTargetTag'
function stackIndex(thisPossibleTargetTag, state)


@thisPossibleTargetTag a tags in the Example world/“objects"
@thisRelativeTag a tag in the Example world/“objects"
@state The state of the world
@return returns true if 'thisPossibleTargetTag' and 'thisRelativeTag' are in the same stack
function isInSameStack(thisPossibleTargetTag,thisRelativeTag , state ) 


@targetObject the object description of form, color and size
@state The state of the world. 
@return list of objects in 'stateObjects' matching 'targetObject' w.r.t the following features
function filterFeatures(targetObject, state)
 finds the tag representative of the object (Ex:”a”,”b”, etc..) int the Example world/“objects”.


@l1 argument one
@l2 argument two
@return the cartesian product of l1, l2
function cartesianProd(l1, l2) 



 API Reference
http://chalmersgu-ai-course.github.io/shrdlite-grammar.html#semantic-interpretation
http://chalmersgu-ai-course.github.io/shrdlite-course-project/doc/

Tests
tsc --out Interpreter.js Interpreter.ts
tsc --out TestInterpreter.js TestInterpreter.ts
node TestInterpreter.js 

Contributors
Karl Bäckström, David Hansson, Mahmod Nazari, August von Hacht

License
Chalmers, AI, Sonnet Group.
