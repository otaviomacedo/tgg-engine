import { Action, Domain, Engine, Graph, Nodes } from '../src/engine';

const engine = new Engine([
  axiom('Queue'),
  axiom('Function'),
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

  engine.translateForward(host);

  // Use Graphviz to visualize this
  expect(host.toString()).toEqual(`digraph G {
\tQueue_15 -> Function_17
\tQueue_16 -> Function_17
\tQueueAxiom_18 -> Queue_15
\tQueueAxiom_18 -> CfnQueue_19
\tQueueAxiom_20 -> Queue_16
\tQueueAxiom_20 -> CfnQueue_21
\tFunctionAxiom_22 -> Function_17
\tFunctionAxiom_22 -> CfnFunction_23
\tCfnEventSourceMapping_24 -> CfnQueue_19
\tCfnEventSourceMapping_24 -> CfnFunction_23
\tCfnFunction_23 -> CfnRole_25
\tTriggers_26 -> Queue_15
\tTriggers_26 -> Function_17
\tTriggers_26 -> CfnEventSourceMapping_24
\tTriggers_26 -> CfnRole_25
\tTriggers_26 -> CfnQueue_19
\tTriggers_26 -> CfnFunction_23
\tCfnEventSourceMapping_27 -> CfnQueue_21
\tCfnEventSourceMapping_27 -> CfnFunction_23
\tCfnFunction_23 -> CfnRole_28
\tTriggers_29 -> Queue_16
\tTriggers_29 -> Function_17
\tTriggers_29 -> CfnEventSourceMapping_27
\tTriggers_29 -> CfnRole_28
\tTriggers_29 -> CfnQueue_21
\tTriggers_29 -> CfnFunction_23
}`);
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

  engine.translateBackward(host);

  console.log(host.toString());

});


function axiom(type: string): Graph {
  const source = Nodes.newNode(type, Domain.SOURCE, Action.CREATE);
  const target = Nodes.newNode(`Cfn${type}`, Domain.TARGET, Action.CREATE);
  const corr = Nodes.newNode(`${type}Axiom`, Domain.CORRESPONDENCE, Action.CREATE);

  return new Graph([
    {
      nodes: [corr, source], action: Action.CREATE,
    },
    {
      nodes: [corr, target], action: Action.CREATE,
    },
  ]);
}

function triggers(): Graph {
  const q_s = Nodes.newNode('Queue', Domain.SOURCE, Action.PRESERVE);
  const f_s = Nodes.newNode('Function', Domain.SOURCE, Action.PRESERVE);
  const q_t = Nodes.newNode('CfnQueue', Domain.TARGET, Action.PRESERVE);
  const f_t = Nodes.newNode('CfnFunction', Domain.TARGET, Action.PRESERVE);
  const e = Nodes.newNode('CfnEventSourceMapping', Domain.TARGET, Action.CREATE);
  const r = Nodes.newNode('CfnRole', Domain.TARGET, Action.CREATE);
  const q_c = Nodes.newNode('QueueAxiom', Domain.CORRESPONDENCE, Action.PRESERVE);
  const f_c = Nodes.newNode('FunctionAxiom', Domain.CORRESPONDENCE, Action.PRESERVE);
  const t_c = Nodes.newNode('Triggers', Domain.CORRESPONDENCE, Action.CREATE);

  return new Graph([
    {
      nodes: [q_s, f_s], action: Action.PRESERVE,
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
  ]);
}