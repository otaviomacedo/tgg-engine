import { Action, Domain, Engine, Graph, Nodes } from '../src/engine';

const engine = new Engine([
  defaultRule('Queue'),
  defaultRule('Function'),
  defaultRule('Role'),
  defaultRule('EventSourceMapping'),
  triggers(),
]);


test('Queue triggers function - translate forward', () => {
  const q1 = Nodes.newNode('Queue', Domain.SOURCE);
  const q2 = Nodes.newNode('Queue', Domain.SOURCE);
  const f = Nodes.newNode('Function', Domain.SOURCE);

  const host = new Graph([
    {
      nodes: [q1, f],
      type: 'Triggers',
    },
    {
      nodes: [q2, f],
      type: 'Triggers',
    },
  ]);

  const result = engine.translateForward(host);
  console.log(result.toString());

  // TODO Merge Roles
  expect(result.toString()).toEqual(`digraph G {
CfnEventSourceMapping_30 [color=blue]
CfnQueue_25 [color=blue]
CfnFunction_29 [color=blue]
CfnRole_31 [color=blue]
CfnEventSourceMapping_33 [color=blue]
CfnQueue_27 [color=blue]
CfnRole_34 [color=blue]
\tCfnEventSourceMapping_30 -> CfnQueue_25 
\tCfnEventSourceMapping_30 -> CfnFunction_29 
\tCfnFunction_29 -> CfnRole_31 
\tCfnEventSourceMapping_33 -> CfnQueue_27 
\tCfnEventSourceMapping_33 -> CfnFunction_29 
\tCfnFunction_29 -> CfnRole_34 
}`);

  /*
+--------------------------+     +--------------------------+
|       CfnQueue_25        | <-- | CfnEventSourceMapping_30 |
+--------------------------+     +--------------------------+
                                   |
                                   |
                                   v
+--------------------------+     +--------------------------+     +------------+
| CfnEventSourceMapping_33 | --> |      CfnFunction_29      | --> | CfnRole_34 |
+--------------------------+     +--------------------------+     +------------+
  |                                |
  |                                |
  v                                v
+--------------------------+     +--------------------------+
|       CfnQueue_27        |     |        CfnRole_31        |
+--------------------------+     +--------------------------+
   */

});

test('Queue triggers function - translate backward', () => {
  const q1 = Nodes.newNode('CfnQueue', Domain.TARGET);
  const e1 = Nodes.newNode('CfnEventSourceMapping', Domain.TARGET);
  const q2 = Nodes.newNode('CfnQueue', Domain.TARGET);
  const e2 = Nodes.newNode('CfnEventSourceMapping', Domain.TARGET);
  const f = Nodes.newNode('CfnFunction', Domain.TARGET);
  const r = Nodes.newNode('CfnRole', Domain.TARGET);

  const host = new Graph([
    {
      nodes: [e1, q1],
    },
    {
      nodes: [e1, f],
    },
    {
      nodes: [e2, q2],
    },
    {
      nodes: [e2, f],
    },
    {
      nodes: [f, r],
    },
  ]);

  const result = engine.translateBackward(host);

  expect(result.toString()).toEqual(`digraph G {
Queue_25 [color=red]
Function_29 [color=red]
Queue_27 [color=red]
\tQueue_25 -> Function_29 
\tQueue_27 -> Function_29 
}`);

  /*
+-------------+
|  Queue_25   |
+-------------+
  |
  |
  v
+-------------+
| Function_29 |
+-------------+
  ^
  |
  |
+-------------+
|  Queue_27   |
+-------------+
 */

});

function defaultRule(type: string): Graph {
  const source = Nodes.newNode(type, Domain.SOURCE, Action.CREATE);
  const target = Nodes.newNode(`Cfn${type}`, Domain.TARGET, Action.CREATE);
  const corr = Nodes.newDefaultNode(`${type}Default`, Action.CREATE);

  return new Graph([
    {
      nodes: [corr, source], action: Action.CREATE,
    },
    {
      nodes: [corr, target], action: Action.CREATE,
    },
  ], `${type}Default`);
}

function triggers(): Graph {
  const q_s = Nodes.newNode('Queue', Domain.SOURCE, Action.PRESERVE);
  const f_s = Nodes.newNode('Function', Domain.SOURCE, Action.PRESERVE);
  const q_t = Nodes.newNode('CfnQueue', Domain.TARGET, Action.PRESERVE);
  const f_t = Nodes.newNode('CfnFunction', Domain.TARGET, Action.PRESERVE);
  const e = Nodes.newNode('CfnEventSourceMapping', Domain.TARGET, Action.CREATE);
  const r = Nodes.newNode('CfnRole', Domain.TARGET, Action.CREATE);
  const q_c = Nodes.newDefaultNode('QueueDefault', Action.PRESERVE);
  const f_c = Nodes.newDefaultNode('FunctionDefault', Action.PRESERVE);
  const t_c = Nodes.newNode('Triggers', Domain.CORRESPONDENCE, Action.CREATE);

  return new Graph([
    {
      nodes: [q_s, f_s], action: Action.CREATE,
    },
    {
      nodes: [q_c, q_s], action: Action.PRESERVE,
    },
    {
      nodes: [q_c, q_t], action: Action.PRESERVE,
    },
    {
      nodes: [f_c, f_s], action: Action.PRESERVE,
    },
    {
      nodes: [f_c, f_t], action: Action.PRESERVE,
    },
    {
      nodes: [e, q_t], action: Action.CREATE,
    },
    {
      nodes: [e, f_t], action: Action.CREATE,
    },
    {
      nodes: [f_t, r], action: Action.CREATE,
    },
    {
      nodes: [t_c, q_s], action: Action.CREATE,
    },
    {
      nodes: [t_c, f_s], action: Action.CREATE,
    },
    {
      nodes: [t_c, e], action: Action.CREATE,
    },
    {
      nodes: [t_c, r], action: Action.CREATE,
    },
    {
      nodes: [t_c, q_t], action: Action.CREATE,
    },
    {
      nodes: [t_c, f_t], action: Action.CREATE,
    },
  ], 'triggers');
}