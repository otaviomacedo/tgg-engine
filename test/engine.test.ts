import { Action, Domain, Engine, Graph, Nodes } from '../src/engine';

test('Queue triggers function', () => {
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

  // AXIOMS

  // Queue axiom
  const q_a_s = Nodes.newNode('Queue', Domain.SOURCE, Action.CREATE);
  const q_a_t = Nodes.newNode('CfnQueue', Domain.TARGET, Action.CREATE);
  const queueCorr = Nodes.newNode('QueueAxiom', Domain.CORRESPONDENCE, Action.CREATE);

  const queueAxiom = new Graph([
    {
      nodes: [queueCorr, q_a_s], action: Action.CREATE,
    },
    {
      nodes: [queueCorr, q_a_t], action: Action.CREATE,
    },
  ]);

  // Function axiom
  const f_a_s = Nodes.newNode('Function', Domain.SOURCE, Action.CREATE);
  const f_a_t = Nodes.newNode('CfnFunction', Domain.TARGET, Action.CREATE);
  const functionCorr = Nodes.newNode('FunctionAxiom', Domain.CORRESPONDENCE, Action.CREATE);

  const functionAxiom = new Graph([
    {
      nodes: [functionCorr, f_a_s], action: Action.CREATE,
    },
    {
      nodes: [functionCorr, f_a_t], action: Action.CREATE,
    },
  ]);

  // ABSTRACTIONS

  // Triggers
  const q_s = Nodes.newNode('Queue', Domain.SOURCE, Action.PRESERVE);
  const f_s = Nodes.newNode('Function', Domain.SOURCE, Action.PRESERVE);
  const q_t = Nodes.newNode('CfnQueue', Domain.TARGET, Action.PRESERVE);
  const f_t = Nodes.newNode('CfnFunction', Domain.TARGET, Action.PRESERVE);
  const e = Nodes.newNode('CfnEventSourceMapping', Domain.TARGET, Action.CREATE);
  const r = Nodes.newNode('CfnRole', Domain.TARGET, Action.CREATE);
  const q_c = Nodes.newNode('QueueAxiom', Domain.CORRESPONDENCE, Action.PRESERVE);
  const f_c = Nodes.newNode('FunctionAxiom', Domain.CORRESPONDENCE, Action.PRESERVE);
  const t_c = Nodes.newNode('Triggers', Domain.CORRESPONDENCE, Action.CREATE);

  const queueTriggersFunction = new Graph([
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

  // console.log(queueTriggersFunction.context(Domain.SOURCE).toString());

  const engine = new Engine([
    queueAxiom,
    functionAxiom,
    queueTriggersFunction,
  ]);

  // console.log(host.toString());

  engine.translateForward(host);

  console.log(host.toString());
});

