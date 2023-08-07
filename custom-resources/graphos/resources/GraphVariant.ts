export class GraphVariant {
  public subgraphs: Record<
    string,
    {
      sdl: string;
      url: string;
    }
  > = {};

  constructor(public name: string) {}

  public addSubgraph(
    name: string,
    subgraph: {
      sdl: string;
      url: string;
    }
  ): void {
    this.subgraphs[name] = subgraph;
  }
}
