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
    export function plan(interpretations : Interpreter.InterpretationResult[], currentState : WorldState) : PlannerResult[] {
        var errors : Error[] = [];
        var plans : PlannerResult[] = [];
        interpretations.forEach((interpretation) => {
            try {
                var result : PlannerResult = <PlannerResult>interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            } catch(err) {
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
        plan : string[];
    }

    export function stringify(result : PlannerResult) : string {
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
    function planInterpretation(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {
        // This function returns a dummy plan involving a random stack
        
        // development debug prints
        console.log("=================================================");
        
        console.log("current state:");
        console.log(state);
        console.log();
        console.log("reachable states:")
        console.log(getReachableStates(state));
        console.log()
        
        let stateGraph : StateGraph = new StateGraph();
        
        let path = aStarSearch(
            stateGraph,
            state,
            isGoal,
            heuristic,
            10
        );
        
        console.log("aStarSearch output path:");
        console.log(path);
        
        console.log("=================================================");
        console.log()
        
        // below is the dummy plan generation
        do {
            var pickstack = Math.floor(Math.random() * state.stacks.length);
        } while (state.stacks[pickstack].length == 0);
        var plan : string[] = [];

        // First move the arm to the leftmost nonempty stack
        if (pickstack < state.arm) {
            plan.push("Moving left");
            for (var i = state.arm; i > pickstack; i--) {
                plan.push("l");
            }
        } else if (pickstack > state.arm) {
            plan.push("Moving right");
            for (var i = state.arm; i < pickstack; i++) {
                plan.push("r");
            }
        }

        // Then pick up the object
        var obj = state.stacks[pickstack][state.stacks[pickstack].length-1];
        plan.push("Picking up the " + state.objects[obj].form,
                  "p");

        if (pickstack < state.stacks.length-1) {
            // Then move to the rightmost stack
            plan.push("Moving as far right as possible");
            for (var i = pickstack; i < state.stacks.length-1; i++) {
                plan.push("r");
            }

            // Then move back
            plan.push("Moving back");
            for (var i = state.stacks.length-1; i > pickstack; i--) {
                plan.push("l");
            }
        }

        // Finally put it down again
        plan.push("Dropping the " + state.objects[obj].form,
                  "d");

        return plan;
    }
    
    /**
     * function for determing if state 's' is goal
     */
    var isGoal = function(s : WorldState) {
        return true;
    }
    
    /**
     * function for calculating the heuristic for state 's'
     */
    var heuristic = function(s : WorldState) {
        return 0;
    }

    class StateGraph implements Graph<WorldState> {
        
        outgoingEdges(state : WorldState) : Edge<WorldState>[] {
            
            // return value
            let outgoingEdges : Edge<WorldState>[] = [];
            
            // get states reachable from 'state'
            let outgoingNodes : WorldState[] = getReachableStates(state);
            
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

        compareNodes(a : WorldState, b : WorldState) : number {
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
    function getReachableStates(state : WorldState) : WorldState[] {
        
        // return value
        let reachableStates : WorldState[] = [];
        
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
            
            let canDrop : boolean = checkRelation("ontop",[heldObjectTag,stackTopObjectTag],state);
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
     * evaluate if relation is possible within certain WorldState
     */
    function checkRelation(rel : string, args : string[], state : WorldState) : boolean {
        
        if (args.length == 1) {
            
            // entity a
            let a;
            if (args[1] == "floor") {
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
                return false;
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
            if (b.form == "box") {
                rel = "inside";
            }
            
            // an object cannot be in relation with itself
            if (a == b) {
                return false;
            }
            
            if (rel == "ontop") {
                
                // Balls must be in boxes or on the floor
                if (a.form == "ball") {
                    if (b.form != "floor" || b.form != "box") {
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
                return false;
            }
        } else {
            // too many arguments
            return false;
        }
        
        return true;
    }
    
    /**
     * used for cloning objects
     */
    function cloneObject(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        var temp = obj.constructor();
        for (var key in obj) {
            temp[key] = cloneObject(obj[key]);
        }
        return temp;
    }

}
