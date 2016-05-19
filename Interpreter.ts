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
* In general, the module can take a list of possible parses and return
* a list of possible interpretations.
*/
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

/**
Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. 
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
                if (result.interpretation) interpretations.push(result);
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
        }).join(" | ");
    }

    export function stringifyLiteral(lit : Literal) : string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private functions
    /**
     * @param cmd The actual command. 
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     * @throws An error when no valid interpretations can be found
     */
function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula {
        let command = cmd.command; 
        let interpretation : DNFFormula = [];
        
        if (command == "take") {
            let targetEntity = cmd.entity;
            let possibleTargetTags = getPossibleEntitieTags(targetEntity,state);

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
            
            // relative
            let relativeEntity = cmd.location.entity;
            let possibleRelativeTags = getPossibleEntitieTags(relativeEntity,state);
            
            let combs : string[][] = cartesianProd(possibleTargetTags,possibleRelativeTags);
            combs = assertPhysicalLaws(combs,cmd.location.relation,state);
            
            for (let i = 0; i < combs.length; i++) {
                let comb = combs[i];
                interpretation.push(
                    [{polarity: true, relation: cmd.location.relation, args: [comb[0],comb[1]]}]
                );
            }
        }

        if (interpretation.length == 0) return undefined;
        return interpretation;
    }
    
    
    // returns list of tags for objects satisfying 'entity' in world 'state'
    function getPossibleEntitieTags(entity : any, state : WorldState) : string[] {
        
        // return value
        var result : any[] = [];
        let targetObject = entity.object;

        if (targetObject.location == null) {
            let matchingStateObjectTags = filterFeatures(targetObject, state);
            result.push(matchingStateObjectTags);    
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
                            && stackIndexOf(thisPossibleTargetTag,state) == stackIndexOf(thisRelativeTag,state) + 1) 
                        {
                                if (!(thisPossibleTarget.size == "large" && thisRelative.size == "small")) 
                                {
                                    result.push(thisPossibleTargetTag);
                                }
                        }
                    } else if (relation == "ontop") {
                        if ((isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                                && stackIndexOf(thisPossibleTargetTag,state) == stackIndexOf(thisRelativeTag,state) + 1) 
                            || (thisRelativeTag == "floor"&& stackIndexOf(thisPossibleTargetTag,state) == 0)) 
                        {
                                result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "above") {
                        if ((isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                                && stackIndexOf(thisPossibleTargetTag,state) > stackIndexOf(thisRelativeTag,state)) 
                            || (thisRelativeTag == "floor")) 
                        {
                                result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "under") {
                        if (isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                            && stackIndexOf(thisPossibleTargetTag,state) < stackIndexOf(thisRelativeTag,state)) 
                        {
                                result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "beside") {
                        if (Math.abs(stackIndex(thisPossibleTargetTag,state) - stackIndex(thisRelativeTag,state)) == 1) 
                        {
                            result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "leftof") {
                        if (stackIndex(thisPossibleTargetTag,state) - stackIndex(thisRelativeTag,state) == -1) 
                        {
                            result.push(thisPossibleTargetTag);
                        }
                    } else if (relation == "rightof") {
                        if (stackIndex(thisPossibleTargetTag,state) - stackIndex(thisRelativeTag,state) == 1) 
                        {
                            result.push(thisPossibleTargetTag);
                        }
                    }
                }
            }
        }
        return result;
}


	 // Imply the physical laws
    function assertPhysicalLaws(combs : any, relation : any, state : any) {
        // return value
        let result : any = [];
        
        for (let i = 0; i < combs.length; i++) {
            let targetTag = combs[i][0];
            let relativeTag = combs[i][1];
            let target = state.objects[targetTag];
            let relative;
            if (relativeTag == "floor") {
                relative = {"size":null,"color":null,"form":"floor"};
            } else {
                relative = state.objects[relativeTag];
            }
            
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
                            if (relativeTag == "floor" || relative.form == "floor" || relative.form == "box") {
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
        
        return ((stackIndexTarget > -1) && (stackIndexTarget == stackIndexRelative))
               || thisRelativeTag == "floor";
    }
 
    // returns list of objects in 'stateObjects' matching 'targetObject' w.r.t the following features
    let matchFeatures = ["size","color","form"];
    function filterFeatures(targetObject : any, state : WorldState) : string[] {
        
        if (('form' in targetObject) && targetObject.form == "floor") {
            return ["floor"];
        }
        
        // return value
        var result : any[] = [];
        let stateObjects : any = state.objects;
        
        for (let objTag in stateObjects) {
            if (stackIndex(objTag, state) == -1 && state.holding != objTag) continue ;
            let objectMatch : boolean = true;
            for (let i: any = 0; i < matchFeatures.length; i++) {
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
    
 
    // return the cartesian product of l1, l2
    function cartesianProd(l1 : any, l2 : any) : string[][] {
        
        // return value
        let result : string[][] = [];
        
        for (let i = 0; i < l1.length; i++) {
            for (let j = 0; j < l2.length; j++) {
                result.push([l1[i],l2[j]]);
            }
        }
        
        return result;
    }
}
