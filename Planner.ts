///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>

/** 
* Planner module
*
* The goal of the Planner module is to take the interpetation(s)
* produced by the Interpreter module and to plan a sequence of actions
* for the robot to put the world into a state compatible with the
* user's command, i.e. to achieve what the user wanted.
*
* The planner should use your A* search implementation to find a plan.
*/
module Planner {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
     * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter. 
     * @param interpretations List of possible interpretations.
     * @param currentState The current state of the world.
     * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
     */
    export function plan(interpretations: Interpreter.InterpretationResult[], currentState: WorldState): PlannerResult[] {
        var errors: Error[] = [];
        var plans: PlannerResult[] = [];
        interpretations.forEach((interpretation) => {
            try {
                var result: PlannerResult = <PlannerResult>interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            } catch (err) {
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface PlannerResult extends Interpreter.InterpretationResult {
        plan: string[];
    }

    export function stringify(result: PlannerResult): string {
        return result.plan.join(", ");
    }

    //////////////////////////////////////////////////////////////////////
    // private functions

    /**
     * The core planner function. The code here is just a template;
     * you should rewrite this function entirely. In this template,
     * the code produces a dummy plan which is not connected to the
     * argument `interpretation`, but your version of the function
     * should be such that the resulting plan depends on
     * `interpretation`.
     *
     * 
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
     */
    function planInterpretation(interpretation: Interpreter.DNFFormula, state: WorldState): string[] {

        let stateGraph: StateGraph = new StateGraph();
        var isGoal = (n: any) => goal(interpretation, n);
        var heuristic = (n: any) => heuristicFunction(n, interpretation);
        
        let path = aStarSearch(
            stateGraph,
            state,
            isGoal,
            heuristic,
            10
        );
        
        if (typeof path == "undefined") {
            throw "Timeout. Maybe no path exists?";
        }
        
        let stateSequence = path.path;
        stateSequence.unshift(state);
        
        return pathToPlan(stateSequence);
    }
    
    function pathToPlan(path : WorldState[]) : string[] {
        
        // return value
        let result : string[] = [];
        
        for (let i = 1; i < path.length; i++) {
            let currentState = path[i-1];
            let nextState = path[i];
            
            if (currentState.arm < nextState.arm) {
                // moved arm to the right
                result.push("r");
            } else if (currentState.arm > nextState.arm) {
                // moved arm to the left
                result.push("l");
            } else {
                // dropped or picked up
                if (currentState.holding != null && nextState.holding == null) {
                    // dropped
                    result.push("d");
                } else if (currentState.holding == null && nextState.holding != null) {
                    // picked up
                    result.push("p");
                } else {
                    console.error("pathToPlan() got invalid path: " + path);
                }
            }
        }
        return result;
    }

    /**
     * function used by isGoal to check the current world state with the interpretation
     */
     function goal(interpretation: Interpreter.DNFFormula, state: WorldState): boolean {
        // for each found interpretation
        for (let i = 0; i < interpretation.length; i++) {
            // for each disjunctive goal
            let thisDisjRes = true;
            for (let j = 0; j < interpretation[i].length; j++) {
                // fufill a conjunctive goal
                let thisConjRes = Planner.conjunctive(interpretation[i][j], state);
                thisDisjRes = thisDisjRes && thisConjRes;
            }
            if (thisDisjRes) {
                return true;
            }
        }
        return false;
    }

    export function conjunctive(interpretation: any, state : WorldState): boolean {
        // function assumes  previous required conditions between number of arguments given a relation etc. are handled. See Interpreter.ts
        let relation = interpretation.relation;
        let args = interpretation.args;

        if (relation == "holding") {
            return (state.holding == args[0]);
        }
        else if ((relation == "inside") || (relation == "ontop")) {
            if (Interpreter.isInSameStack(args[0], args[1], state)) {
                return (Interpreter.stackIndexOf(args[0], state) - 1 == Interpreter.stackIndexOf(args[1], state));
            }
            return false;
        }
        else if (relation ==  "above") {
            if (Interpreter.isInSameStack(args[0], args[1], state)) {
                return (Interpreter.stackIndexOf(args[0], state) > Interpreter.stackIndexOf(args[1], state));       
            }
            return false;
        }
        else if (relation == "under") {
            if (Interpreter.isInSameStack(args[0], args[1], state)) {
                return (Interpreter.stackIndexOf(args[0], state) < Interpreter.stackIndexOf(args[1], state));
            }
            return false;
        }        else if (relation == "beside") {
            return (Interpreter.stackIndex(args[0], state) + 1 == Interpreter.stackIndex(args[1], state))
            || (Interpreter.stackIndex(args[0], state) - 1 == Interpreter.stackIndex(args[1], state));
        }
        else if (relation == "leftof") {
            return (Interpreter.stackIndex(args[0], state) + 1 == Interpreter.stackIndex(args[1], state));
        }
        else if (relation == "rightof") {
            return (Interpreter.stackIndex(args[0], state) - 1 == Interpreter.stackIndex(args[1], state));
        }
        // the relation doesn't exist.
        return false;
    }


    /**
     * function for calculating the heuristic for state 's'
     */
    function heuristicFunction(state: WorldState, interpretation : Interpreter.DNFFormula) : number {
        
        let isGoal = goal(interpretation, state);
        if (isGoal) {
            return 0;
        }

        let disjGoals : Interpreter.Literal[][] = interpretation;
        
        // result heuristic will be the minimum of the heuristics for the disjunctions
        let minHeuristic = Infinity;
        
        // assumes that interpretation is a list of disjunctive goals
        for (let i = 0; i < disjGoals.length; i++) {
            
            // list of conjunctions for this disjunctive goal
            let thisDisjunction : Interpreter.Literal[] = disjGoals[i];
            
            // heuristic for this disjunction will be the sum of the heuristics for the conjunctions
            let thisHeuristic = 0;
            
            for (let j = 0; j < thisDisjunction.length; j++) {
                let thisConjunction : Interpreter.Literal = thisDisjunction[j];
                thisHeuristic += estimatedPathLength(state,thisConjunction)
            }
            
            if (thisHeuristic < minHeuristic) {
                minHeuristic = thisHeuristic;
            }
        }
        return minHeuristic;
    }
    
    function estimatedPathLength(state : WorldState, condition : Interpreter.Literal) : number {
        
        // return value
        let result : number = 0;

        //let polarity = condition.polarity; // assumed to be true for now
        let rel = condition.relation;
        let args = condition.args;

        if (rel == undefined || args == undefined) {
            console.error("Arguments = " + args + " | " + "relation = " + rel);
        }

        // 'inside' has same estimated path length as 'ontop'
        if (rel == "inside") {
            rel = "ontop";
        }

        if (rel == "holding") 
        {
            if (args.length == 1) {

                let targetTag = args[0];
                
                if (targetTag == state.holding) {
                    // already holding desired object
                    return 0;
                }
                
                let targetStackIndex = Interpreter.stackIndex(targetTag, state);
                let targetStackIndexOf = Interpreter.stackIndexOf(targetTag, state);
                
                if (typeof targetStackIndex == "undefined" || typeof targetStackIndexOf == "undefined") {
                    // target is the floor, or non-existing entity
                    return Infinity;
                } 
                
                // move arm to target stack
                result += Math.abs(state.arm - targetStackIndex);
                
                // number of obstacles in the way of picking up 'target'
                let numObstacles = state.stacks[targetStackIndex].length - (targetStackIndexOf + 1);
                
                // for each obstacle, pick up (+1), move away (+1), drop (+1) and move back (+1), (+4) in total
                result += 4 * numObstacles;
                
                // pick up 'target'
                result++;
            } else {
                console.error("estimatedPathLengt h() got condition 'holding' with args: " + args)
            }
        }
        else if (rel == "above" || rel == "under") {
            if (args.length == 2) {

                // target entity
                let targetTag;
                // relative entity
                let relativeTag;

                // if a under b estimated shortest path is b above a 
                if (rel == "above") {
                    targetTag = args[0];
                    relativeTag = args[1];
                } else {
                    targetTag = args[1];
                    relativeTag = args[0];
                }

                // stack position of target entity, undefined if arm is holding targetTag
                let targetStackIndex = Interpreter.stackIndex(targetTag, state);
                // stack position of relative entity, undefined if arm is holding targetTag
                let relativeStackIndex = Interpreter.stackIndex(relativeTag, state);
                
                // However, if holding then just move and drop object
                if (state.holding == targetTag) {
                    //
                    // Assumes this object can be drop ontop of underlying object
                    //
                    targetStackIndex = state.arm;
                } else {
                    // estimated cost for moving arm to stack index of targetTag
                    result += Math.abs(state.arm - targetStackIndex);
                
                    // estimated cost for picking up targetTag i.e. holding it -> see rel == "holding"
                    let holdingTargetLiteral: Interpreter.Literal = {
                        polarity: true,
                        relation: "holding",
                        args: [targetTag]
                    };
                    result += estimatedPathLength(state, holdingTargetLiteral);
                }
                // estimated cost for moving targetTag to stack index of relativeTag
                result += Math.abs(targetStackIndex - relativeStackIndex);
                
                // drop the object
                result++;
            } else {
                console.error("estimatedPathLength() got condition 'above' with args: " + args);
            }
        }
        else if (rel == "ontop") 
        {
            if (args.length == 2) {

                // target entity
                let targetTag = args[0];
                let targetStackIndex = Interpreter.stackIndex(targetTag, state);
                
                // if holding the target object, its stack index is considered the arm position
                if (state.holding == targetTag) {
                    targetStackIndex = state.arm;
                }
                
                // relative entity
                let relativeTag = args[1];
                let relativeStackIndex = Interpreter.stackIndex(relativeTag, state);
                
                // clear the stack from everything above relative
                if (relativeTag == "floor") {
                    // assume that the object will be placed under the shortest stack
                    let stackLengths = state.stacks.map(function(v,i,a){return v.length});
                    relativeStackIndex = argmin(stackLengths, targetStackIndex);
                    let numElsInShortestStack = state.stacks[relativeStackIndex].length;
                    
                    if (numElsInShortestStack > 0) {
                        // need to clear the shortest stack

                        // move the arm to the shortest stack
                        result += Math.abs(relativeStackIndex - state.arm);
                        
                        // 4 moves for each stacked object
                        result += 4 * numElsInShortestStack;
                    }
                } else {
                    let holdingRelativeLiteral : Interpreter.Literal = {
                        polarity: true,
                        relation: "holding",
                        args: [relativeTag]
                    };
                    // clearing the way for relative corresponds to holding it, but skipping picking it up
                    result += estimatedPathLength(state, holdingRelativeLiteral) - 1;
                }
                
                //
                // target should now be accessible
                //
                
                // if not already holding target
                if (state.holding != targetTag) {

                    // estimated path length for picking up 'targetTag'
                    let holdingTargetLiteral : Interpreter.Literal = {
                        polarity: true,
                        relation: "holding",
                        args: [targetTag]
                    };
                    result += estimatedPathLength(state, holdingTargetLiteral);
                }
                
                // move arm to target stack
                result += Math.abs(relativeStackIndex - targetStackIndex);
                
                // drop the object
                result++;
                
            } else {
                console.error("estimatedPathLength() got condition 'ontop' with args: " + args);
            }
        }        else if (rel == "leftof") 
        {
            if (args.length == 2) {

                // target entity
                let targetTag = args[0];
                let targetStackIndex = Interpreter.stackIndex(targetTag, state);
                let targetStackIndexOf = Interpreter.stackIndexOf(targetTag, state);

                if (state.holding == targetTag) {
                    targetStackIndex = state.arm;
                }

                //if (relativeStackIndex == 0) return Infinity;
                
                // estimated path length for picking up 'targetTag'
                let holdingTargetLiteral : Interpreter.Literal = {
                    polarity: true,
                    relation: "holding",
                    args: [targetTag]
                };
                result += estimatedPathLength(state, holdingTargetLiteral);
                
                // now holding 'target'

                // relative entity
                let relativeTag = args[1];
                let relativeStackIndex = Interpreter.stackIndex(relativeTag, state);

                if (state.holding == relativeTag) {
                    relativeStackIndex = state.arm;
                }

                // move arm to target stack
                result += Math.abs(relativeStackIndex - targetStackIndex);

                if (!(result < Infinity)) {
                    console.error("result: " + result)
                    console.log(targetTag)
                    console.log(relativeTag)
                    console.log(state)
                    console.log
                }
                
                //to go to neighbour stack
                result++;

                // drop the object
                result++;
                
            } else {
                console.error("estimatedPathLength() got condition 'leftof' with args: " + args);
            }
        }else if (rel == "rigtof") 
        {
            if (args.length == 2) {

                // target entity
                let targetTag = args[0];
                let targetStackIndex = Interpreter.stackIndex(targetTag, state);
                let targetStackIndexOf = Interpreter.stackIndexOf(targetTag, state);

                if (state.holding == targetTag) {
                    targetStackIndex = state.arm;
                }
                
                // estimated path length for picking up 'targetTag'
                        let holdingTargetLiteral : Interpreter.Literal = {
                    polarity: true,
                    relation: "holding",
                    args: [targetTag]
                };
                result += estimatedPathLength(state, holdingTargetLiteral);
                
                // now holding 'target'

                // relative entity
                let relativeTag = args[1];
                let relativeStackIndex = Interpreter.stackIndex(relativeTag, state);

                if (state.holding == relativeTag) {
                    relativeStackIndex = state.arm;
                }

                // move arm to target stack
                result += Math.abs(relativeStackIndex - targetStackIndex);
                
                //to go to neighbour stack
        result++;

              // drop the object
                result++;
                
            } else {
                console.error("estimatedPathLength() got condition 'rightof' with args: " + args);
            }
        }else if (rel == "beside") 
        {
            if (args.length == 2) {

                // target entity
                let targetTag = args[0];
                let targetStackIndex = Interpreter.stackIndex(targetTag, state);
                let targetStackIndexOf = Interpreter.stackIndexOf(targetTag, state);

                if (state.holding == targetTag) {
                    targetStackIndex = state.arm;
                }

                //if (relativeStackIndex == 0) return Infinity;
                
                // estimated path length for picking up 'targetTag'
                let holdingTargetLiteral : Interpreter.Literal = {
                    polarity: true,
                    relation: "holding",
                    args: [targetTag]
                };
                result += estimatedPathLength(state, holdingTargetLiteral);
                
                // now holding 'target'

                     let relativeTag = args[1];
                let relativeStackIndex = Interpreter.stackIndex(relativeTag, state);

                if (state.holding == relativeTag) {
                    relativeStackIndex = state.arm;
                }

                // move arm to target stack and prefere the neigbour which is closer to target
                result += Math.abs(relativeStackIndex - targetStackIndex);
                if ((relativeStackIndex - targetStackIndex)<0){
                    result++;
                }

                //to go to neighbour stack
                result++;

                // drop the object
                result++;
                
            } else {
                console.error("estimatedPathLength() got condition 'beside' with args: " + args);
            }
        }
        else 
        {
            console.error("estimatedPathLength() got state with relation: " + rel);
        }
        return result;
    }

    class StateGraph implements Graph<WorldState> {

        outgoingEdges(state: WorldState): Edge<WorldState>[] {

            // return value
            let outgoingEdges: Edge<WorldState>[] = [];

            // get states reachable from 'state'
            let outgoingNodes: WorldState[] = getReachableStates(state);

            // prepare the list of edges
            for (let i = 0; i < outgoingNodes.length; i++) {
                outgoingEdges.push({
                    from: state,
                    to: outgoingNodes[i],
                    cost: 1
                });
            }

            return outgoingEdges;
        }

        compareNodes(a: WorldState, b: WorldState): number {
            if (JSON.stringify(a) != JSON.stringify(b)) {
                return 1;
            } else {
                return 0;
            }
        }
    }

    /**
     * generate a list of states reachable in one move
     */
    function getReachableStates(state: WorldState): WorldState[] {

        // return value
        let reachableStates: WorldState[] = [];

        // move left
        if (state.arm > 0) {

            // clone current state
            let leftState = cloneObject(state);

            leftState.arm = state.arm - 1;

            // save reachable state
            reachableStates.push(leftState);
        }

        // move right
        if (state.arm < state.stacks.length - 1) {

            // clone current state
            let rightState = cloneObject(state);

            rightState.arm = state.arm + 1;

            // save reachable state
            reachableStates.push(rightState);
        }

        // pick up / drop object
        let heldObjectTag : string = state.holding;
        let stateArmPos : number = state.arm;
        let stateStackBelowArm : Stack = state.stacks[stateArmPos];
        let numElsInStack : number = stateStackBelowArm.length;
        if (heldObjectTag == null) { // pick up
            if (numElsInStack > 0) {

                // clone current state
                let pickUpState = cloneObject(state);

                // pick up object
                let pickedObject = pickUpState.stacks[stateArmPos].pop();
                pickUpState.holding = pickedObject;

                // save reachable state
                reachableStates.push(pickUpState);
            }
        } else { // drop
            
            // potential object to drop onto
            let stackTopObjectTag : string;
            if (numElsInStack == 0) {
                stackTopObjectTag = "floor";
            } else {
                stackTopObjectTag = stateStackBelowArm[numElsInStack - 1];
            }
            
            let canDrop : boolean = Interpreter.checkRelation("ontop",[heldObjectTag,stackTopObjectTag],state);
            if (canDrop) {

                // clone current state
                let dropState = cloneObject(state);

                // drop object
                dropState.stacks[stateArmPos].push(heldObjectTag);
                dropState.holding = null;

                // save reachable state
                reachableStates.push(dropState);
            }
        }

        return reachableStates;
    }

    /**
     * used for cloning objects
     * 
     * @param obj the object to clone
     */
    function cloneObject(obj) : typeof obj {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        var temp : typeof obj = obj.constructor();
        for (var key in obj) {
            temp[key] = cloneObject(obj[key]);
        }
        return temp;
    }
    
    /**
     * mathematical min over the number in 'vs'
     * 
     * @param vs the number through which to search
     */
    export function min(vs : number[]) : number {
        
        // return value
        let min : number = Infinity;
        
        for (let i = 0; i < vs.length; i++) {
            if (vs[i] < min) {
                min = vs[i];
            }
        }
        
        return min;
    }
    
    /**
     * mathematical argmin over the number in 'vs'
     * 
     * @param vs the number through which to search
     * @param startPos the place in the list from which to initiate circular search
     */
    export function argmin(vs : number[], startPos? : number) : number {
        
        // return value
        let argmin : number;
        
        // minimum so far
        let min = Infinity;
        
        if (typeof startPos == "undefined") {
            startPos = 0;
        }
        
        let ns : collections.Queue<number> = new collections.Queue<number>();
        ns.enqueue(startPos)
        while (ns.size() > 0) {
            let i = ns.dequeue();
            if (vs[i] < min) {
                argmin = i;
                min = vs[i];
            }
            if (i >= startPos && i+1 < vs.length) {
                ns.enqueue(i+1);
            }
            if (i <= startPos && i-1 >= 0) {
                ns.enqueue(i-1);
            }
        }
        
        return argmin;
    }

}