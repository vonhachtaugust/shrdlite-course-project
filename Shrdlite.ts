///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Planner.ts"/>

module Shrdlite {

    export function interactive(world : World) : void {
        function endlessLoop(utterance : string = "") : void {
            var inputPrompt = "What can I do for you today? ";
            var nextInput = () => world.readUserInput(inputPrompt, endlessLoop);
            if (utterance.trim()) {
                var plan : string[] = splitStringIntoPlan(utterance);
                if (!plan) {
                    plan = parseUtteranceIntoPlan(world, utterance);
                }
                if (plan) {
                    world.printDebugInfo("Plan: " + plan.join(", "));
                    world.performPlan(plan, nextInput);
                    return;
                }
            }
            nextInput();
        }
        world.printWorld(endlessLoop);
    }


    /**
     * Generic function that takes an utterance and returns a plan. It works according to the following pipeline:
     * - first it parses the utterance (Parser.ts)
     * - then it interprets the parse(s) (Interpreter.ts)
     * - then it creates plan(s) for the interpretation(s) (Planner.ts)
     *
     * Each of the modules Parser.ts, Interpreter.ts and Planner.ts
     * defines its own version of interface Result, which in the case
     * of Interpreter.ts and Planner.ts extends the Result interface
     * from the previous module in the pipeline. In essence, starting
     * from ParseResult, each module that it passes through adds its
     * own result to this structure, since each Result is fed
     * (directly or indirectly) into the next module.
     *
     * There are two sources of ambiguity: a parse might have several
     * possible interpretations, and there might be more than one plan
     * for each interpretation. In the code there are placeholders
     * that you can fill in to decide what to do in each case.
     *
     * @param world The current world.
     * @param utterance The string that represents the command.
     * @returns A plan in the form of a stack of strings, where each element is either a robot action, like "p" (for pick up) or "r" (for going right), or a system utterance in English that describes what the robot is doing.
     */
    export function parseUtteranceIntoPlan(world : World, utterance : string) : string[] {
        // Parsing
        world.printDebugInfo('Parsing utterance: "' + utterance + '"');
        try {
            var parses : Parser.ParseResult[] = Parser.parse(utterance);
            world.printDebugInfo("Found " + parses.length + " parses");
            parses.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Parser.stringify(result));
            });
        }
        catch(err) {
            world.printError("Parsing error", err);
            return;
        }

        // Interpretation
        try {
            var interpretations : Interpreter.InterpretationResult[] = Interpreter.interpret(parses, world.currentState);
            world.printDebugInfo("Found " + interpretations.length + " interpretations");
            interpretations.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Interpreter.stringify(result));
            });

            if (interpretations.length > 1) {
                
                // user chooses based on target entity
                let promptText :any = "";
                promptText += "Several interpretations were found.\n";
                promptText += "Did you mean ...\n\n";
                let promptTextContributions:any = [];
                let usedTags = new collections.Set<string>();
                for (let i = 0; i < interpretations.length; i++) {
                    let thisInterpretation = interpretations[i];
                    let thisInterpretationTargetTags = thisInterpretation.targetTags;
                    let tagString:any;
                    for (let j = 0; j < thisInterpretationTargetTags.length; j++) {
                        let thisTag = thisInterpretationTargetTags[j];
                        if (usedTags.contains(thisTag)) continue;
                        usedTags.add(thisTag)
                        let thisEntity = world.currentState.objects[thisTag];
                        tagString = Planner.stringifyEntity(thisEntity, world.currentState);
                    }
                    if (typeof tagString != "undefined") {
                        promptTextContributions.push("  (" + (i+1) + ") - " + tagString + "\n");
                    } else {
                        let thisInterpretationDNF = thisInterpretation.interpretation;
                        let estPathLength = Planner.heuristicFunction(world.currentState, thisInterpretationDNF);
                        promptTextContributions.push("  (" + (i+1) + ") - Path of length " + estPathLength + "\n");
                    }
                }
                promptText += promptTextContributions.join("or\n");
                promptText += "\nor any of them?\n"
                let chosenInterpretationInput : any = prompt(promptText, "any");
                let chosenInterpretationIndex = chosenInterpretationInput;
                if (chosenInterpretationIndex.toLowerCase() != "any") {
                    let chosenInterpretation : Interpreter.InterpretationResult;
                    if (chosenInterpretationIndex != null) {
                        chosenInterpretationIndex = parseInt(chosenInterpretationIndex) - 1;
                    }
                    if (
                        chosenInterpretationIndex == null
                        || chosenInterpretationIndex < 0
                        || chosenInterpretationIndex > (interpretations.length - 1)
                        || (chosenInterpretationIndex + 1) != chosenInterpretationInput
                    ) {
                        alert("You didn´t specify a valid interpretation, using 'any' by default")
                    } else {
                        chosenInterpretation = interpretations[chosenInterpretationIndex];
                        interpretations = [chosenInterpretation]
                    }
                }
                
            }
        }
        catch(err) {
            world.printError("Interpretation error", err);
            return;
        }

        // Planning
        try {
            var plans : Planner.PlannerResult[] = Planner.plan(interpretations, world.currentState);
            world.printDebugInfo("Found " + plans.length + " plans");
            plans.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Planner.stringify(result));
            });

            if (plans.length > 1) {
                let promptText = "";
                promptText += "Several plans were found.\n";
                promptText += "Please choose one based on it´s required number of moves.\n\n";
                let bestPlan:any;
                let bestPlanLength = Infinity;
                for (let i = 0; i < plans.length; i++) {
                    let thisPlan = plans[i];
                    promptText += "  (" + (i+1) + "): " + (thisPlan.plan.length - 1);
                    if (thisPlan.plan.length == 0) {
                        promptText += "  <- Already fulfilled"
                    }
                    promptText += "\n";
                    if (thisPlan.plan.length < bestPlanLength) {
                        bestPlan = thisPlan;
                        bestPlanLength = thisPlan.plan.length;
                    }
                }
                promptText += "\n";
                let chosenPlanInput : any = prompt(promptText, 1 + "-" + plans.length);
                let chosenPlanIndex = chosenPlanInput;
                let chosenPlan : Planner.PlannerResult;
                if (chosenPlanIndex != null) {
                    chosenPlanIndex = parseInt(chosenPlanIndex) - 1;
                }
                if (
                    chosenPlanIndex == null
                    || chosenPlanIndex < 0
                    || chosenPlanIndex > (plans.length - 1)
                    || (chosenPlanIndex + 1) != chosenPlanInput
                ) {
                    alert("You didn´t specify a valid plan, so the one with minimum number of actions was automatically chosen")
                    chosenPlan = bestPlan;
                } else {
                    chosenPlan = plans[chosenPlanIndex];
                }
                plans = [chosenPlan]
            }
        }
        catch(err) {
            world.printError("Planning error", err);
            return;
        }

        var finalPlan : string[] = plans[0].plan;
        world.printDebugInfo("Final plan: " + finalPlan.join(", "));
        return finalPlan;
    }

    /** This is a convenience function that recognizes strings
     * of the form "p r r d l p r d"
     */
    export function splitStringIntoPlan(planstring : string) : string[] {
        var plan : string[] = planstring.trim().split(/\s+/);
        var actions : {[act:string] : string}
            = {p:"Picking", d:"Dropping", l:"Going left", r:"Going right"};
        for (var i = plan.length-1; i >= 0; i--) {
            if (!actions[plan[i]]) {
                return;
            }
            plan.splice(i, 0, actions[plan[i]]);
        }
        return plan;
    }

}
