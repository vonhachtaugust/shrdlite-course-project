{\rtf1\ansi\ansicpg1252\cocoartf1404\cocoasubrtf460
{\fonttbl\f0\fnil\fcharset0 HelveticaNeue;\f1\fnil\fcharset0 HelveticaNeue-Medium;}
{\colortbl;\red255\green255\blue255;\red38\green38\blue38;}
\margl1440\margr1440\vieww28600\viewh15580\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\b\fs56 \cf2 \expnd0\expndtw0\kerning0
Synopsis\
\pard\pardeftab720\partightenfactor0

\b0\fs32 \cf2 The interpretation part (module Interpreter) of the 
\f1 Shrdlite project, Artificial Intelligence \'97 LP4, VT 2016 
\f0  written in Typescript.\
\pard\pardeftab720\partightenfactor0

\b\fs56 \cf2 \
Code \
\pard\pardeftab720\partightenfactor0

\b0\fs32 \cf2 \
\pard\pardeftab720\partightenfactor0

\b\fs36 \cf2 Private functions of the module Interpreter:\
\pard\pardeftab720\partightenfactor0

\b0\fs32 \cf2 \
@param cmd The actual command.\
@param state The current state of the world. \
@returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). \
function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula\
 make decision based on the different command \'93Take\'94/\'93Move\'94 and return [\{polarity: true, relation: cmd.location.relation, args: [comb[0],comb[1]]\}] as the DNFFormula\
\
\
@combs A list of all combination of the considered tags in the Example world/\'93objects": \
@relation The relationship between the tags\
@param state The current state of the world. \
function assertPhysicalLaws(combs,relation,state) \
 Imply the physical laws in the project simulation\
  \
\
@entity The entity from the actual command\
@state The current state of the world. \
@return a list of tags in the Example world/\'93objects" \
function getPossibleEntitieTags(entity ,state ) \
 a recursive function which returns the match tags ( \'93a\'94,\'94b\'94,\'94c\'94,..) within all entities based on the \'91state\'92 in \'91entity\'92  with their property and locations in the world.\
\
\
@thisPossibleTargetTag Tags in the Example world/\'93objects"\
@state The state of the world. \
@return  the index of 'thisPossibleTargetTag' in it's respective stack\
function stackIndexOf(thisPossibleTargetTag, state )\
\
\
@thisPossibleTargetTag a tag in the Example world/\'93objects"\
@state The state of the world.\
@return  the stack index of 'thisPossibleTargetTag'\
function stackIndex(thisPossibleTargetTag, state)\
\
\
@thisPossibleTargetTag a tags in the Example world/\'93objects"\
@thisRelativeTag a tag in the Example world/\'93objects"\
@state The state of the world\
@return returns true if 'thisPossibleTargetTag' and 'thisRelativeTag' are in the same stack\
function isInSameStack(thisPossibleTargetTag,thisRelativeTag , state ) \
\
\
@targetObject the object description of form, color and size\
@state The state of the world. \
@return list of objects in 'stateObjects' matching 'targetObject' w.r.t the following features\
function filterFeatures(targetObject, state)\
 finds the tag representative of the object (Ex:\'94a\'94,\'94b\'94, etc..) int the Example world/\'93objects\'94.\
\
\
@l1 argument one\
@l2 argument two\
@return the cartesian product of l1, l2\
function cartesianProd(l1, l2) \
\
\
\
 
\b\fs56 API Reference\

\b0\fs32 http://chalmersgu-ai-course.github.io/shrdlite-grammar.html#semantic-interpretation\
http://chalmersgu-ai-course.github.io/shrdlite-course-project/doc/\
\pard\pardeftab720\partightenfactor0

\b\fs56 \cf2 \
Tests\
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardeftab720\pardirnatural\partightenfactor0

\b0\fs32 \cf2 tsc --out Interpreter.js Interpreter.ts\
tsc --out TestInterpreter.js TestInterpreter.ts\
node TestInterpreter.js \
\
\pard\pardeftab720\partightenfactor0

\b\fs56 \cf2 Contributors\
\pard\pardeftab720\partightenfactor0

\b0\fs28 \cf2 Karl B\'e4ckstr\'f6m, David Hansson, Mahmod Nazari, August von Hacht
\fs32 \
\pard\pardeftab720\partightenfactor0

\b\fs56 \cf2 \
License\
\pard\pardeftab720\partightenfactor0

\b0\fs32 \cf2 Chalmers, AI, Sonnet Group.}