import { typescript } from 'projen';

const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'tgg-engine',
  projenrcTs: true,
  tsconfig: {
    compilerOptions: {
      target: 'es2019',
      baseUrl: './',
      paths: {
        '*': ['@types/*'],
      },
    },
    exclude: ['node_modules', '@types/*'],
  },
  deps: ['subgraph-isomorphism', '@rimbu/bimap'], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();