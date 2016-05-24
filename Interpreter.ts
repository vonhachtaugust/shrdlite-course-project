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
                if (checkRelation("holding",[possibleTargetTag],state)) {
                    interpretation.push(
                        [{polarity: true, relation: "holding", args: [possibleTargetTag]}]
                    );
                }
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
        } else if (command == "put") {
            // target
            let targetTag = state.holding;
            
            // relative
            let relativeEntity = cmd.location.entity;
            let possibleRelativeTags = getPossibleEntitieTags(relativeEntity,state);
            
            console.log("in interpretCommand()")
            console.log("possibleRelativeTags: ")
            console.log(possibleRelativeTags)
            
            let combs : string[][] = cartesianProd([targetTag],possibleRelativeTags);
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
                    
                    let thisRelative;
                    if (thisRelativeTag == "floor") {
                        thisRelative = {"size":null,"color":null,"form":"floor"};
                    } else {
                        thisRelative = state.objects[thisRelativeTag];
                    }
                    
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
            
            if (checkRelation(relation,[targetTag,relativeTag],state)) {
                result.push(combs[i]);
            }
            
        }
        return result;
    }
   
 
    // returns the index of 'thisPossibleTargetTag' in it's respective stack
    export function stackIndexOf(thisPossibleTargetTag : string, state : WorldState) : number {
        let stacks : string[][] = state.stacks;
        
        if (thisPossibleTargetTag == "floor") return -1;

        for (let i = 0; i < stacks.length; i++) {
            let stackIndexOf = stacks[i].indexOf(thisPossibleTargetTag);
            if (stackIndexOf > -1) return stackIndexOf;
        }
        return undefined;
    }
    

    // returns the stack index of 'thisPossibleTargetTag'
    export function stackIndex(thisPossibleTargetTag : string, state : WorldState) : number {
        let stacks : string[][] = state.stacks;

        for (let i = 0; i < stacks.length; i++) {
            let stackIndexOf = stacks[i].indexOf(thisPossibleTargetTag);
            if (stackIndexOf > -1) return i;
        }
        return undefined;
    }
    
 
    // returns true if 'thisPossibleTargetTag' and 'thisRelativeTag' are in the same stack
    export function isInSameStack(thisPossibleTargetTag : string,
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
    
    /**
     * evaluate if relation is possible within certain WorldState
     */
    export function checkRelation(rel : string, args : string[], state : WorldState) : boolean {
        
        if (args.length == 1) {
            
            // entity a
            let a;
            if (args[0] == "floor") {
                a = {"size":null,"color":null,"form":"floor"};
            } else {
                a = state.objects[args[0]];
            }
            
            if (rel == "holding") {
                
                // arm cannot hold floor
                if (a.form == "floor") {
                    return false;
                }
                
            } else {
                // relation not defined for one argument
                return true;
            }
            
        } else if (args.length == 2) {
            
            // entity a
            let a = state.objects[args[0]];
            
            // entity b
            let b;
            if (args[1] == "floor") {
                b = {"size":null,"color":null,"form":"floor"};
            } else {
                b = state.objects[args[1]];
            }
            
            // 'ontop' is called 'inside' if 'b' is a box
            if (b.form == "box" && rel == "ontop") {
                rel = "inside";
            }
            
            // an object cannot be in relation with itself
            if (a == b) {
                return false;
            }
            
            if (rel == "ontop") {
                
                // Balls must be in boxes or on the floor
                if (a.form == "ball") {
                    if (b.form != "floor" && b.form != "box") {
                        return false;
                    }
                }
                
                // Balls cannot support anything
                if (b.form == "ball") {
                    return false;
                }
                
                // Small objects cannot support large objects
                if (a.size == "large" && b.size == "small") {
                    return false;
                }
                
                // Small boxes cannot be supported by small bricks or pyramids
                if (a.form == "box" && a.size == "small") {
                    if (b.form == "pyramid" && b.size == "small") {
                        return false;
                    }
                    if (b.form == "brick" && b.size == "small") {
                        return false;
                    }
                }
                
                // Large boxes cannot be supported by large pyramids
                if (a.form == "box" && a.size == "large") {
                    if (b.form == "pyramid" && b.size == "large") {
                        return false;
                    }
                }
                
            } else if (rel == "inside") {
                
                // Small objects cannot support large objects
                if (a.size == "large" && b.size == "small") {
                    return false;
                }
                
                // Boxes cannot contain pyramids, planks or boxes of the same size
                if (b.form == "box") {
                    if (a.size == b.size) {
                        if (a.form == "pyramid" || a.form == "plank" || a.form == "box") {
                            return false;
                        }
                    }
                }
                
            } else {
                // relation not defined for two args
                return true;
            }
        } else {
            // too many arguments
            return false;
        }
        
        return true;
    }
}
