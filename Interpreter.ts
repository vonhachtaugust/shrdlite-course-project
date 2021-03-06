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
    var currentParseEvaluated = 0;
    var whichParseInfoText = "";
    var hasPrintedAmguityInfo : boolean = false;
    var currentPossibleTargetTags : any = [];
/**
Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. 
* @param parses List of parses produced by the Parser.
* @param currentState The current state of the world.
* @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
*/    
    export function interpret(parses : Parser.ParseResult[], currentState : WorldState) : InterpretationResult[] {
        var errors : Error[] = [];
        var interpretations : InterpretationResult[] = [];
        let successfulInterpretation : any;
        parses.forEach((parseresult) => {
            currentParseEvaluated++;
            if (parses.length > 1) {
                whichParseInfoText = "Evaluating parse " + currentParseEvaluated + "\n";
            } else {
                whichParseInfoText = "";
            }
            try {
                var result : InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                result.targetTags = currentPossibleTargetTags;
                interpretations.push(result);
                successfulInterpretation = currentParseEvaluated;
            } catch(err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            if (parses.length > 1 && interpretations.length == 1 && hasPrintedAmguityInfo) {
                systemPrint("Only parse " + successfulInterpretation + " was possible")
            }
            hasPrintedAmguityInfo = false;
            currentParseEvaluated = 0;
            return interpretations;
        } else {
            hasPrintedAmguityInfo = false;
            currentParseEvaluated = 0;
            // only throw the first error found
            throw errors[0];
        }
    }
    
    export function systemPrint (string:any) :any {
        if (typeof document != "undefined") {
            //document.getElementById("dialogue").innerHTML += "<p class='system'>" + string + "</p>";
            alert(string);
        }
    }

    export interface InterpretationResult extends Parser.ParseResult {
        interpretation : DNFFormula;
        targetTags : string[];
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
    
        // Inverse relation map
        let inverseRelation : any= {};
        inverseRelation["ontop"] = "under";
        inverseRelation["inside"] = "under";
        inverseRelation["above"] = "under";
        inverseRelation["under"] = "above";
        inverseRelation["beside"] = "beside";
        inverseRelation["rightof"] = "leftof";
        inverseRelation["leftof"] = "rightof";
        
        if (command == "take") {
            let targetEntity = cmd.entity;
            let possibleTargetTags = getPossibleEntitieTags(targetEntity,state);
            let targetQuantifier = targetEntity.quantifier;
            
            if (targetQuantifier == "the") {
                if (possibleTargetTags.length > 1) {
                    
                    // several options for targetEntity, user must specify
                    let targetTag = promptIdentifyEntityTag(targetEntity.object, possibleTargetTags, state);
                    
                    if (typeof targetTag == "undefined") {
                        throw "No such entity in the world";
                    } else {
                        possibleTargetTags = [targetTag];
                        targetQuantifier = "any"
                    }
                } else {
                    // there is only one matching object, treat entity quantifier as 'any'
                    targetQuantifier = "any"
                }
            }
            if (targetQuantifier == "all") {
                if (possibleTargetTags.length == 1) {
                    // there is only one matching object, treat entity quantifier as 'any'
                    targetQuantifier = "any"
                } else {
                    throw "Cannot hold more than one object";
                }
            }
            if (targetQuantifier == "any") {
                for (let i = 0; i < possibleTargetTags.length; i++) {
                    let possibleTargetTag = possibleTargetTags[i];
                    if (checkRelation("holding",[possibleTargetTag],state)) {
                        interpretation.push(
                            [{polarity: true, relation: "holding", args: [possibleTargetTag]}]
                        );
                    }
                }
            }
            
            // pass 'possibleTargetTags' on to Shrdlite
            currentPossibleTargetTags = possibleTargetTags;

        } else if (command == "move") {
            // target
            let targetEntity = cmd.entity;
            let possibleTargetTags = getPossibleEntitieTags(targetEntity,state);
            let targetQuantifier = targetEntity.quantifier;
            
            // relative
            let relativeEntity = cmd.location.entity;
            let possibleRelativeTags = getPossibleEntitieTags(relativeEntity,state);
            let relativeQuantifier = relativeEntity.quantifier;
            
            if (targetQuantifier == "the") {
                if (possibleTargetTags.length > 1) {
                    
                    // several options for targetEntity, user must specify
                    let targetTag = promptIdentifyEntityTag(targetEntity, possibleTargetTags, state);
                    
                    if (typeof targetTag == "undefined") {
                        throw "No such entity in the world";
                    } else {
                        possibleTargetTags = [targetTag];
                        targetQuantifier = "any"
                    }
                } else {
                    // there is one matching object at the most, treat entity quantifier as 'any'
                    targetQuantifier = "any"
                }
            }
            if (relativeQuantifier == "the") {
                if (possibleRelativeTags.length > 1) {
                    
                    // several options for targetEntity, user must specify
                    let relativeTag = promptIdentifyEntityTag(relativeEntity, possibleRelativeTags, state);
                    
                    if (typeof relativeTag == "undefined") {
                        throw "No such entity in the world";
                    } else {
                        possibleRelativeTags = [relativeTag];
                        relativeQuantifier = "any"
                    }
                } else {
                    // there is one matching object at the most, treat entity quantifier as 'any'
                    relativeQuantifier = "any"
                }
            }
            if (targetQuantifier == "any" && relativeQuantifier != "all") {
                let combs : string[][] = cartesianProd(possibleTargetTags,possibleRelativeTags);
                combs = assertPhysicalLaws(combs,cmd.location.relation,state);
                for (let i = 0; i < combs.length; i++) {
                    let comb = combs[i];
                    interpretation.push(
                        [{polarity: true, relation: cmd.location.relation, args: [comb[0],comb[1]]}]
                    );
                }
            }
            if (targetQuantifier == "all" && relativeQuantifier == "any") {
            
                if (cmd.location.relation == "inside") {
                    if (possibleTargetTags.length > possibleRelativeTags.length) {
                        throw "Not enough boxes";
                    }
                }
                
                let combConjs = getCombinatedConjunctions(possibleTargetTags,
                                                          possibleRelativeTags,
                                                          cmd.location.relation,
                                                          state
                                                         );
                for (let i = 0; i < combConjs.length; i++) {
                    let allPossible = true;
                    for (let j = 0; j < combConjs[i].length; j++) {
                        allPossible = allPossible
                                      && checkRelation(combConjs[i][j].relation, combConjs[i][j].args, state);
                    }
                    if (allPossible) interpretation.push(combConjs[i])
                }
            } else if (targetQuantifier == "any" && relativeQuantifier == "all") {
            
                let relativeCombs = combinations(possibleRelativeTags, possibleTargetTags.length);
                
                for (let i  = 0; i < relativeCombs.length; i++) {
                    let thisConjunction :any = [];
                    let thisComb = relativeCombs[i];
                    for (let j = 0; j < possibleTargetTags.length; j++) {
                        thisConjunction.push(
                            {polarity: true,
                             relation: cmd.location.relation,
                             args: [possibleTargetTags[j],thisComb[j]]}
                        );
                    }
                    interpretation.push(thisConjunction);
                }
                
            } else if (targetQuantifier == "all" && relativeQuantifier == "all") {
                
                let combs : string[][] = cartesianProd(possibleTargetTags,possibleRelativeTags);
                
                let conjunctions :any = [];
                for (let i = 0; i < combs.length; i++) {
                    let comb = combs[i];
                    if (checkRelation(cmd.location.relation, [comb[0],comb[1]], state)) {
                        conjunctions.push(
                            {polarity: true, relation: cmd.location.relation, args: [comb[0],comb[1]]}
                        );
                    }
                }
                interpretation.push(conjunctions)
            }
            
            // pass 'possibleTargetTags' on to Shrdlite
            currentPossibleTargetTags = possibleTargetTags;
            
        } else if (command == "put") {
            // target
            let targetTag = state.holding;
            
            // relative
            let relativeEntity = cmd.location.entity;
            let possibleRelativeTags = getPossibleEntitieTags(relativeEntity,state);
            
            let combs : string[][] = cartesianProd([targetTag],possibleRelativeTags);
            combs = assertPhysicalLaws(combs,cmd.location.relation,state);
            
            for (let i = 0; i < combs.length; i++) {
                let comb = combs[i];
                interpretation.push(
                    [{polarity: true, relation: cmd.location.relation, args: [comb[0],comb[1]]}]
                );
            }
            
            // pass 'possibleTargetTags' on to Shrdlite
            currentPossibleTargetTags = [targetTag];
        }
        
        if (interpretation.length == 0) {
            throw "This is not possible in this world."
        }
        return interpretation;
    }
    
    function getCombinatedConjunctions(possibleTargetTags:any, possibleRelativeTags: any, rel:any, state:any) : Interpreter.DNFFormula {
        let interpretation :any = [];
        
        let numTargetTags = possibleTargetTags.length;
        let relativeTagCombs = combinations(possibleRelativeTags, numTargetTags);
        
        for (let i = 0; i < relativeTagCombs.length; i++) {
            let thisComb :any = relativeTagCombs[i];
            let thisConjunction :any = [];
            let j = 0;
            while (j < possibleTargetTags.length) {
                let args = [possibleTargetTags[j], thisComb[j]];
                if (!checkRelation(rel, args, state)) {
                    break;
                }
                thisConjunction.push(
                    {polarity: true, relation: rel, args: args}
                );
                j++;
            }
            if (j != possibleTargetTags.length) {
                // one of the conjuctives is false, dont add to DNF formula
                continue;
            }
            
            interpretation.push(thisConjunction);
        }
        
        return interpretation;
    }
    
    function promptIdentifyEntityTag(targetEntity :any , possibleTargetTags : string[], state : WorldState) : string {
        
        targetEntity = Planner.cloneObject(targetEntity);
        if (targetEntity.object) targetEntity = targetEntity.object;
        if (targetEntity.object) targetEntity = targetEntity.object;
        
        // figure out how to denot 'targetEntity' in natural language
        let targetEntityText : string = stringifyEntity(targetEntity);
        
        let IdFeatures = ["size","color","form"];
        
        let cmpTagsFcn :any = function(a:any,b:any) {
            if (a.score < b.score) {
                return -1;
            } else if (a.score == b.score) {
                return 0;
            } else {
                return 1;
            }
        }
        let featureQueue : collections.PriorityQueue<any> = new collections.PriorityQueue<any>(cmpTagsFcn);
        
        for (let i = 0; i < IdFeatures.length; i++) {
            let thisFeature = IdFeatures[i];
            
            // generate a mapping from features values to number of entities with this value
            let featureValVsNumberMap = getFeatureValVsNumberMap(possibleTargetTags, thisFeature, state);
            
            // calculate the number of elements which are uniquely determined by 'thisFeature'
            let numUniqueIDs = featureValVsNumberMap.values().splice(0)
                               .filter(function(val,ind,arr){return val == 1;})
                               .length;
            if (targetEntity[thisFeature] == null || targetEntity[thisFeature].substring(0,3) == "any") {
                featureQueue.enqueue({feature:thisFeature,score:numUniqueIDs});
            }
        }
        
        if (whichParseInfoText != "" && !hasPrintedAmguityInfo) {
            systemPrint("Your command can be interpreted in several ways (multiple parses). All parses will be evaluated.")
            hasPrintedAmguityInfo = true;
        }
        
        while (featureQueue.size() > 0) {
            let thisFeature = featureQueue.dequeue();
            thisFeature = thisFeature.feature;
            targetEntity[thisFeature] = window.prompt(whichParseInfoText + "Please specificy the " + thisFeature + " of the " + targetEntityText, "");
            targetEntityText = stringifyEntity(targetEntity); // update the entity text
            let newPossibleTargetTags = filterFeatures(targetEntity, state);
            possibleTargetTags = arrayIntersection(possibleTargetTags, newPossibleTargetTags);
            
            if (possibleTargetTags.length <= 1) {
                break;
            }
        }
        
        if (possibleTargetTags.length > 1) {
            // try asking for stack index
            let objStackIndex = window.prompt(whichParseInfoText + "Please specificy in which stack the " + targetEntityText + " is", "0-" + (state.stacks.length-1));
            
            if (objStackIndex != null) {
                let newPossibleTargetTags :any= [];
                for (let i = 0; i < possibleTargetTags.length; i++) {
                    if (stackIndex(possibleTargetTags[i],state) == parseInt(objStackIndex)) {
                        newPossibleTargetTags.push(possibleTargetTags[i]);
                    }
                }
                possibleTargetTags = newPossibleTargetTags;
            }
        }
        
        if (possibleTargetTags.length > 1) {
            // try asking for position in stack
            let objStackIndexOf = window.prompt(whichParseInfoText + "Please specificy the position of the " + targetEntityText + " in it's stack, 0 being the lowest", "");
            
            if (objStackIndexOf != null) {
                let newPossibleTargetTags : any = [];
                for (let i = 0; i < possibleTargetTags.length; i++) {
                    if (stackIndexOf(possibleTargetTags[i],state) == parseInt(objStackIndexOf)) {
                        newPossibleTargetTags.push(possibleTargetTags[i]);
                    }
                }
                possibleTargetTags = newPossibleTargetTags;
            }
        }
        
        if (possibleTargetTags.length > 1) {
            throw "could not uniquely identify the object you specified";
        }
        return possibleTargetTags[0];
    }
    
    function stringifyEntity(targetEntity:any) : string {
        if (targetEntity.object) targetEntity = targetEntity.object;
        let targetEntityText : string;
        let targetEntityTextParts : string[];
        targetEntityTextParts = [];
        for (let prop in targetEntity) {
            if (targetEntity[prop] != null) {
                targetEntityTextParts.push(targetEntity[prop]);
            }
        }
        targetEntityText = targetEntityTextParts.join(" ");
        if (targetEntityText.indexOf("anyform") > -1) {
            targetEntityText = targetEntityText.replace("anyform","object");
        } else if (targetEntity["form"] == null) {
            targetEntityText += " object";
        }
        
        return targetEntityText;
    }
    
    export function arrayIntersection(xs :any, ys:any) {
        
        // return value
        let res :any= [];
        
        let short:any;
        let long:any;
        if (xs.length < ys.length) {
            short = xs;
            long = ys;
        } else {
            short = ys;
            long = xs;
        }
        
        for (let i = 0; i < short.length; i++) {
            let x = short[i];
            if (long.indexOf(x) > -1) {
                res.push(x);
            }
        }
        
        return res;
    }
    
    /**
     * generate a list of all combinations of length 'l' of the elements in 'list'
     * 
     * @param list array of elements to combine
     * @param l length of the combinations
     */
    export function combinations(list : any, l: any) {
        var holdingArr :any = [];
        var recursiveComb: any = function(singleSolution:any) {
            if (singleSolution.length > l-1) {
                holdingArr.push(singleSolution);
                return;
            }
            for (var i=0; i < list.length; i++) {
                recursiveComb(singleSolution.concat([list[i]]));
            }
        };
        recursiveComb([]);
        return holdingArr;
    };
    
    function getFeatureValVsNumberMap(possibleTargetTags : string[],
                                      thisFeature : string,
                                      state : WorldState
                                     ) : collections.Dictionary<string,number> {
        
        // maps feature values to number of entities that has that value
        let featureValVsNumberMap : collections.Dictionary<string,number> = new collections.Dictionary<string,number>();
        
        for (let j = 0; j < possibleTargetTags.length; j++) {
            let thisEntityFeatureVal:string = state.objects[possibleTargetTags[j]][thisFeature];
            
            // check if this feature value has occured before
            if (!featureValVsNumberMap.containsKey(thisEntityFeatureVal)) {
                featureValVsNumberMap.setValue(thisEntityFeatureVal,1);
            } else {
                let currentVal = featureValVsNumberMap.getValue(thisEntityFeatureVal);
                
                // save this occurence
                featureValVsNumberMap.setValue(thisEntityFeatureVal, currentVal + 1);
            }
        }
        
        return featureValVsNumberMap;
    }
    
    // returns list of tags for objects satisfying 'entity' in world 'state'
    export function getPossibleEntitieTags(entity : any, state : WorldState) : string[] {
        // return value
        var result : any[] = [];
        let targetObject = entity;
        if (targetObject.object) targetObject = targetObject.object;

        if (targetObject.location == null) {
            let matchingStateObjectTags = filterFeatures(targetObject, state);
            
            if (entity.quantifier == "the" && matchingStateObjectTags.length > 1) {
                let possibleRelativeTag = promptIdentifyEntityTag(targetObject, matchingStateObjectTags, state);
                if (possibleRelativeTag) {
                    // if able to identify
                    matchingStateObjectTags = [possibleRelativeTag];
                }
            }
            
            result = matchingStateObjectTags;
        } else {
            let location = targetObject.location;
            let relation = location.relation;
            let relativeEntity = location.entity;
            let relativeObject = location.entity.object;
            let relativeQuantifier = location.entity.quantifier;
            
            if (targetObject.object) targetObject = targetObject.object;
            
            let possibleTargetTags = filterFeatures(targetObject,state);
            let possibleRelativeTags = getPossibleEntitieTags(relativeEntity,state);
            
            if (entity.quantifier == "the" && possibleRelativeTags.length > 1) {
                let possibleRelativeTag = promptIdentifyEntityTag(targetObject, possibleRelativeTags, state);
                if (possibleRelativeTag) {
                    // if able to identify
                    possibleRelativeTags = [possibleRelativeTag];
                }
            }
            
            for (let i = 0; i < possibleTargetTags.length; i++) {
                let thisPossibleTargetTag = possibleTargetTags[i];
                let push = (relativeQuantifier == "all"); // standard action for 'thisPossibleTargetTag'
                for (let j = 0; j < possibleRelativeTags.length; j++) {
                    let thisRelativeTag = possibleRelativeTags[j];
                    let thisPossibleTarget = state.objects[thisPossibleTargetTag];
                    
                    let thisRelativeIsRelated = false;
                    
                    let thisRelative: any;
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
                                    thisRelativeIsRelated = true;
                                }
                        }
                    } else if (relation == "ontop") {
                        if ((isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                                && stackIndexOf(thisPossibleTargetTag,state) == stackIndexOf(thisRelativeTag,state) + 1) 
                            || (thisRelativeTag == "floor"&& stackIndexOf(thisPossibleTargetTag,state) == 0)) 
                        {
                                thisRelativeIsRelated = true;
                        }
                    } else if (relation == "above") {
                        if ((isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                                && stackIndexOf(thisPossibleTargetTag,state) > stackIndexOf(thisRelativeTag,state)) 
                            || (thisRelativeTag == "floor")) 
                        {
                                thisRelativeIsRelated = true;
                        }
                    } else if (relation == "under") {
                        if (isInSameStack(thisPossibleTargetTag,thisRelativeTag,state)
                            && stackIndexOf(thisPossibleTargetTag,state) < stackIndexOf(thisRelativeTag,state)) 
                        {
                                thisRelativeIsRelated = true;
                        }
                    } else if (relation == "beside") {
                        if (Math.abs(stackIndex(thisPossibleTargetTag,state) - stackIndex(thisRelativeTag,state)) == 1) 
                        {
                            thisRelativeIsRelated = true;
                        }
                    } else if (relation == "leftof") {
                        if (stackIndex(thisPossibleTargetTag,state) < stackIndex(thisRelativeTag,state) ) 
                        {
                            thisRelativeIsRelated = true;
                        }
                    } else if (relation == "rightof") {
                        if (stackIndex(thisPossibleTargetTag,state) > stackIndex(thisRelativeTag,state) ) 
                        {
                            thisRelativeIsRelated = true;
                        }
                    }
                    if (relativeQuantifier == "all") {
                        push = push && thisRelativeIsRelated;
                    } else {
                        push = push || thisRelativeIsRelated;
                    }
                }
                if (push) {
                    result.push(thisPossibleTargetTag);
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
        
        if (targetObject.object) targetObject = targetObject.object;
        
        if (('form' in targetObject) && targetObject.form == "floor") {
            return ["floor"];
        }
        
        // return value
        var result : any[] = [];
        let stateObjects : any = state.objects;
        
        for (let objTag in stateObjects) {
            if (stackIndex(objTag, state) == undefined && state.holding != objTag) continue ;
            let objectMatch : boolean = true;
            for (let i: any = 0; i < matchFeatures.length; i++) {
                let feature = matchFeatures[i];
                if (targetObject[feature] == null || targetObject[feature] == "anyform" || targetObject[feature] == "anysize" || targetObject[feature] == "anycolor") continue;
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
     * count the number of occurences of 'x' in 'xs'
     * 
     * @param x the element search for
     * @param xs the array in which to search
     */
    function count(x:any, xs:any) : number {
        
        // return value
        let res = 0;
        
        for (let i = 0; i < xs.length; i++) {
            if (x == xs[i]) {
                res++;
            }
        }
        
        return res;
    }
    
    /**
     * evaluate if relation is possible within certain WorldState
     */
    export function checkRelation(rel : string, args : string[], state : WorldState) : boolean {
        
        if (args.length == 1) {
            
            // entity a
            let a:any;
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
            let b:any;
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
