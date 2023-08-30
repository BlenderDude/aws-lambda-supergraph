
type HeaderConfig = {
  request: Array<{
    propagate: {
      named: string;
      default?: string;
      rename?: string;
    };
    remove: {
      matching: string;
    };
    insert: {
      name: string;
      value: string;
    }
  }>
}

type CorsConfig = {
  allow_any_origin?: boolean;
  origins?: string[];
  allow_credentials?: boolean;
  allow_headers?: string[];
  methods?: string[];
  expose_headers?: string[];
}

type RouterConfig = {
  cors: CorsConfig;
  headers?: {
    all?: HeaderConfig;
    subgraphs?: Record<string, HeaderConfig>;
  };
  supergraph?: {
    introspection?: boolean;
  }
}

export class GraphVariant {
  public subgraphs: Record<
    string,
    {
      sdl: string;
      url: string;
    }
  > = {};

  constructor(public name: string, public routerConfig: RouterConfig) {}

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
