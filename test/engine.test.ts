import { Action, Domain, Engine, Graph, Nodes } from '../src/engine';

const engine = new Engine([
  axiom('Queue'),
  axiom('Function'),
  createTriggers(),
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

  console.log(host.toString());

  // Use Graphviz to visualize this
  expect(host.toString()).toEqual(`digraph G {
\tQueue_17 -> Function_19
\tQueue_18 -> Function_19
\tQueueAxiom_20 -> Queue_17
\tQueueAxiom_20 -> CfnQueue_21
\tQueueAxiom_22 -> Queue_18
\tQueueAxiom_22 -> CfnQueue_23
\tFunctionAxiom_24 -> Function_19
\tFunctionAxiom_24 -> CfnFunction_25
\tCfnEventSourceMapping_26 -> CfnQueue_21
\tCfnEventSourceMapping_26 -> CfnFunction_25
\tCfnFunction_25 -> CfnRole_27
\tTriggers_28 -> Queue_17
\tTriggers_28 -> Function_19
\tTriggers_28 -> CfnEventSourceMapping_26
\tTriggers_28 -> CfnRole_27
\tTriggers_28 -> CfnQueue_21
\tTriggers_28 -> CfnFunction_25
\tCfnEventSourceMapping_29 -> CfnQueue_23
\tCfnEventSourceMapping_29 -> CfnFunction_25
\tCfnFunction_25 -> CfnRole_30
\tTriggers_31 -> Queue_18
\tTriggers_31 -> Function_19
\tTriggers_31 -> CfnEventSourceMapping_29
\tTriggers_31 -> CfnRole_30
\tTriggers_31 -> CfnQueue_23
\tTriggers_31 -> CfnFunction_25
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

  const engine2 = new Engine([
    axiom('Queue'),
    axiom('Function'),
    // createTriggers(),
    triggers(),
  ]);


  engine2.translateBackward(host);

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

function createTriggers(): Graph {
  const q = Nodes.newNode('Queue', Domain.SOURCE, Action.CREATE);
  const f = Nodes.newNode('Function', Domain.SOURCE, Action.CREATE);

  return new Graph([
    {
      nodes: [q, f],
      type: 'Triggers',
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