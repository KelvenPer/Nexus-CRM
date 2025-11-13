export type WidgetType = "bar" | "line" | "pie" | "kpi";

export type WidgetDefinition = {
  id: string;
  title: string;
  chartType: WidgetType;
  objectId: string;
  objectLabel: string;
  groupBy: string;
  aggregate: string;
  aggregateField: string;
  data: Record<string, unknown>[];
  publishTargets?: string[];
};

export type MetaObject = {
  metaId: string;
  idObjeto: string;
  nomeAmigavel: string;
  tipo: "BASE" | "CUSTOMIZADO" | "base" | "custom";
  fields?: string[];
};
