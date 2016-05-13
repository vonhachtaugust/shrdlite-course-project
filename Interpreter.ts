///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

/**
* Interpreter module
* 
* The goal of the Interpreter module is to interpret a sentence
* written by the user in the context of the current world state. In
* particular, it must figure out which objects in the world,
* i.e. which elements in the `objects` field of WorldState, correspond
* to the ones referred to in the sentence. 
*
* Moreover, it has to derive what the intended goal state is and
* return it as a logical formula described in terms of literals, where
* each literal represents a relation among objects that should
* hold. For example, assuming a world state where "a" is a ball and
* "b" is a table, the command "put the ball on the table" can be
* interpreted as the literal ontop(a,b). More complex goals can be
* written using conjunctions and disjunctions of these literals.
*
* In general, the module can take a list of possible parses and return
* a list of possible interpretations, but the code to handle this has
* already been written for you. The only part you need to implement is
* the core interpretation function, namely `interpretCommand`, which produces a
* single interpretation for a single command.
*/
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

/**
Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
* @param parses List of parses produced by the Parser.
* @param currentState The current state of the world.
* @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
*/    
    export function interpret(parses : Parser.ParseResult[], currentState : WorldState) : InterpretationResult[] {
        var errors : Error[] = [];
        var interpretations : InterpretationResult[] = [];
        parses.forEach((parseresult) => {
            try {
                var result : InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
            } catch(err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface InterpretationResult extends Parser.ParseResult {
        interpretation : DNFFormula;
    }

    export type DNFFormula = Conjunction[];
    type Conjunction = Literal[];

    /**
    * A Literal represents a relation that is intended to
    * hold among some objects.
    */
    export interface Literal {
	/** Whether this literal asserts the relation should hold
	 * (true polarity) or not (false polarity). For example, we
	 * can specify that "a" should *not* be on top of "b" by the
	 * literal {polarity: false, relation: "ontop", args:
	 * ["a","b"]}.
	 */
        polarity : boolean;
	/** The name of the relation in question. */
        relation : string;
	/** The arguments to the relation. Usually these will be either objects 
     * or special strings such as "floor" or "floor-N" (where N is a column) */
        args : string[];
    }

    export function stringify(result : InterpretationResult) : string {
        return result.interpretation.map((literals) => {
            return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
            // return literals.map(stringifyLiteral).join(" & ");
        }).join(" | ");
    }

    export function stringifyLiteral(lit : Literal) : string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private functions
    /**
     * The core interpretation function. The code here is just a
     * template; you should rewrite this function entirely. In this
     * template, the code produces a dummy interpretation which is not
     * connected to `cmd`, but your version of the function should
     * analyse cmd in order to figure out what interpretation to
     * return.
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula {
        // This returns a dummy interpretation involving two random objects in the world
        var tags : string[] = Array.prototype.concat.apply([], state.stacks);
        var a: string = tags[Math.floor(Math.random() * tags.length)];
        var b: string = tags[Math.floor(Math.random() * tags.length)];
        
        let command = cmd.command;
        
        let interpretation : DNFFormula = [];
        
        if (command == "take") {
            let targetEntity = cmd.entity;
            let possibleTargetTags = getPossibleEntitieTags(targetEntity,state);
            console.log("possibleTargetTags: " + possibleTargetTags)
            
            for (let i = 0; i < possibleTargetTags.length; i++) {
                let possibleTargetTag = possibleTargetTags[i];
                interpretation.push(
                    [{polarity: true, relation: "holding", args: [possibleTargetTag]}]
                );
            }
        } else if (command == "move") {
            
            // target
            let targetEntity = cmd.entity;
            let possibleTargetTags = getPossibleEntitieTags(targetEntity,state);
            console.log("possibleTargetTags: " + possibleTargetTags)
            
            // relative
            let relativeEntity = cmd.location.entity;
            let possibleRelativeTags = getPossibleEntitieTags(relativeEntity,state);
            console.log("possibleRelativeTags: " + possibleRelativeTags)
            
            let combs = cartesianProd(possibleTargetTags,possibleRelativeTags);
            combs = assertPhysicalLaws(combs,cmd.location.relation,state);
            console.log("combs: " + combs);
            
            for (let i = 0; i < combs.length; i++) {
                let comb = combs[i];
                console.log("comb[0]: " + comb[0]);
                console.log("comb[1]: " + comb[1]);
                console.log("relation: " + cmd.location.relation);
                interpretation.push(
                    [{polarity: true, relation: cmd.location.relation, args: [comb[0][0],comb[1][0]]}]
                );
            }
        }
        console.log(interpretation.length);
        if (interpretation.length == 0) return undefined;
        return interpretation;
    }
    
    function assertPhysicalLaws(combs,relation,state) {
        // return value
        let result = [];
        
        for (let i = 0; i < combs.length; i++) {
            let targetTag = combs[i][0];
            let relativeTag = combs[i][1];
            
            let target = state.objects[targetTag];
            let relative = state.objects[relativeTag];
            
            if (targetTag != relativeTag) {
                if (relation == "inside") {
                    if (!(target.size == "large" && relative.size == "small")) {
                        if (!((target.form == "pyramid" || target.form == "plank" || target.form == "box") && target.size == relative.size)) {
                            if (!(target.size == "large" && relative.size == "small")
                                && relative.form == "box") {
                                result.push(combs[i]);
                            }
                        }
                    }
                } else if (relation == "ontop") {
                    if (!(target.size == "large" && relative.size == "small")) {
                        if (target.form == "box") {
                            if (relative.form == "brick" && relative.size == "large") {
                                result.push(combs[i]);
                            }
                        } else if (target.form == "ball") {
                            if (relative.form == "floor" || relative.form == "box") {
                                result.push(combs[i]);
                            }
                        } else if (!(relative.form == "ball")) {
                            result.push(combs[i]);
                        }
                    }
                } else {
                    result.push(combs[i]);
                }
            }
            
        }
        
        return result;
    }
    
    // returns list of tags for objects satisfying 'entity' in world 'state'
    function getPossibleEntitieTags(entity,state : WorldState) : string[] {
        
        // return value
        var result : any[] = [];
        
        let targetObject = entity.object;
        if (targetObject.location == null) {
            let matchingStateObjectTags = filterFeatures(targetObject,state);
            result = matchingStateObjectTags;
        } else {
            let location = targetObject.location;
            let relation = location.relation;
            let relativeEntity = location.entity;
            
            targetObject = targetObject.object;
            
            let possibleTargetTags = filterFeatures(targetObject,state);
            
            let possibleRelativeTags = getPossibleEntitieTags(relativeEntity,state);
            
            for (let i = 0; i < possibleTargetTags.length; i++) {
                let thisPossibleTargetTag = possibleTargetTags[i];
                for (let j = 0; j < possibleRelativeTags.length; j++) {
                    let thisRelativeTag = possibleRelativeTags[j];
                    let thisPossibleTarget = state.objects[thisPossibleTargetTag];
                    let thisRelative = state.objects[thisRelativeTag];
                    if (relation == "inside") {
                        if (thisRelative.form == "box"
                            && isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                            && stackIndexOf(thisPossibleTargetTag,state) == stackIndexOf(thisRelativeTag,state) + 1
                            ) {
                                if (!(thisPossibleTarget.size == "large" && thisRelative.size == "small")) {
                                    result.push(thisPossibleTargetTag);
                                }
                        }
                    } else if (relation == "ontop") {
                        if (isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                            && stackIndexOf(thisPossibleTargetTag,state) == stackIndexOf(thisRelativeTag,state) + 1
                            ) {
                                result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "above") {
                        if (isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                            && stackIndexOf(thisPossibleTargetTag,state) > stackIndexOf(thisRelativeTag,state)
                            ) {
                                result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "under") {
                        if (isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                            && stackIndexOf(thisPossibleTargetTag,state) < stackIndexOf(thisRelativeTag,state)
                            ) {
                                result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "beside") {
                        if (Math.abs(stackIndex(thisPossibleTargetTag,state) - stackIndex(thisRelativeTag,state)) == 1) {
                            result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "leftof") {
                        if (stackIndex(thisPossibleTargetTag,state) - stackIndex(thisRelativeTag,state) == -1) {
                            result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "rightof") {
                        if (stackIndex(thisPossibleTargetTag,state) - stackIndex(thisRelativeTag,state) == 1) {
                            result.push(thisPossibleTargetTag);
                        }
                    }
                }
            }
        }
        
        return result;
    }
    
    // returns the index of 'thisPossibleTargetTag' in it's respective stack
    function stackIndexOf(thisPossibleTargetTag : string, state : WorldState) : number {
        let stacks : string[][] = state.stacks;
        for (let i = 0; i < stacks.length; i++) {
            let stackIndexOf = stacks[i].indexOf(thisPossibleTargetTag);
            if (stackIndexOf > -1) return stackIndexOf;
        }
        return -1;
    }
    
    // returns the stack index of 'thisPossibleTargetTag'
    function stackIndex(thisPossibleTargetTag : string, state : WorldState) : number {
        let stacks : string[][] = state.stacks;
        for (let i = 0; i < stacks.length; i++) {
            let stackIndexOf = stacks[i].indexOf(thisPossibleTargetTag);
            if (stackIndexOf > -1) return i;
        }
        return -1;
    }
    
    // returns true if 'thisPossibleTargetTag' and 'thisRelativeTag' are in the same stack
    function isInSameStack(thisPossibleTargetTag : string,
                           thisRelativeTag : string,
                           state : WorldState) : boolean {
        let stackIndexTarget : number = stackIndex(thisPossibleTargetTag,state);
        let stackIndexRelative : number = stackIndex(thisRelativeTag,state);
        return (stackIndexTarget > -1) && (stackIndexTarget == stackIndexRelative);
    }
    
    // returns list of objects in 'stateObjects' matching 'targetObject' w.r.t the following features
    let matchFeatures = ["size","color","form"];
    function filterFeatures(targetObject,state : WorldState) : string[] {
        
        if (targetObject.form == "floor") {
            return ["floor"];
        }
        
        // return value
        var result : any[] = [];
        
        let stateObjects = state.objects;
        
        for (let objTag in stateObjects) {
            if (stackIndex(objTag,state) == -1) continue;
            let objectMatch : boolean = true;
            for (let i = 0; i < matchFeatures.length; i++) {
                let feature = matchFeatures[i];
                if (targetObject[feature] == null || targetObject[feature] == "anyform" || targetObject[feature] == "anysize") continue;
                if (targetObject[feature] != stateObjects[objTag][feature]) {
                    objectMatch = false;
                    break;
                }
            }
            if (objectMatch) result.push(objTag);
        }
        return result;
    }
    
    // calculate the cartesian product of lists
    function cartesianProd(l1, l2) {
        let arg = [l1, l2];
        let max = arg.length-1;
        let r = [];
        function helper(arr, i) {
            for (var j=0, l=arg[i].length; j<l; j++)
            {
                var a = arr.slice(0); // clone arr
                a.push(arg[i][j]);
                if (i==max)
                    r.push(a);
                else
                    helper(a, i+1);
            }
        }
        helper([], 0);
        return r;
    }
}

